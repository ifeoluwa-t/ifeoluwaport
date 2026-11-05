/* Reaction Speed Test — shared stats + top-10 leaderboard.
 *
 * GET  /api/reaction
 *        -> { average, fastest, count, players, board: [{ name, ms }] }
 * POST /api/reaction  { round: true }
 *        -> { round }   a one-use token, issued when a round starts (see "round tokens" below)
 * POST /api/reaction  { ms, round }
 *        -> same shape as GET, plus { qualifies, rank, claim } when the time makes the top 10
 * POST /api/reaction  { claim, name }
 *        -> same shape, plus { saved: true }  (puts the name on the leaderboard)
 *
 * Stored in Upstash Redis through its REST API (no npm dependency):
 *   rx:sum, rx:count, rx:fastest   running totals (rx:fastest_at: when the fastest time was set, for the dashboard)
 *   rx:players                     HyperLogLog of hashed IPs (people who have tried)
 *   rx:board                       sorted set: member = hashed IP, score = best ms (top 10 kept)
 *   rx:names                       hash: hashed IP -> display name
 *   rx:rl:<hashed ip>:<minute>     short-lived rate-limit counters
 * One leaderboard entry per player (per hashed IP); a faster time replaces their old one.
 *
 * Env vars (Vercel's Upstash integration adds the KV_* pair automatically):
 *   KV_REST_API_URL + KV_REST_API_TOKEN   or   UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
 *   RX_BLOCKLIST (optional)               comma-separated words that may not appear in names
 *
 * To remove an entry by hand (Upstash console): HGETALL rx:names to find the id, then
 *   ZREM rx:board <id>   and   HDEL rx:names <id>
 */
const { crypto, creds, pipeline, clientId, readBody, sameOrigin, responder } = require('./_lib');

const MIN_MS = 100;
const MAX_MS = 2000;
const RATE_LIMIT = 60; // requests per IP per minute (a round is two requests; the game cannot be played faster than about 27 rounds a minute)
const SCORES_PER_10_MIN = 150; // scores one IP can add to the shared stats in 10 minutes; more are ignored
const BOARD_SIZE = 10;
const CLAIM_TTL_MS = 15 * 60 * 1000;
const NAME_MIN = 2;
const NAME_MAX = 16;
const ROUND_TTL_S = 90;
const ROUND_MAX_MS = 60 * 1000;
const ROUND_JITTER_MS = 800; // the game always waits at least 1500 ms before "go"; this allows for network delay either way

const FASTEST_LUA =
  "local f = redis.call('GET', KEYS[1]) " +
  "if (not f) or (tonumber(ARGV[1]) < tonumber(f)) then redis.call('SET', KEYS[1], ARGV[1]) redis.call('SET', KEYS[2], ARGV[2]) end " +
  "return 1";

/* ---------- claim tokens: proof that this player really posted this time ---------- */
function sign(c, id, ms, ts) {
  return crypto.createHmac('sha256', c.token).update(id + '|' + ms + '|' + ts).digest('hex').slice(0, 32);
}
function makeClaim(c, id, ms) {
  const ts = Date.now();
  return ms + '.' + ts + '.' + sign(c, id, ms, ts);
}
function checkClaim(c, id, claim) {
  if (typeof claim !== 'string') return null;
  const [msS, tsS, sig] = claim.split('.');
  const ms = Number(msS);
  const ts = Number(tsS);
  if (!Number.isInteger(ms) || ms < MIN_MS || ms > MAX_MS || !Number.isFinite(ts) || !sig) return null;
  if (Date.now() - ts > CLAIM_TTL_MS || ts > Date.now() + 60000) return null;
  const want = Buffer.from(sign(c, id, ms, ts));
  const got = Buffer.from(sig);
  if (want.length !== got.length || !crypto.timingSafeEqual(want, got)) return null;
  return ms;
}

/* ---------- round tokens: proof that a round really was running ----------
   The browser asks for a token when a round starts. The result must come back with that token, no sooner than the reaction
   time plus the game's fixed 1.5 s wait (less a little for network delay), and each token works once. So a script cannot
   post scores faster than real rounds could be played, and cannot post a score without starting a round. */
