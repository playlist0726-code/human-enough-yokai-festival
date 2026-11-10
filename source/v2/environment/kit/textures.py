"""Festival kit textures (R04): procedural, tileable, hand-painted look.

Run: .venv-bpy/bin/python source/v2/environment/kit/textures.py
Writes 1024 px PNGs into source/v2/environment/kit/textures/. Deterministic (fixed seeds).

Textures are mostly neutral so one material can serve the whole kit: the colour of each
part comes from vertex colours (COLOR_0) multiplied with these maps.
  kit_wood.png   cedar planks, painterly grain, worn edges (natural colour)
  kit_cloth.png  seigaiha wave pattern on woven cloth (grey, tinted per stall)
  kit_paint.png  mottled brush paint for lacquer, metal, ceramics (light grey, tinted)
  kit_stone.png  path stones with moss in the joints (natural colour)
  kit_ground.png dark moss, earth and fallen leaves for night grass (natural colour)
"""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'textures')
N = 1024


def vnoise(n, cells, seed, octaves=4):
    """Tileable fractal value noise in [0,1]."""
    rng = np.random.default_rng(seed)
    out = np.zeros((n, n))
    amp, total = 1.0, 0.0
    for o in range(octaves):
        c = cells * 2 ** o
        grid = rng.random((c, c))
        y = np.linspace(0, c, n, endpoint=False)
        y0 = np.floor(y).astype(int)
        t = y - y0
        t = t * t * (3 - 2 * t)
        y1 = (y0 + 1) % c
        a = grid[y0][:, y0] * (1 - t)[None, :] + grid[y0][:, y1] * t[None, :]
        b = grid[y1][:, y0] * (1 - t)[None, :] + grid[y1][:, y1] * t[None, :]
        out += amp * (a * (1 - t)[:, None] + b * t[:, None])
        total += amp
        amp *= .5
    return out / total


def hexrgb(h):
    h = h.lstrip('#')
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], float) / 255


def save(name, arr):
    os.makedirs(OUT, exist_ok=True)
    img = Image.fromarray(np.clip(arr * 255, 0, 255).astype(np.uint8))
    img.save(os.path.join(OUT, name), optimize=True)
    return img


def strokes(img, rng, count, length, width, colors, horizontal=True, alpha=60):
    """Short painterly strokes, wrapped so the texture stays tileable."""
    layer = Image.new('RGBA', img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for _ in range(count):
        x, y = rng.random() * N, rng.random() * N
        L = length * (.5 + rng.random())
        c = colors[rng.integers(len(colors))]
        col = tuple(int(v * 255) for v in c) + (int(alpha * (.5 + rng.random())),)
        dx, dy = (L, rng.normal() * L * .04) if horizontal else (rng.normal() * L * .25, L * .3)
        for ox in (-N, 0, N):
            for oy in (-N, 0, N):
                d.line([(x + ox, y + oy), (x + dx + ox, y + dy + oy)], fill=col, width=max(1, int(width * (.6 + rng.random() * .8))))
    layer = layer.filter(ImageFilter.GaussianBlur(.8))
    img.alpha_composite(layer)


def wood():
    rng = np.random.default_rng(11)
    planks = 8
    ph = N // planks
    base = np.zeros((N, N, 3))
    tones = [hexrgb(c) for c in ['#a2734a', '#946640', '#ad7d51', '#8c5f3b', '#9d6e46', '#b0825a', '#91633f', '#a77a4f']]
    yy, xx = np.mgrid[0:N, 0:N]
    grain_warp = vnoise(N, 4, 3, 3)
    for p in range(planks):
        sl = slice(p * ph, (p + 1) * ph)
        t = tones[p]
        # grain: stretched sine bands warped by noise, along x (tileable: integer frequency)
        g = np.sin((yy[sl] * (.22 + .03 * p) + grain_warp[sl] * 18 + np.sin(xx[sl] / N * 2 * np.pi * (1 + p % 2)) * 3))
        g = .5 + .5 * g
        shade = .9 + .14 * g[..., None] - .05
        base[sl] = t * shade
    n = vnoise(N, 8, 5, 5)
    base *= (.88 + .24 * n)[..., None]
    img = Image.fromarray((np.clip(base, 0, 1) * 255).astype(np.uint8)).convert('RGBA')
    strokes(img, rng, 900, 140, 5, [hexrgb('#c49466'), hexrgb('#7a5132'), hexrgb('#b98a5e')], True, 55)
    a = np.asarray(img.convert('RGB')).astype(float) / 255
    # plank gaps and worn edges
    for p in range(planks + 1):
        y = (p * ph) % N
        for k, (dy, f) in enumerate([(-3, .82), (-2, .55), (-1, .35), (0, .3), (1, .45), (2, 1.18), (3, 1.12), (4, 1.06)]):
            a[(y + dy) % N] *= f
    # knots
    for _ in range(7):
        cx, cy = rng.integers(N), rng.integers(N)
        r = rng.integers(10, 22)
        d = np.hypot(((xx - cx + N / 2) % N - N / 2) / 1.8, (yy - cy + N / 2) % N - N / 2)
        ring = np.exp(-((d - r * .6) / (r * .25)) ** 2) * .25 + (d < r * .45) * .3
        a *= (1 - ring)[..., None]
    return save('kit_wood.png', np.clip(a, 0, 1))


def cloth():
    rng = np.random.default_rng(21)
    yy, xx = np.mgrid[0:N, 0:N].astype(float)
    # seigaiha: rows of overlapping concentric arcs; 8 waves across, tileable
    R = N / 8
    pattern = np.zeros((N, N))
    for row in range(-1, 18):
        cy = row * R * .5
        off = (row % 2) * R
        for col in range(-1, 6):
            cx = col * 2 * R + off
            for ox in (-N, 0, N):
                d = np.hypot(xx - cx - ox, yy - cy)
                inside = d < R * .98
                rings = (np.sin(d / R * np.pi * 4.0) > .35) & inside
                pattern = np.where(inside, rings.astype(float), pattern)
    pattern = np.roll(pattern, 0, 0)
    weave = .92 + .05 * np.sin(xx * np.pi / 2) * np.sin(yy * np.pi / 2) + .06 * (vnoise(N, 16, 7, 3) - .5)
    base = .52 + .44 * pattern
    blotch = .9 + .2 * vnoise(N, 5, 9, 4)
    v = np.clip(base * weave * blotch, 0, 1)
    a = np.stack([v, v, v], -1)
    img = Image.fromarray((a * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(.7))
    return save('kit_cloth.png', np.asarray(img).astype(float) / 255)


def paint():
    n = vnoise(N, 6, 31, 5)
    m = vnoise(N, 24, 33, 3)
    v = .86 + .12 * n + .05 * (m - .5)
    a = np.stack([v, v, v * .99], -1)
    img = Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8)).convert('RGBA')
    rng = np.random.default_rng(35)
    strokes(img, rng, 700, 60, 6, [np.array([1, 1, 1]), np.array([.75, .75, .75])], False, 35)
    return save('kit_paint.png', np.asarray(img.convert('RGB')).astype(float) / 255)


