/* refcheck.mjs <baseline-site-dir>: proves the reference sizes did not move.
 *   node refcheck.mjs /path/to/a/checkout/of/the/old/site [page,page,...]
 * Loads every page at 1512x860, 390x844 and 375x812 from the old copy of the site and from this one, records where every
 * element sits (document coordinates), and lists the elements that moved or changed size by more than 0.5px.
 * Parts that move by themselves (the skills ticker, the wheels, the underline sweeps, the carousels, the randomly picked
 * "On Repeat" song) are left out.
 */
import { chromium } from 'playwright-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const NEW = path.resolve(HERE, '../..');
const OLD = path.resolve(process.argv[2] || '');
const ALL = ['index', 'work', 'storytelling', 'events', 'side-quests', 'project-onboard-business-pivot', 'project-eur-gbp-global-accounts',
  'project-onboard-test-pilots', 'project-consumer-product-refresh', 'project-onchain-design-sprint', 'project-stablecoin-sprint'];
const PAGES = process.argv[3] ? process.argv[3].split(',') : ALL;
const REFS = [[1512, 860], [390, 844], [375, 812]];
const MOVING = '.sk-band, .skills-strip, .tools-orbit, .orbit-gallery, .gw-track, .sqw-wheel, .rot-wheel, [class*="orbit"], [class*="wheel"], [class*="marquee"], .games, #mk, .mk, .music-bar, canvas, video, i, .og-spin, .sq2-rotation, .cs-screens-track';
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.woff2': 'font/woff2', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json', '.mp3': 'audio/mpeg' };
const serve = (root) => new Promise((res) => {
  const s = http.createServer((q, r) => {
    let p = decodeURIComponent(new URL(q.url, 'http://x').pathname); if (p === '/') p = '/index.html';
    if (p.startsWith('/api/')) { r.setHeader('content-type', 'application/json'); return r.end('{}'); }
    const f = path.join(root, p);
    if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.statusCode = 404; return r.end(); }
    r.setHeader('content-type', types[path.extname(f)] || 'application/octet-stream'); fs.createReadStream(f).pipe(r);
  }).listen(0, '127.0.0.1', () => res(s));
});
const SNAP = `(MOVING) => {
  const out = []; let i = 0;
  for (const e of document.body.querySelectorAll('*')) {
    if (e.closest(MOVING) || e.closest('script,style,noscript,svg')) continue;
    const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
    if (cs.display === 'none') continue;
    out.push([i++, e.tagName + '.' + String(e.className.baseVal ?? e.className).split(' ')[0] + (e.id ? '#' + e.id : ''), Math.round((r.left + scrollX) * 10) / 10, Math.round((r.top + scrollY) * 10) / 10, Math.round(r.width * 10) / 10, Math.round(r.height * 10) / 10]);
  }
  return out; }`;
async function snap(browser, base, p, w, h) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage(); await page.route(/_vercel|googletagmanager/, (r) => r.abort());
  await page.goto(`${base}/${p}.html`, { waitUntil: 'load', timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1800);
  const H = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < H; y += h * 0.7) { await page.evaluate((v) => scrollTo(0, v), y); await page.waitForTimeout(50); }
  await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(400);
  const rows = await page.evaluate(`(${SNAP})(${JSON.stringify(MOVING)})`); await ctx.close(); return rows;
}
const [sOld, sNew] = [await serve(OLD), await serve(NEW)];
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
let moved = 0, total = 0;
for (const p of PAGES) for (const [w, h] of REFS) {
  const a = await snap(browser, `http://127.0.0.1:${sOld.address().port}`, p, w, h);
  const b = await snap(browser, `http://127.0.0.1:${sNew.address().port}`, p, w, h);
  total += Math.min(a.length, b.length);
  const diffs = [];
  if (a.length !== b.length) diffs.push(`element count ${a.length} -> ${b.length}`);
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    const [, n, ...A] = a[i], [, , ...B] = b[i];
    if (A.some((v, k) => Math.abs(v - B[k]) > 0.5)) diffs.push(`${n} ${A.join(',')} -> ${B.join(',')}`);
  }
  moved += diffs.length;
  console.log(`${p.padEnd(34)} ${w}x${h}  ${diffs.length ? diffs.length + ' moved' : 'identical'}`);
  diffs.slice(0, 6).forEach((d) => console.log('    ' + d));
}
await browser.close(); sOld.close(); sNew.close();
console.log(`\n${moved} of ${total} elements moved at the reference sizes.`);
