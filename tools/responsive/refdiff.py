"""refdiff.py: how much did the reference sizes change between two runs?  python3 refdiff.py before after
Prints, per page and reference size, the share of pixels that differ visibly (fold and full page)."""
import sys, os
from PIL import Image, ImageChops
a, b = sys.argv[1:3]
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'screenshots')
refs = ['1512x860', '390x844', '375x812']
worst = 0
for page in sorted(os.listdir(os.path.join(root, a))):
    d = os.path.join(root, a, page)
    if not os.path.isdir(d): continue
    for s in refs:
        for kind in ('fold', 'full'):
            fa, fb = os.path.join(root, a, page, f'{s}-{kind}.jpg'), os.path.join(root, b, page, f'{s}-{kind}.jpg')
            if not (os.path.exists(fa) and os.path.exists(fb)): continue
            ia, ib = Image.open(fa).convert('L'), Image.open(fb).convert('L')
            if ia.size != ib.size: print(f'{page:36s} {s:9s} {kind:5s} SIZE CHANGED {ia.size} -> {ib.size}'); worst = 99; continue
            diff = ImageChops.difference(ia, ib).point(lambda v: 255 if v > 40 else 0)
            share = sum(1 for v in diff.getdata() if v) / (ia.width * ia.height) * 100
            worst = max(worst, share)
            if share > 0.05: print(f'{page:36s} {s:9s} {kind:5s} {share:.2f}% differ')
print('worst', round(worst, 3), '%')
