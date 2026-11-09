#!/usr/bin/env python3
"""R05 title wordmark: matte the existing key-art logo out of public/assets/human-enough-title.png.

Re-run:  python3 -I source/v2/ui/build_logo.py public/assets/human-enough-title.png public/assets/ui
The key art logo is cream/gold letters (+ a red paper lantern) over a navy night sky, so a
"warmth" key (red minus blue) separates it; small warm specks (town lights) are removed by
connected-component area. Output: logo-wordmark.webp (transparent, <=1200 px wide) and logo-wordmark-600.webp.
No generated-image credits; the design is the original key-art logo, unchanged.
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter

src = Path(sys.argv[1]); out = Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
CROP = (36, 52, 836, 368)          # logo block incl. "e.v.e games", lantern and YOKAI FESTIVAL line
im = Image.open(src).convert('RGB').crop(CROP)
a = np.asarray(im, float) / 255
r, g, b = a[..., 0], a[..., 1], a[..., 2]
warm = r - b
lum = .2126 * r + .7152 * g + .0722 * b
alpha = np.clip((warm - .06) / .16, 0, 1) * np.clip((lum - .16) / .14, 0, 1)
alpha = np.maximum(alpha, np.clip((lum - .42) / .18, 0, 1))      # cream letter faces are bright: solid
yy, xx = np.mgrid[0:alpha.shape[0], 0:alpha.shape[1]]
# leave out the studio credit (shown separately in UI) and the foliage/railing in the bottom corners
alpha[(yy < 46)] = 0
alpha[(yy > 262) & ((xx < 118) | (xx > 700))] = 0
credit = np.zeros_like(alpha, bool)

# drop small warm islands (distant town lights, firework sparks)
hard = alpha > .35
labels = np.zeros(hard.shape, int); n = 0; sizes = {}
from collections import deque
for y0, x0 in zip(*np.nonzero(hard)):
    if labels[y0, x0]: continue
    n += 1; q = deque([(y0, x0)]); labels[y0, x0] = n; c = 0
    while q:
        y, x = q.popleft(); c += 1
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < hard.shape[0] and 0 <= nx < hard.shape[1] and hard[ny, nx] and not labels[ny, nx]:
                labels[ny, nx] = n; q.append((ny, nx))
    sizes[n] = c
keep_ids = {k for k, v in sizes.items() if v >= 60}
keep = np.isin(labels, list(keep_ids))
grow = np.asarray(Image.fromarray((keep * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(7)), float) / 255
credit_keep = credit & (alpha > .2)
alpha = alpha * np.maximum(grow, credit_keep)

# un-premultiply navy fringe: push edge colour toward the letter cream
cream = np.array([.95, .88, .72])
col = a.copy()
edge = (alpha > 0) & (alpha < .9)
col[edge] = col[edge] * .45 + cream * .55
# soft night outline so the wordmark reads on any background (key art has the navy sky behind it)
halo = np.asarray(Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(3)), float) / 255
navy = np.array([.07, .09, .18])
out_a = alpha + halo * .7 * (1 - alpha)
col = (col * alpha[..., None] + navy * (halo * .7 * (1 - alpha))[..., None]) / np.maximum(out_a, 1e-6)[..., None]
alpha = out_a
rgba = np.dstack([col, alpha])
logo = Image.fromarray((np.clip(rgba, 0, 1) * 255).astype(np.uint8), 'RGBA')
bbox = logo.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
logo = logo.crop((max(0, bbox[0] - 6), max(0, bbox[1] - 6), bbox[2] + 6, bbox[3] + 6))
w = min(1200, logo.width * 3 // 2)
big = logo.resize((w, round(logo.height * w / logo.width)), Image.LANCZOS)
big.save(out / 'logo-wordmark.webp', quality=88, method=6)
small = logo.resize((600, round(logo.height * 600 / logo.width)), Image.LANCZOS)
small.save(out / 'logo-wordmark-600.webp', quality=88, method=6)
for f in ('logo-wordmark.webp', 'logo-wordmark-600.webp'):
    print(f, f'{(out / f).stat().st_size/1024:.0f} KB')
