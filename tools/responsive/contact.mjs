/* Builds the contact sheets: screenshots/<label>/index.html (every page, every size) and, when the label "before" exists,
   screenshots/<label>/compare.html (before | after for the key sizes). Run on its own with: node contact.mjs <label> */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const GROUPS = [
  ['Phones', ['320x568', '360x780', '375x812', '390x844', '430x932', '844x390']],
  ['Tablets', ['768x1024', '820x1180', '1024x768', '1180x820']],
  ['Laptops', ['1280x650', '1280x720', '1366x630', '1440x800', '1512x860', '1536x740', '1728x1000']],
  ['Monitors', ['1920x950', '2048x1050', '2560x1300', '3440x1300', '3840x2000', '1920x1080']],
];
const KEY = ['1512x860', '390x844', '375x812', '1366x630', '1920x950', '2560x1300', '3440x1300', '320x568', '768x1024'];
const REFS = new Set(['1512x860', '390x844', '375x812']);

const css = `body{font:14px/1.4 system-ui,sans-serif;margin:0;background:#111;color:#eee}h1{margin:0;padding:16px 20px;position:sticky;top:0;background:#111;z-index:9;font-size:18px}
h1 a{color:#8ab4ff;font-size:13px;margin-left:12px}h2{margin:28px 20px 6px;font-size:16px;color:#8ab4ff}h3{margin:14px 20px 6px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#888}
.row{display:flex;gap:14px;overflow-x:auto;padding:0 20px 10px;align-items:flex-start}figure{margin:0;flex:none}figcaption{font-size:11px;color:#bbb;margin-bottom:4px;max-width:260px}
figcaption b{color:#fff}figcaption .bad{color:#ff8a8a}img{display:block;height:220px;width:auto;border:1px solid #333;background:#fff}img.full{height:340px}
.pair{display:flex;gap:10px}.ref{outline:2px solid #4caf50}.tag{font-size:10px;color:#4caf50}`;

function flags(m) {
  if (!m) return '';
  const f = [];
  if (m.error) f.push('error');
  if (m.overflowX > 0) f.push('h-scroll ' + m.overflowX + 'px');
  if (m.minFont < 13) f.push('font ' + m.minFont + 'px');
  if (m.fixedOverlap && m.fixedOverlap.length) f.push('overlap');
  if (m.smallTaps && m.smallTaps.length) f.push('taps<44 ×' + m.smallTaps.length);
  return f.length ? `<span class="bad">${f.join(' · ')}</span>` : '';
}

export function buildSheets(OUT, label, pages) {
  const dir = path.join(OUT, label);
  const metrics = JSON.parse(fs.readFileSync(path.join(dir, 'metrics.json'), 'utf8'));
  const M = new Map(metrics.map((m) => [m.page + '|' + m.size, m]));
  let h = `<!doctype html><meta charset=utf-8><title>Screens: ${label}</title><style>${css}</style><h1>Contact sheet: ${label} <a href="compare.html">before | after</a></h1>`;
  for (const p of pages) {
    h += `<h2>${p}</h2>`;
    for (const [g, sizes] of GROUPS) {
      h += `<h3>${g}</h3><div class="row">`;
      for (const s of sizes) {
        const m = M.get(p + '|' + s);
        const base = `${p}/${s}`;
        h += `<figure class="${REFS.has(s) ? 'ref' : ''}"><figcaption><b>${s}</b>${REFS.has(s) ? ' <span class=tag>reference</span>' : ''} ${flags(m)}</figcaption>
<div class="pair"><a href="${base}-fold.jpg"><img loading=lazy src="${base}-fold.jpg"></a><a href="${base}-full.jpg"><img class="full" loading=lazy src="${base}-full.jpg"></a></div></figure>`;
      }
      h += '</div>';
    }
  }
  fs.writeFileSync(path.join(dir, 'index.html'), h);

  const beforeDir = path.join(OUT, 'before');
  if (label !== 'before' && fs.existsSync(path.join(beforeDir, 'metrics.json'))) {
    let c = `<!doctype html><meta charset=utf-8><title>Before | After</title><style>${css}</style><h1>Before | After (${label}) <a href="index.html">all sizes</a></h1>`;
    for (const p of pages) {
      c += `<h2>${p}</h2><div class="row">`;
      for (const s of KEY) {
        const mb = JSON.parse(fs.readFileSync(path.join(beforeDir, 'metrics.json'), 'utf8')).find((m) => m.page === p && m.size === s);
        const ma = M.get(p + '|' + s);
        const rel = (l) => `${l === 'before' ? '../before' : '.'}/${p}/${s}`;
        c += `<figure class="${REFS.has(s) ? 'ref' : ''}"><figcaption><b>${s}</b>${REFS.has(s) ? ' <span class=tag>reference: must be unchanged</span>' : ''}<br>before ${flags(mb)}<br>after ${flags(ma)}</figcaption>
<div class="pair"><a href="${rel('before')}-fold.jpg"><img loading=lazy src="${rel('before')}-fold.jpg"></a><a href="${rel('after')}-fold.jpg"><img loading=lazy src="${rel('after')}-fold.jpg"></a></div></figure>`;
      }
      c += '</div>';
    }
    fs.writeFileSync(path.join(dir, 'compare.html'), c);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..', 'screenshots');
  const label = process.argv[2] || 'run';
  const pages = fs.readdirSync(path.join(root, label)).filter((d) => fs.statSync(path.join(root, label, d)).isDirectory());
  buildSheets(root, label, pages);
}
