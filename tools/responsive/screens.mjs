/* Screen simulator: screenshots every page at every screen size, and measures a few things that go wrong.
 *
 *   npm run screens                       (from tools/responsive, after a one-time `npm install`)
 *   npm run screens -- --label after      (name the run; default "run")
 *   npm run screens -- --pages index,work --sizes 1512x860,320x568
 *   npm run screens -- --dpr2             (also 2x retina shots of a few sizes)
 *
 * Output (gitignored): /screenshots/<label>/<page>/<WxH>-fold.jpg, -full.jpg, plus metrics.json and index.html (the contact sheet).
 * It serves the site itself on a local port and uses your installed Google Chrome (set CHROME=/path to use another).
 */
import { chromium } from 'playwright-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSheets } from './contact.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const OUT = path.join(ROOT, 'screenshots');

export const PAGES = ['index', 'work', 'storytelling', 'events', 'side-quests',
  'project-onboard-business-pivot', 'project-eur-gbp-global-accounts', 'project-onboard-test-pilots',
  'project-consumer-product-refresh', 'project-onchain-design-sprint', 'project-stablecoin-sprint', 'dashboard'];

export const SIZES = [
  ['Phones', [[320, 568, 'small Android / iPhone SE'], [360, 780, 'common Android'], [375, 812, 'iPhone mini / X (reference)'],
    [390, 844, 'iPhone 14/15 (reference)'], [430, 932, 'iPhone Pro Max / Plus'], [844, 390, 'phone landscape']]],
  ['Tablets', [[768, 1024, 'iPad portrait'], [820, 1180, 'iPad Air portrait'], [1024, 768, 'iPad landscape'], [1180, 820, 'iPad Air landscape']]],
  ['Laptops', [[1280, 650, 'Windows 1080p at 150%'], [1280, 720, 'small laptop'], [1366, 630, 'Windows 1366x768'], [1440, 800, 'MacBook Air 13"'],
    [1512, 860, 'MacBook Pro 14" (reference)'], [1536, 740, 'Windows 1080p at 125%'], [1728, 1000, 'MacBook Pro 16"']]],
  ['Monitors', [[1920, 950, '1080p monitor'], [2048, 1050, '1080p-class, other scaling'], [2560, 1300, '1440p monitor'],
    [3440, 1300, 'ultrawide 21:9'], [3840, 2000, '4K at 100%'], [1920, 1080, 'full-screen browser']]],
];
const DPR2 = ['390x844', '1512x860', '2560x1300'];

const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i > -1 ? process.argv[i + 1] : d; };
const label = arg('label', 'run');
const pages = (arg('pages', '') || PAGES.join(',')).split(',').filter(Boolean);
const only = arg('sizes', '') ? new Set(arg('sizes').split(',')) : null;
const wantDpr2 = process.argv.includes('--dpr2');

const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.woff2': 'font/woff2', '.png': 'image/png',
  '.ico': 'image/x-icon', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.mp4': 'video/mp4', '.svg': 'image/svg+xml', '.json': 'application/json', '.mp3': 'audio/mpeg' };
function serve() {
  return new Promise((res) => {
    const s = http.createServer((q, r) => {
      let p = decodeURIComponent(new URL(q.url, 'http://x').pathname);
      if (p === '/') p = '/index.html'; if (p === '/dashboard') p = '/dashboard.html';
      if (p.startsWith('/api/')) { r.setHeader('content-type', 'application/json'); r.statusCode = 200; return r.end('{}'); }
      const f = path.join(ROOT, p);
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.statusCode = 404; return r.end('nf'); }
      r.setHeader('content-type', types[path.extname(f)] || 'application/octet-stream');
      fs.createReadStream(f).pipe(r);
    }).listen(0, '127.0.0.1', () => res(s));
  });
}