def stone():
    """Irregular flagstones (4x4 per tile) with mossy joints."""
    rng = np.random.default_rng(41)
    yy, xx = np.mgrid[0:N, 0:N].astype(float)
    pts = rng.random((22, 2)) * N
    d1 = np.full((N, N), 1e9)
    d2 = np.full((N, N), 1e9)
    idx = np.zeros((N, N), int)
    for i, (px, py) in enumerate(pts):
        for ox in (-N, 0, N):
            for oy in (-N, 0, N):
                d = np.hypot(xx - px - ox, yy - py - oy)
                closer = d < d1
                d2 = np.where(closer, d1, np.minimum(d2, d))
                idx = np.where(closer, i, idx)
                d1 = np.where(closer, d, d1)
    edge = d2 - d1
    tones = [hexrgb(c) for c in ['#a79a86', '#9b8f7d', '#b2a48d', '#958a7b', '#a99886', '#8f8676']]
    col = np.array(tones)[idx % len(tones)]
    n = vnoise(N, 10, 43, 5)
    col = col * (.85 + .25 * n)[..., None]
    bevel = np.clip(edge / 18, 0, 1)
    col = col * (.62 + .38 * bevel)[..., None] + (bevel > .3)[..., None] * (bevel < .55)[..., None] * .03
    joint = edge < 6
    moss = hexrgb('#3e5236') * (.8 + .4 * vnoise(N, 20, 45, 3))[..., None]
    soil = hexrgb('#3a2e26')
    mossmask = vnoise(N, 7, 47, 3) > .5
    col = np.where(joint[..., None], np.where(mossmask[..., None], moss, soil), col)
    # moss creeping onto stone edges
    creep = (edge < 14) & (vnoise(N, 14, 49, 4) > .62)
    col = np.where(creep[..., None], col * .5 + moss * .5, col)
    img = Image.fromarray((np.clip(col, 0, 1) * 255).astype(np.uint8)).convert('RGBA')
    strokes(img, rng, 500, 40, 4, [hexrgb('#c4b59c'), hexrgb('#7b7064')], True, 40)
    return save('kit_stone.png', np.asarray(img.convert('RGB')).astype(float) / 255)


def ground():
    rng = np.random.default_rng(51)
    n1 = vnoise(N, 4, 53, 5)
    n2 = vnoise(N, 12, 55, 4)
    moss = hexrgb('#34452f')
    moss2 = hexrgb('#465a39')
    earth = hexrgb('#4a3b2c')
    col = moss * (1 - n2[..., None]) + moss2 * n2[..., None]
    col = np.where((n1 > .58)[..., None], col * .5 + earth * .5, col)
    col *= (.85 + .3 * vnoise(N, 32, 57, 2))[..., None]
    img = Image.fromarray((np.clip(col, 0, 1) * 255).astype(np.uint8)).convert('RGBA')
    strokes(img, rng, 2600, 22, 3, [hexrgb('#5f7547'), hexrgb('#2a3826'), hexrgb('#6b6a42')], False, 70)
    # fallen leaves and petals
    d = ImageDraw.Draw(img)
    for _ in range(260):
        x, y = rng.random() * N, rng.random() * N
        c = [(140, 98, 56), (176, 120, 70), (120, 80, 60), (205, 150, 160)][rng.integers(4)]
        r = 3 + rng.random() * 5
        a = rng.random() * np.pi
        dx, dy = np.cos(a) * r, np.sin(a) * r
        for ox in (-N, 0, N):
            for oy in (-N, 0, N):
                d.ellipse([x - r + ox, y - r * .5 + oy, x + r + ox, y + r * .5 + oy], fill=c + (190,))
    return save('kit_ground.png', np.asarray(img.convert('RGB')).astype(float) / 255)


if __name__ == '__main__':
    for f in (wood, cloth, paint, stone, ground):
        f()
        print('wrote', f.__name__)
