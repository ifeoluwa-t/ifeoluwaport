/* Private dashboard API (the page is dashboard.html, served at /dashboard). Nothing here is linked from the site.
 *
 * GET  /api/admin                         -> { suggestions: [{ id, text, name, at }], reaction: { plays, average, fastest, fastestAt } }
 * POST /api/admin { action: 'login', password }   -> sets the session cookie
 * POST /api/admin { action: 'logout' }            -> ends the session on the server and clears the cookie
 * POST /api/admin { action: 'delete', id }        -> removes one suggestion
 * Everything except 'login' and 'logout' needs a live session, otherwise 401.
 *
 * Env vars:
 *   ADMIN_PASSWORD                         the dashboard password (checked here, on the server, and nowhere else)
 *   KV_REST_API_URL + KV_REST_API_TOKEN    (or UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN) the Upstash store
 *
 * Sessions live in Redis ("dash:s:<id>", 7 days), so logging out or expiring really ends them. The cookie holds
 * "<id>.<signature>" (an HMAC made with a key derived from ADMIN_PASSWORD, so changing the password also ends every session);
 * it is __Host- prefixed, httpOnly, Secure, SameSite=Strict. POSTs must be JSON and come from this same site.
 * Wrong passwords are throttled per IP (10 failures per 15 minutes) and across all visitors (60 failures per 15 minutes).
 */
const { crypto, creds, pipeline, clientId, readBody, sameOrigin, same, responder } = require('./_lib');

const DAYS = 7;
const SUGGESTIONS = 'sq:suggestions';
const KEEP = 500;
const IP_FAILS = 10;
const ALL_FAILS = 60;
const COOKIE = '__Host-dash';

function sessionKey() { return crypto.createHash('sha256').update('dashboard-session|' + process.env.ADMIN_PASSWORD).digest(); }
function sign(id) { return crypto.createHmac('sha256', sessionKey()).update(id).digest('hex'); }
function cookie(value, maxAge) {
  return COOKIE + '=' + value + '; Max-Age=' + maxAge + '; Path=/; HttpOnly; Secure; SameSite=Strict';
}
/* the session id from the cookie, if its signature is right (it still has to exist in Redis) */
function sessionId(req) {
  const m = new RegExp('(?:^|;\\s*)' + COOKIE + '=([0-9a-f]{48})\\.([0-9a-f]{64})').exec(req.headers.cookie || '');
  return m && same(m[2], sign(m[1])) ? m[1] : null;
}
async function validSession(c, req) {
  const id = sessionId(req);
  if (!id) return false;
  const [v] = await pipeline(c, [['GET', 'dash:s:' + id]]);
  return v === '1';
}

function parseRow(raw) {
  try {
    const o = JSON.parse(raw);
    if (!o || typeof o.text !== 'string') return null;
    // entries saved before ids existed get a stable one made from their content
    const id = typeof o.id === 'string' && o.id ? o.id : 'old-' + crypto.createHash('sha1').update(raw).digest('hex').slice(0, 12);
    return { id, text: o.text, name: typeof o.name === 'string' ? o.name : '', at: typeof o.at === 'string' ? o.at : '', raw };
  } catch (e) { return null; }
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  const send = responder(res);

  const c = creds();
  if (!process.env.ADMIN_PASSWORD || !c) return send(503, { error: 'Not available.' });

  try {
    if (req.method === 'POST') {
      if (!sameOrigin(req)) return send(403, { error: 'Not allowed.' });
      const body = readBody(req);
      if (!body) return send(400, { error: 'Bad request' });

      if (body.action === 'login') {
        const win = Math.floor(Date.now() / 900000);
        const ipKey = 'dash:fail:' + clientId(req) + ':' + win, allKey = 'dash:fail:all:' + win;
        const [ipN, allN] = await pipeline(c, [['GET', ipKey], ['GET', allKey]]);
        if (Number(ipN) >= IP_FAILS || Number(allN) >= ALL_FAILS) { res.setHeader('Retry-After', '900'); return send(429, { error: 'Too many tries. Wait a few minutes and try again.' }); }
        if (typeof body.password !== 'string' || body.password.length > 200 || !same(body.password, process.env.ADMIN_PASSWORD)) {
          await pipeline(c, [['INCR', ipKey], ['EXPIRE', ipKey, '1000'], ['INCR', allKey], ['EXPIRE', allKey, '1000']]);
          await wait(400);   // wrong guesses are slowed down
          return send(401, { error: 'That password is not right.' });
        }
        const id = crypto.randomBytes(24).toString('hex');
        await pipeline(c, [['SET', 'dash:s:' + id, '1', 'EX', String(DAYS * 86400)]]);
        res.setHeader('Set-Cookie', cookie(id + '.' + sign(id), DAYS * 86400));
        return send(200, { ok: true });
      }
      if (body.action === 'logout') {
        const id = sessionId(req);
        if (id) await pipeline(c, [['DEL', 'dash:s:' + id]]);
        res.setHeader('Set-Cookie', cookie('', 0));
        return send(200, { ok: true });
      }

      if (!(await validSession(c, req))) return send(401, { error: 'Please log in.' });
      if (body.action === 'delete') {
        if (typeof body.id !== 'string' || !/^[0-9a-z-]{1,40}$/.test(body.id)) return send(400, { error: 'Bad request' });
        const [rows] = await pipeline(c, [['LRANGE', SUGGESTIONS, '0', String(KEEP - 1)]]);
        const hit = (rows || []).map(parseRow).find((r) => r && r.id === body.id);
        if (!hit) return send(404, { error: 'Already gone.' });
        await pipeline(c, [['LREM', SUGGESTIONS, '1', hit.raw]]);
        return send(200, { ok: true });
      }
      return send(400, { error: 'Bad request' });
    }

    if (req.method === 'GET') {
      if (!(await validSession(c, req))) return send(401, { error: 'Please log in.' });
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