/* things that go wrong, measured in the page */
const MEASURE = `(() => {
  const vw = innerWidth, vh = innerHeight;
  const out = { overflowX: document.documentElement.scrollWidth - vw, minFont: 99, smallTaps: [], fixedOverlap: [], docH: document.documentElement.scrollHeight };
  const vis = (e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && cs.opacity !== '0'; };
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (w.nextNode()) { const n = w.currentNode; if (!n.textContent.trim() || !n.parentElement || !vis(n.parentElement)) continue;
    if (n.parentElement.closest('script,style,noscript,svg')) continue;
    const f = parseFloat(getComputedStyle(n.parentElement).fontSize); if (f < out.minFont) out.minFont = f; }
  if (vw < 1024) for (const e of document.querySelectorAll('a,button,input,select,textarea,[role=button]')) { if (!vis(e)) continue;
    const r = e.getBoundingClientRect(); let W = r.width, H = r.height;
      for (const ps of ['::before', '::after']) { const c = getComputedStyle(e, ps); if (c.position === 'absolute' && c.content !== 'none' && parseFloat(c.width) > 0) { W = Math.max(W, parseFloat(c.width)); H = Math.max(H, parseFloat(c.height)); } }   // an invisible hit area counts
      if ((W < 43.5 || H < 43.5) && r.right > 0 && r.left < vw) out.smallTaps.push((e.className && String(e.className).slice(0, 30)) || e.tagName); }
  out.smallTaps = out.smallTaps.slice(0, 6).concat(out.smallTaps.length > 6 ? ['+' + (out.smallTaps.length - 6)] : []);
  const fx = [...document.querySelectorAll('body *')].filter((e) => getComputedStyle(e).position === 'fixed' && vis(e));
  for (let i = 0; i < fx.length; i++) for (let j = i + 1; j < fx.length; j++) { if (fx[i].contains(fx[j]) || fx[j].contains(fx[i])) continue;
    const a = fx[i].getBoundingClientRect(), b = fx[j].getBoundingClientRect();
    if (a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom) out.fixedOverlap.push((fx[i].id || fx[i].className || fx[i].tagName) + ' x ' + (fx[j].id || fx[j].className || fx[j].tagName)); }
  out.fixedOverlap = [...new Set(out.fixedOverlap.map((s) => String(s).slice(0, 80)))].slice(0, 4);
  const h = document.querySelector('main section, section, header');
  out.firstBlockBottom = h ? Math.round(h.getBoundingClientRect().bottom) : null;
  return out; })()`;

async function shoot(browser, base, p, w, h, dpr, tag) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, isMobile: false, reducedMotion: 'no-preference' });
  const page = await ctx.newPage();
  await page.route(/googletagmanager|_vercel|vitals/, (r) => r.abort());
  await page.goto(`${base}/${p}.html`, { waitUntil: 'load', timeout: 30000 }).catch(() => {});
  await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
  await page.waitForTimeout(1500);
  const dir = path.join(OUT, label, p); fs.mkdirSync(dir, { recursive: true });
  const name = `${w}x${h}${tag}`;
  await page.screenshot({ path: path.join(dir, name + '-fold.jpg'), type: 'jpeg', quality: 72 });
  /* scroll through so reveal-on-scroll content is shown, then come back */
  const H = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < H; y += Math.max(200, h * 0.7)) { await page.evaluate((v) => scrollTo(0, v), y); await page.waitForTimeout(60); }
  await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(250);
  const metrics = await page.evaluate(MEASURE);
  if (dpr === 1) await page.screenshot({ path: path.join(dir, name + '-full.jpg'), type: 'jpeg', quality: 60, fullPage: true });
  await ctx.close();
  return { page: p, size: `${w}x${h}${tag}`, ...metrics };
}

const server = await serve();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const jobs = [];
for (const p of pages) for (const [, list] of SIZES) for (const [w, h] of list) {
  if (only && !only.has(`${w}x${h}`)) continue;
  jobs.push([p, w, h, 1, '']);
  if (wantDpr2 && DPR2.includes(`${w}x${h}`)) jobs.push([p, w, h, 2, '@2x']);
}
const results = []; let next = 0;
async function worker() { while (next < jobs.length) { const j = jobs[next++]; try { results.push(await shoot(browser, base, ...j)); } catch (e) { results.push({ page: j[0], size: `${j[1]}x${j[2]}${j[4]}`, error: String(e).slice(0, 120) }); }
  if (next % 20 === 0) console.log(`${next}/${jobs.length}`); } }
await Promise.all(Array.from({ length: 4 }, worker));
await browser.close(); server.close();
fs.mkdirSync(path.join(OUT, label), { recursive: true });
fs.writeFileSync(path.join(OUT, label, 'metrics.json'), JSON.stringify(results, null, 1));
buildSheets(OUT, label, pages);
console.log(`done: ${results.length} shots -> screenshots/${label}/index.html`);
