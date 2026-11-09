#!/usr/bin/env python3
"""R05 UI kit textures — procedural, deterministic, no generated-image credits.

Re-run:  python3 -I source/v2/ui/build_ui_textures.py public/assets/ui
Outputs (all small, all re-creatable from this file):
  paper-tile.webp     256x256 tileable festival paper (fibres + mottling)
  panel-paper.png     9-slice frame, 96x96 @2x, slice 28px: deckled paper edge + thin inner rule
  wood-tile.webp      512x64 horizontally tileable dark cedar grain
  plaque-wood.png     9-slice frame, 96x96 @2x, slice 24px: rounded lacquered wood edge + bevel
Palette comes from ART_BIBLE.md section 7 (paper #f4efe6, ink, vermilion #e8603c, gold #e9b765).
"""
import sys, math
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

SEED = 20261108
OUT = Path(sys.argv[1] if len(sys.argv) > 1 else 'public/assets/ui')
OUT.mkdir(parents=True, exist_ok=True)
rng = np.random.default_rng(SEED)

PAPER = np.array([244, 239, 230], float)      # #f4efe6
PAPER_SHADE = np.array([226, 212, 188], float)
FIBRE_DARK = np.array([196, 176, 146], float)
RULE = (154, 112, 72, 150)                    # warm sepia hairline
WOOD_LIGHT = np.array([122, 82, 56], float)
WOOD_DARK = np.array([58, 38, 28], float)


def tileable_noise(w, h, octaves, rng):
    """Sum of sinusoids with integer frequencies -> wraps perfectly on both axes."""
    y, x = np.mgrid[0:h, 0:w]
    acc = np.zeros((h, w))
    for freq, amp in octaves:
        for _ in range(6):
            fx, fy = rng.integers(-freq, freq + 1, 2)
            if fx == 0 and fy == 0:
                continue
            ph = rng.uniform(0, 2 * math.pi)
            acc += amp * np.sin(2 * math.pi * (fx * x / w + fy * y / h) + ph)
    acc -= acc.min(); acc /= max(acc.max(), 1e-6)
    return acc


def paper_tile(size=256):
    n = tileable_noise(size, size, [(2, 1.0), (5, .55), (11, .3), (23, .18)], rng)
    img = PAPER[None, None, :] * (1 - .45 * n[..., None]) + PAPER_SHADE[None, None, :] * (.45 * n[..., None])
    grain = rng.normal(0, 2.2, (size, size, 1))
    img = img + grain
    # fibres: short curved strokes drawn on a 3x3 wrap canvas then cropped -> seamless
    layer = Image.new('L', (size * 3, size * 3), 0)
    d = ImageDraw.Draw(layer)
    for _ in range(170):
        x, y = rng.uniform(size, 2 * size, 2)
        ang = rng.uniform(0, math.pi); ln = rng.uniform(6, 26); bend = rng.uniform(-.4, .4)
        pts = []
        for t in np.linspace(0, 1, 8):
            a = ang + bend * t
            pts.append((x + math.cos(a) * ln * t, y + math.sin(a) * ln * t))
        val = int(rng.uniform(40, 110))
        for ox in (-size, 0, size):
            for oy in (-size, 0, size):
                d.line([(px + ox, py + oy) for px, py in pts], fill=val, width=1)
    fib = np.asarray(layer.filter(ImageFilter.GaussianBlur(.45)), float)[size:2 * size, size:2 * size] / 255
    img = img * (1 - .6 * fib[..., None]) + FIBRE_DARK * (.6 * fib[..., None])
    return Image.fromarray(np.clip(img, 0, 255).astype(np.uint8), 'RGB')


def deckle_mask(w, h, inset, rng, rough=1.7):
    """Alpha mask of a sheet whose edge wanders a few px like hand-made paper."""
    m = Image.new('L', (w, h), 0)
    d = ImageDraw.Draw(m)
    pts = []
    def wob(n):
        v = np.cumsum(rng.normal(0, .9, n)); v -= np.linspace(v[0], v[-1], n); return np.clip(v, -rough, rough)
    steps = 48
    for i, o in enumerate(wob(steps)): pts.append((inset + i * (w - 2 * inset) / (steps - 1), inset + o))
    for i, o in enumerate(wob(steps)): pts.append((w - inset + o, inset + i * (h - 2 * inset) / (steps - 1)))
    for i, o in enumerate(wob(steps)): pts.append((w - inset - i * (w - 2 * inset) / (steps - 1), h - inset + o))
    for i, o in enumerate(wob(steps)): pts.append((inset + o, h - inset - i * (h - 2 * inset) / (steps - 1)))
    d.polygon(pts, fill=255)
    return m.filter(ImageFilter.GaussianBlur(.6))


