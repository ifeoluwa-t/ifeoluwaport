/* Shared helpers for the API routes (the leading underscore keeps Vercel from turning this file into a route).
 * Env vars used: KV_REST_API_URL + KV_REST_API_TOKEN (or UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN). */
const crypto = require('crypto');

const MAX_BODY = 4096;   // bytes; every body this site sends is far smaller

function creds() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ''), token } : null;
}

async function pipeline(c, commands) {
  const r = await fetch(c.url + '/pipeline', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + c.token, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands),
  });
  if (!r.ok) throw new Error('redis ' + r.status);
  const out = await r.json();
  if (!Array.isArray(out) || out.some((x) => x && x.error)) throw new Error('redis error');
  return out.map((x) => x.result);
}

/* The visitor's address, hashed. Vercel sets x-vercel-forwarded-for and x-real-ip itself and overwrites any value a
   visitor sends, so those come first; the generic X-Forwarded-For is only a last resort. */
function clientId(req) {
  const h = req.headers;
  const pick = (v) => (Array.isArray(v) ? v[0] : v || '');
  const ip = pick(h['x-vercel-forwarded-for']).split(',')[0].trim()
    || pick(h['x-real-ip']).trim()
    || pick(h['x-forwarded-for']).split(',')[0].trim()
    || 'unknown';
  return crypto.createHash('sha256').update(String(ip)).digest('hex').slice(0, 16);
}

/* Reads a JSON body. Returns null for anything that is not a small JSON object sent as application/json. */
function readBody(req) {
  if (!String(req.headers['content-type'] || '').toLowerCase().startsWith('application/json')) return null;
  let b = req.body;
  if (typeof b === 'string') {
    if (Buffer.byteLength(b) > MAX_BODY) return null;
    try { b = JSON.parse(b); } catch (e) { return null; }
  } else if (b && typeof b === 'object') {
    if (Buffer.byteLength(JSON.stringify(b)) > MAX_BODY) return null;
  }
  return b && typeof b === 'object' && !Array.isArray(b) ? b : null;
}

/* A browser always names the page a POST came from in Origin. If it is present it must be this same site
   (whatever domain that is), so another website cannot make a visitor's browser post here. */
function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;   // not a browser cross-site request (curl, same-origin navigation, server calls)
  try { return new URL(origin).host === String(req.headers.host || '').toLowerCase(); } catch (e) { return false; }
}

/* Constant-time comparison of two strings of any length. */
function same(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

/* Standard headers + a send() for JSON answers. */
function responder(res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  return (code, body) => res.status(code).end(JSON.stringify(body));
}

module.exports = { crypto, creds, pipeline, clientId, readBody, sameOrigin, same, responder };
