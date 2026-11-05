/* "What should I read, listen to or watch next?": visitors' suggestions.
 *
 * POST /api/suggest  { text, name?, website? }   -> { ok: true }
 *   - text: 3-300 characters. name: optional, up to 40. `website` is a hidden trap field: real
 *     people leave it empty, so anything filled in is quietly dropped.
 *   - JSON only, from this site only (Origin is checked), at most 5 suggestions per IP per hour.
 *
 * Stored in Upstash Redis (the same store the reaction game uses) in the list "sq:suggestions"
 * (newest first, capped at 500), each entry as JSON: { id, text, name, at }.
 * They are read, searched, exported and deleted on the private dashboard (see api/admin.js and dashboard.html).
 * The text is stored as typed (control characters removed) and HTML-escaped wherever it is shown.
 *
 * Env vars: KV_REST_API_URL + KV_REST_API_TOKEN (or UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN).
 */
const { crypto, creds, pipeline, clientId, readBody, sameOrigin, responder } = require('./_lib');

const RATE_LIMIT = 5;          // suggestions per IP per hour
const TEXT_MAX = 300;
const NAME_MAX = 40;
const KEEP = 500;

const CONTROL = /[\x00-\x1f\x7f-\x9f\u{2028}\u{2029}\u{202a}-\u{202e}\u{2066}-\u{2069}]+/gu;   // control, line-separator and text-direction override characters
function clean(s, max) {
  if (typeof s !== 'string') return '';
  // cut first, so a huge string is never processed in full (a little extra is kept for characters that shrink when normalised)
  return s.slice(0, max * 4).normalize('NFKC').replace(CONTROL, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const send = responder(res);

  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return send(405, { error: 'Method not allowed' }); }
  if (!sameOrigin(req)) return send(403, { error: 'Not allowed' });
  const c = creds();
  if (!c) return send(503, { error: 'Suggestions are not switched on yet' });

  try {
    const body = readBody(req);
    if (!body) return send(400, { error: 'Bad request' });
    if (typeof body.website === 'string' && body.website.trim()) return send(200, { ok: true });   // a bot: pretend it worked
    const text = clean(body.text, TEXT_MAX);
    const name = clean(body.name, NAME_MAX);
    if (text.length < 3) return send(400, { error: 'Tell me a little more (at least a few letters).' });

    const bucket = Math.floor(Date.now() / 3600000);
    const key = 'sq:rl:' + clientId(req) + ':' + bucket;
    const [hits] = await pipeline(c, [['INCR', key], ['EXPIRE', key, '3700']]);
    if (Number(hits) > RATE_LIMIT) { res.setHeader('Retry-After', '3600'); return send(429, { error: 'That is plenty for now, thank you! Try again in a bit.' }); }

    const item = JSON.stringify({ id: crypto.randomBytes(8).toString('hex'), text, name, at: new Date().toISOString() });
    await pipeline(c, [['LPUSH', 'sq:suggestions', item], ['LTRIM', 'sq:suggestions', '0', String(KEEP - 1)]]);
    return send(200, { ok: true });
  } catch (e) {
    return send(502, { error: 'Could not save that just now' });
  }
};
