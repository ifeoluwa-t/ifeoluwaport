/* "Playlists I made" (Side-Quests page): live titles and covers from Spotify.
 *
 * GET /api/playlists  ->  [{ id, url, title, image }, ...]   (same order as the list below)
 *
 * Each playlist's name and cover come from Spotify's public oEmbed endpoint (no account, key or token needed):
 *   https://open.spotify.com/oembed?url=<playlist url>   ->  { title, thumbnail_url, ... }
 * The response is cached at Vercel's edge for 24 hours (and served stale for a week while it refreshes), so a renamed
 * playlist or a new cover shows up within a day. If Spotify can't be reached for one playlist, that entry comes back
 * with title and image set to null; the page then shows a coloured placeholder and the plain link.
 *
 * To change the playlists, edit the ids below (the part of the Spotify link after /playlist/, without ?si=...).
 */
const IDS = [
  '4UBiBzbkyOObMCmcTsZdTo',
  '5jEZ1WxiyDqSyEpgUSdyCX',
  '0CvhxTnxu8oEydxP8ocdLw',
  '18MbXOaQsXyCuUdn3FsXQm',
];

async function one(id) {
  const url = 'https://open.spotify.com/playlist/' + id;
  const out = { id, url, title: null, image: null };
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 6000);
    const r = await fetch('https://open.spotify.com/oembed?url=' + encodeURIComponent(url), { signal: ctl.signal });
    clearTimeout(timer);
    if (!r.ok) return out;
    const j = await r.json();
    out.title = typeof j.title === 'string' && j.title.trim() ? j.title.trim().slice(0, 200) : null;
    out.image = typeof j.thumbnail_url === 'string' && /^https:\/\//.test(j.thumbnail_url) ? j.thumbnail_url : null;
  } catch (e) { /* keep the fallback entry */ }
  return out;
}

/* Each warm server instance remembers the answer for 10 minutes, so even requests that get past the edge cache cost Spotify nothing. */
let memo = null, memoAt = 0;
const MEMO_MS = 10 * 60 * 1000;

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).end(JSON.stringify({ error: 'Method not allowed' }));
  }
  // Nothing here takes a parameter. A query string (?x=1, ?x=2 ...) would give every request its own edge-cache entry,
  // so it is refused: every real request is the same URL and is answered from the cache.
  if ((req.url || '').indexOf('?') !== -1) {
    res.setHeader('Cache-Control', 'public, s-maxage=3600');
    return res.status(400).end(JSON.stringify({ error: 'Bad request' }));
  }
  let list = memo && Date.now() - memoAt < MEMO_MS ? memo : null;
  if (!list) {
    list = await Promise.all(IDS.map(one));
    if (list.some((p) => p.title)) { memo = list; memoAt = Date.now(); }
  }
  // Only cache a good answer for a day; if Spotify failed for everything, try again soon.
  const good = list.some((p) => p.title);
  res.setHeader('Cache-Control', good ? 'public, s-maxage=86400, stale-while-revalidate=604800' : 'public, s-maxage=60');
  return res.status(200).end(JSON.stringify(list));
};
