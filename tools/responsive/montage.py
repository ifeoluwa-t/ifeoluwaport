"""montage.py <label> <page> <kind fold|full> <sizes comma list> <out.png> [cellHeight]
Review helper: tiles one page's screenshots (at the given sizes) into a single labelled image."""
import sys, os
from PIL import Image, ImageDraw
label, page, kind, sizes, out = sys.argv[1:6]
H = int(sys.argv[6]) if len(sys.argv) > 6 else 360
root = os.path.join(os.path.dirname(__file__), '..', '..', 'screenshots', label, page)
tiles = []
for s in sizes.split(','):
    f = os.path.join(root, f'{s}-{kind}.jpg')
    if not os.path.exists(f): continue
    im = Image.open(f).convert('RGB'); r = H / im.height
    if kind == 'full' and im.height > 6 * im.width: r = H / min(im.height, 6 * im.width)
    im = im.resize((max(1, int(im.width * r)), int(im.height * r) if kind == 'fold' else min(H, int(im.height * r))))
    tiles.append((s, im))
W = sum(t[1].width + 8 for t in tiles) + 8
canvas = Image.new('RGB', (min(W, 3000), H + 30), '#222'); d = ImageDraw.Draw(canvas); x = 8
rows = [[]]; 
# wrap into rows of max 2900 wide
rows = []; cur = []; cw = 8
for t in tiles:
    if cw + t[1].width + 8 > 2900 and cur: rows.append(cur); cur = []; cw = 8
    cur.append(t); cw += t[1].width + 8
rows.append(cur)
canvas = Image.new('RGB', (2900, len(rows) * (H + 24) + 4), '#222'); d = ImageDraw.Draw(canvas); y = 4
for row in rows:
    x = 8
    for s, im in row:
        d.text((x, y + 4), s, fill='#fff'); canvas.paste(im, (x, y + 18)); x += im.width + 8
    y += H + 24
canvas.save(out)