function roundSig(c, id, nonce, ts) {
  return crypto.createHmac('sha256', c.token).update('round|' + id + '|' + nonce + '|' + ts).digest('hex').slice(0, 32);
}
function makeRound(c, id) {
  const nonce = crypto.randomBytes(9).toString('hex');
  const ts = Date.now();
  return { nonce, token: nonce + '.' + ts + '.' + roundSig(c, id, nonce, ts) };
}
/* returns the nonce if the token is genuine for this player and its timing fits the reaction time, else null */
function checkRound(c, id, token, ms) {
  if (typeof token !== 'string' || token.length > 100) return null;
  const [nonce, tsS, sig] = token.split('.');
  const ts = Number(tsS);
  if (!/^[0-9a-f]{18}$/.test(nonce || '') || !Number.isFinite(ts) || !sig) return null;
  const want = Buffer.from(roundSig(c, id, nonce, ts));
  const got = Buffer.from(sig);
  if (want.length !== got.length || !crypto.timingSafeEqual(want, got)) return null;
  const elapsed = Date.now() - ts;
  if (elapsed < ms + ROUND_JITTER_MS || elapsed > ROUND_MAX_MS) return null;
  return nonce;
}

/* ---------- names ---------- */
function cleanName(raw) {
  if (typeof raw !== 'string') return null;
  let n = raw.normalize('NFKC').replace(/[^\p{L}\p{N}\p{Extended_Pictographic} ._'\-]/gu, '').replace(/\s+/g, ' ').trim();
  const len = Array.from(n).length;
  if (len < NAME_MIN) return null;
  if (len > NAME_MAX) n = Array.from(n).slice(0, NAME_MAX).join('').trim();
  return n;
}
function blocked(name) {
  const list = (process.env.RX_BLOCKLIST || '').split(',').map((w) => w.trim().toLowerCase()).filter(Boolean);
  if (!list.length) return false;
  const flat = name.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  return list.some((w) => flat.includes(w.replace(/[^\p{L}\p{N}]/gu, '')));
}

/* ---------- reading everything the page needs ---------- */
function parseBoard(flat) {
  const out = [];
  for (let i = 0; i + 1 < (flat || []).length; i += 2) out.push({ id: flat[i], ms: Number(flat[i + 1]) });
  return out;
}

async function snapshot(c, id) {
  const [sum, count, fastest, players, flat, mine] = await pipeline(c, [
    ['GET', 'rx:sum'], ['GET', 'rx:count'], ['GET', 'rx:fastest'], ['PFCOUNT', 'rx:players'],
    ['ZRANGE', 'rx:board', '0', String(BOARD_SIZE - 1), 'WITHSCORES'],
    ['ZSCORE', 'rx:board', id],
  ]);
  const rows = parseBoard(flat);
  let names = [];
  if (rows.length) names = (await pipeline(c, [['HMGET', 'rx:names'].concat(rows.map((r) => r.id))]))[0] || [];
  const n = Number(count) || 0;
  return {
    rows,
    mine: mine == null ? null : Number(mine),
    stats: {
      average: n > 0 ? Math.round(Number(sum) / n) : null,
      fastest: fastest == null ? null : Number(fastest),
      count: n,
      players: Number(players) || 0,
      board: rows.map((r, i) => ({ name: names[i] || 'Anonymous', ms: r.ms })),
    },
  };
}

// Would `ms` earn this player a (new or better) spot in the top 10?
function qualifies(snap, ms) {
  const { rows, mine } = snap;
  if (mine != null && ms >= mine) return false;
  return rows.length < BOARD_SIZE || ms < rows[rows.length - 1].ms;
}
function rankFor(snap, ms) {
  return snap.rows.filter((r) => r.ms < ms).length + 1;
}

module.exports = async function handler(req, res) {
  const send = responder(res);
  const c = creds();
  if (!c) return send(503, { error: 'Stats store not configured' });

  try {
    if (req.method === 'GET') {
      // Nothing takes a parameter. A query string would give each request its own edge-cache entry (and a Redis read),
      // so it is refused: every real request is the same URL and is answered from the cache.
      if ((req.url || '').indexOf('?') !== -1) { res.setHeader('Cache-Control', 'public, s-maxage=3600'); return send(400, { error: 'Bad request' }); }
      res.setHeader('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=30');
      return send(200, (await snapshot(c, clientId(req))).stats);
    }

    if (req.method === 'POST') {
      res.setHeader('Cache-Control', 'no-store');
      if (!sameOrigin(req)) return send(403, { error: 'Not allowed' });
      const body = readBody(req);
      if (!body) return send(400, { error: 'Bad request' });
      const id = clientId(req);

      const isRound = body.round === true;
      const isName = body.claim !== undefined || body.name !== undefined;
      let ms;
      let name;
      let roundNonce = null;
      if (isRound) {
        // handled below, once the rate limit has been checked
      } else if (isName) {
        ms = checkClaim(c, id, body.claim);
        if (ms == null) return send(400, { error: 'That claim has expired. Play another round!' });
        name = cleanName(body.name);
        if (!name) return send(400, { error: 'Pick a name of ' + NAME_MIN + '\u2013' + NAME_MAX + ' letters or numbers.' });
        if (blocked(name)) return send(400, { error: "That name isn't allowed. Try another." });
      } else {
        ms = body.ms;
        if (typeof ms !== 'number' || !Number.isInteger(ms) || ms < MIN_MS || ms > MAX_MS) {
          return send(400, { error: 'ms must be a whole number between ' + MIN_MS + ' and ' + MAX_MS });
        }
        roundNonce = checkRound(c, id, body.round, ms);
        if (!roundNonce) return send(400, { error: 'That round was not valid' });
      }

      const bucket = Math.floor(Date.now() / 60000);
      const key = 'rx:rl:' + id + ':' + bucket;
      const [hits] = await pipeline(c, [['INCR', key], ['EXPIRE', key, '90']]);
      if (Number(hits) > RATE_LIMIT) {
        res.setHeader('Retry-After', '60');
        return send(429, { error: 'Too many requests, slow down' });
      }

      if (isRound) {
        const r = makeRound(c, id);
        await pipeline(c, [['SET', 'rx:rd:' + r.nonce, '1', 'EX', String(ROUND_TTL_S)]]);
        return send(200, { round: r.token });
      }

      if (isName) {
        const before = await snapshot(c, id);
        if (!qualifies(before, ms)) return send(409, { error: 'That time no longer makes the top ' + BOARD_SIZE + '.' });
        await pipeline(c, [
          ['ZADD', 'rx:board', 'LT', String(ms), id],
          ['HSET', 'rx:names', id, name],
          ['ZREMRANGEBYRANK', 'rx:board', String(BOARD_SIZE), '-1'],
        ]);
        return send(200, Object.assign({ saved: true }, (await snapshot(c, id)).stats));
      }

      // a score: its round token is used up (a second try with the same token finds nothing to delete)
      const [used] = await pipeline(c, [['DEL', 'rx:rd:' + roundNonce]]);
      if (Number(used) !== 1) return send(400, { error: 'That round was not valid' });
      // one IP can only add so many scores to the shared stats in 10 minutes; past that the score is simply not counted
      const sKey = 'rx:sc:' + id + ':' + Math.floor(Date.now() / 600000);
      const [scored] = await pipeline(c, [['INCR', sKey], ['EXPIRE', sKey, '700']]);
      if (Number(scored) > SCORES_PER_10_MIN) return send(200, (await snapshot(c, id)).stats);

      await pipeline(c, [
        ['INCRBY', 'rx:sum', String(ms)],
        ['INCR', 'rx:count'],
        ['EVAL', FASTEST_LUA, '2', 'rx:fastest', 'rx:fastest_at', String(ms), new Date().toISOString()],
        ['PFADD', 'rx:players', id],
      ]);
      const snap = await snapshot(c, id);
      const out = snap.stats;
      if (qualifies(snap, ms)) {
        out.qualifies = true;
        out.rank = rankFor(snap, ms);
        out.claim = makeClaim(c, id, ms);
      }
      return send(200, out);
    }

    res.setHeader('Allow', 'GET, POST');
    return send(405, { error: 'Method not allowed' });
  } catch (e) {
    return send(502, { error: 'Stats store unavailable' });
  }
};
