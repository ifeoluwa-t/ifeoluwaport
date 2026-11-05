/* Private dashboard API (the page is dashboard.html, served at /dashboard). Nothing here is linked from the site.
 *
 * GET  /api/admin                         -> { suggestions: [{ id, text, name, at }], reaction: { plays, average, fastest, fastestAt } }
 * POST /api/admin { action: 'login', password }   -> sets the session cookie
 * POST /api/admin { action: 'logout' }            -> clears it
 * POST /api/admin { action: 'delete', id }        -> removes one suggestion
 * Everything except 'login' and 'logout' needs the session cookie, otherwise 401.
 *
 * Env vars:
 *   ADMIN_PASSWORD                         the dashboard password (checked here, on the server, and nowhere else)
 *   KV_REST_API_URL + KV_REST_API_TOKEN    (or UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN) the Upstash store
 *
 * The session cookie is "<expiry>.<signature>": an HMAC of the expiry made with a key derived from ADMIN_PASSWORD, so it is
 * httpOnly, Secure, SameSite=Strict, lasts 7 days, and every session ends the moment the password is changed.
 * Wrong passwords are rate limited (10 tries per IP per 15 minutes).
 */
const crypto = require('crypto');

const DAYS = 7;
const SUGGESTIONS = 'sq:suggestions';
const KEEP = 500;
const LOGIN_TRIES = 10;

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
function clientId(req) {
  const fwd = req.headers['x-forwarded-for'];
  const ip = (Array.isArray(fwd) ? fwd[0] : fwd || '').split(',')[0].trim() || req.headers['x-real-ip'] || 'unknown';
  return crypto.createHash('sha256').update(String(ip)).digest('hex').slice(0, 16);
}
function readBody(req) {
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { return null; } }
  return b && typeof b === 'object' ? b : null;
}
function same(a, b) {   // constant-time comparison of two strings of any length
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

/* ---------- the session cookie ---------- */
function sessionKey() { return crypto.createHash('sha256').update('dashboard-session|' + process.env.ADMIN_PASSWORD).digest(); }
function makeSession() {
  const exp = Date.now() + DAYS * 86400000;
  return exp + '.' + crypto.createHmac('sha256', sessionKey()).update(String(exp)).digest('hex');
}
function validSession(req) {
  const m = /(?:^|;\s*)dash=([^;]+)/.exec(req.headers.cookie || '');
  if (!m) return false;
  const [exp, sig] = decodeURIComponent(m[1]).split('.');
  if (!exp || !sig || !(Number(exp) > Date.now())) return false;
  return same(sig, crypto.createHmac('sha256', sessionKey()).update(exp).digest('hex'));
}
function cookie(value, maxAge) {
  return 'dash=' + encodeURIComponent(value) + '; Max-Age=' + maxAge + '; Path=/; HttpOnly; Secure; SameSite=Strict';
}

/* ---------- reading ---------- */
function parseRow(raw) {
  try {
    const o = JSON.parse(raw);
    if (!o || typeof o.text !== 'string') return null;
    // entries saved before ids existed get a stable one made from their content
    const id = typeof o.id === 'string' && o.id ? o.id : 'old-' + crypto.createHash('sha1').update(raw).digest('hex').slice(0, 12);
    return { id, text: o.text, name: typeof o.name === 'string' ? o.name : '', at: typeof o.at === 'string' ? o.at : '', raw };
  } catch (e) { return null; }
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  const send = (code, body) => res.status(code).end(JSON.stringify(body));

  if (!process.env.ADMIN_PASSWORD) return send(503, { error: 'ADMIN_PASSWORD is not set in Vercel yet.' });
  const c = creds();
  if (!c) return send(503, { error: 'The Redis store is not connected.' });

  try {
    if (req.method === 'POST') {
      const body = readBody(req);
      if (!body) return send(400, { error: 'Bad request' });
      if (!String(req.headers['content-type'] || '').includes('application/json')) return send(400, { error: 'Bad request' });

      if (body.action === 'login') {
        const key = 'dash:rl:' + clientId(req) + ':' + Math.floor(Date.now() / 900000);
        const [tries] = await pipeline(c, [['INCR', key], ['EXPIRE', key, '1000']]);
        if (Number(tries) > LOGIN_TRIES) { res.setHeader('Retry-After', '900'); return send(429, { error: 'Too many tries. Wait a few minutes and try again.' }); }
        if (typeof body.password !== 'string' || !same(body.password, process.env.ADMIN_PASSWORD)) return send(401, { error: 'That password is not right.' });
        res.setHeader('Set-Cookie', cookie(makeSession(), DAYS * 86400));
        return send(200, { ok: true });
      }
      if (body.action === 'logout') {
        res.setHeader('Set-Cookie', cookie('', 0));
        return send(200, { ok: true });
      }

      if (!validSession(req)) return send(401, { error: 'Please log in.' });
      if (body.action === 'delete') {
        if (typeof body.id !== 'string' || !body.id) return send(400, { error: 'Bad request' });
        const [rows] = await pipeline(c, [['LRANGE', SUGGESTIONS, '0', String(KEEP - 1)]]);
        const hit = (rows || []).map(parseRow).find((r) => r && r.id === body.id);
        if (!hit) return send(404, { error: 'Already gone.' });
        await pipeline(c, [['LREM', SUGGESTIONS, '1', hit.raw]]);
        return send(200, { ok: true });
      }
      return send(400, { error: 'Bad request' });
    }

    if (req.method === 'GET') {
      if (!validSession(req)) return send(401, { error: 'Please log in.' });
      const [rows, sum, count, fastest, fastestAt] = await pipeline(c, [
        ['LRANGE', SUGGESTIONS, '0', String(KEEP - 1)],
        ['GET', 'rx:sum'], ['GET', 'rx:count'], ['GET', 'rx:fastest'], ['GET', 'rx:fastest_at'],
      ]);
      const n = Number(count) || 0;
      return send(200, {
        suggestions: (rows || []).map(parseRow).filter(Boolean).map(({ raw, ...rest }) => rest),
        reaction: {
          plays: n,
          average: n > 0 ? Math.round(Number(sum) / n) : null,
          fastest: fastest == null ? null : Number(fastest),
          fastestAt: fastestAt || null,
        },
      });
    }

    res.setHeader('Allow', 'GET, POST');
    return send(405, { error: 'Method not allowed' });
  } catch (e) {
    return send(502, { error: 'Could not reach the store just now.' });
  }
};