def with_shadow(img, mask, dy=3, blur=3.2, alpha=.55):
    """Bake a soft night-blue drop shadow under the sheet (no CSS filter cost at runtime)."""
    sh = Image.new('L', img.size, 0); sh.paste(mask, (0, dy))
    sh = sh.filter(ImageFilter.GaussianBlur(blur)).point(lambda v: int(v * alpha))
    out = Image.new('RGBA', img.size, (7, 11, 26, 0)); out.putalpha(sh)
    out.alpha_composite(img)
    return out


def panel_paper(tile, size=96):
    base = Image.new('RGBA', (size, size))
    for x in range(0, size, tile.width):
        for y in range(0, size, tile.height):
            base.paste(tile.convert('RGBA'), (x, y))
    # darken the very edge a touch (aged paper) before cutting the deckle
    arr = np.asarray(base, float)
    yy, xx = np.mgrid[0:size, 0:size]
    edge = np.minimum.reduce([xx, yy, size - 1 - xx, size - 1 - yy]).astype(float)
    age = np.clip(1 - edge / 14, 0, 1) ** 2
    arr[..., :3] = arr[..., :3] * (1 - .16 * age[..., None]) + np.array([170, 130, 92]) * (.16 * age[..., None])
    base = Image.fromarray(arr.astype(np.uint8), 'RGBA')
    mask = deckle_mask(size, size, 7, rng)
    base.putalpha(mask)
    base = with_shadow(base, mask)
    d = ImageDraw.Draw(base)
    r = 14  # inner hairline, inset like a printed festival ticket
    d.rounded_rectangle([r, r, size - 1 - r, size - 1 - r], radius=6, outline=RULE, width=2)
    return base


def wood_tile(w=512, h=64):
    y, x = np.mgrid[0:h, 0:w].astype(float)
    warp = tileable_noise(w, h, [(1, 1.0), (3, .4)], rng) * 9
    rings = np.sin((y + warp) / h * 2 * math.pi * 5 + 3 * tileable_noise(w, h, [(2, 1), (6, .3)], rng))
    streak = tileable_noise(w, h, [(8, 1), (19, .5)], rng)
    t = np.clip(.55 + .25 * rings + .2 * (streak - .5), 0, 1)
    img = WOOD_DARK * (1 - t[..., None]) + WOOD_LIGHT * t[..., None]
    img += rng.normal(0, 2.5, (h, w, 1))
    return Image.fromarray(np.clip(img, 0, 255).astype(np.uint8), 'RGB')


def plaque_wood(tile, size=96, radius=18):
    crop = tile.crop((0, 0, size, size if tile.height >= size else tile.height)).resize((size, size))
    arr = np.asarray(crop.convert('RGBA'), float)
    yy, xx = np.mgrid[0:size, 0:size].astype(float)
    # bevel: lit top edge, shadowed bottom edge, lacquer sheen band
    top = np.clip(1 - yy / 7, 0, 1); bot = np.clip(1 - (size - 1 - yy) / 8, 0, 1)
    arr[..., :3] += top[..., None] * 46 - bot[..., None] * 34
    arr[..., :3] += 14 * np.exp(-((yy - 20) / 6) ** 2)[..., None]
    m = 5  # margin for the baked shadow
    mask = Image.new('L', (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle([m, m - 2, size - 1 - m, size - 1 - m - 2], radius=radius, fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(.5))
    img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), 'RGBA')
    img.putalpha(mask)
    img = with_shadow(img, mask, dy=3, blur=2.6, alpha=.6)
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([m, m - 2, size - 1 - m, size - 1 - m - 2], radius=radius, outline=(28, 18, 13, 220), width=2)
    d.rounded_rectangle([m + 4, m + 2, size - 5 - m, size - 5 - m - 2], radius=radius - 4, outline=(233, 183, 101, 70), width=1)  # gold inlay
    return img


paper = paper_tile()
paper.save(OUT / 'paper-tile.webp', quality=92, method=6)
panel_paper(paper).save(OUT / 'panel-paper.png', optimize=True)
wood = wood_tile()
wood.save(OUT / 'wood-tile.webp', quality=80, method=6)
plaque_wood(wood).save(OUT / 'plaque-wood.png', optimize=True)
for f in sorted(OUT.glob('*.*')):
    if f.is_file():
        print(f'{f.name:22s} {f.stat().st_size/1024:6.1f} KB')
