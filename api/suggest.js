/* "What should I read, listen to or watch next?": visitors' suggestions.
 *
 * POST /api/suggest  { text, name?, website? }   -> { ok: true }
 *   - text: 3-400 characters. name: optional, up to 40. `website` is a hidden trap field: real
 *     people leave it empty, so anything filled in is quietly dropped.
 * GET  /api/suggest?key=<SUGGEST_ADMIN_KEY>      -> { items: [{ text, name, at }] } (newest first)
 *
 * Stored in Upstash Redis (the same store the reaction game uses) in the list "sq:suggestions"
 * (newest first, capped at 500). To read them without the GET route, open the Upstash console and run
 *   LRANGE sq:suggestions 0 -1
 *
 * Env vars: KV_REST_API_URL + KV_REST_API_TOKEN (or UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN).
 * Optional: SUGGEST_ADMIN_KEY, to switch on the GET route.
 */
const crypto = require('crypto');

const RATE_LIMIT = 5;          // suggestions per IP per 10 minutes
const KEEP = 500;

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
function clean(s, max) {
  if (typeof s !== 'string') return '';
  return s.normalize('NFKC').replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  const send = (code, body) => res.status(code).end(JSON.stringify(body));
  const c = creds();
  if (!c) return send(503, { error: 'Suggestions are not switched on yet' });

  try {
    if (req.method === 'GET') {
      const key = process.env.SUGGEST_ADMIN_KEY;
      const given = (req.query && req.query.key) || '';
      if (!key || given.length !== key.length || !crypto.timingSafeEqual(Buffer.from(given), Buffer.from(key))) return send(401, { error: 'Not allowed' });
      const [rows] = await pipeline(c, [['LRANGE', 'sq:suggestions', '0', String(KEEP - 1)]]);
      return send(200, { items: (rows || []).map((r) => { try { return JSON.parse(r); } catch (e) { return null; } }).filter(Boolean) });
    }

    if (req.method === 'POST') {
      const body = readBody(req);
      if (!body) return send(400, { error: 'Bad request' });
      if (typeof body.website === 'string' && body.website.trim()) return send(200, { ok: true });   // a bot: pretend it worked
      const text = clean(body.text, 400);
      const name = clean(body.name, 40);
      if (text.length < 3) return send(400, { error: 'Tell me a little more (at least a few letters).' });

      const bucket = Math.floor(Date.now() / 600000);
      const key = 'sq:rl:' + clientId(req) + ':' + bucket;
      const [hits] = await pipeline(c, [['INCR', key], ['EXPIRE', key, '700']]);
      if (Number(hits) > RATE_LIMIT) { res.setHeader('Retry-After', '600'); return send(429, { error: 'That is plenty for now, thank you! Try again in a bit.' }); }

      const item = JSON.stringify({ text, name, at: new Date().toISOString() });
      await pipeline(c, [['LPUSH', 'sq:suggestions', item], ['LTRIM', 'sq:suggestions', '0', String(KEEP - 1)]]);
      return send(200, { ok: true });
    }

    res.setHeader('Allow', 'GET, POST');
    return send(405, { error: 'Method not allowed' });
  } catch (e) {
    return send(502, { error: 'Could not save that just now' });
  }
};
