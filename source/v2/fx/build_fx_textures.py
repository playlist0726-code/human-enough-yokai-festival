#!/usr/bin/env python3
"""R10 FX textures — procedural, deterministic, no generated-image credits.

Re-run:  python3 -I source/v2/fx/build_fx_textures.py public/assets/fx
  smoke-atlas.png  4x4 flipbook, 128 px cells (512x512). Toon puff: grow (0-4) -> billow (5-10) -> dissolve (11-15).
                   R=G=B = shading tone (1 lit, .62 mid, .28 shade, top-left light), A = coverage.
                   The shader gradient-maps tone between a per-particle shadow and light colour, so one
                   atlas serves lavender transformation smoke, brown footstep dust and grey seal smoke.
  glow-atlas.png   4x1, 128 px cells: soft dot, 4-point sparkle, heart, soft ring. Grey = intensity.
"""
import sys, math
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter

OUT = Path(sys.argv[1] if len(sys.argv) > 1 else 'public/assets/fx'); OUT.mkdir(parents=True, exist_ok=True)
rng = np.random.default_rng(1108)
C = 128
yy, xx = np.mgrid[0:C, 0:C].astype(float)


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t)


# lobes: fixed layout so every frame is the same puff evolving
LOBES = [(0, 0, .30)] + [(math.cos(a) * .2, math.sin(a) * .17, .17 + .05 * rng.random()) for a in np.linspace(0, 2 * math.pi, 8, endpoint=False) + rng.uniform(-.25, .25, 8)]
NOISE = np.asarray(Image.fromarray((rng.random((32, 32)) * 255).astype(np.uint8)).resize((C, C), Image.BICUBIC), float) / 255
NOISE = .25 * NOISE + .75 * np.asarray(Image.fromarray((rng.random((7, 7)) * 255).astype(np.uint8)).resize((C, C), Image.BICUBIC), float) / 255
NOISE = (NOISE - NOISE.min()) / (NOISE.max() - NOISE.min())


def puff(t):
    grow = 1 - (1 - min(1, t / .3)) ** 3                     # ease-out growth
    billow = 1 + .05 * math.sin(t * 9)
    cov = np.zeros((C, C)); tone = np.zeros((C, C))
    order = sorted(LOBES, key=lambda l: l[1])               # far (top) lobes first
    for lx, ly, lr in order:
        r = lr * (0.35 + .65 * grow) * billow * C * .92
        cx = C / 2 + lx * C * (0.5 + .5 * grow); cy = C / 2 + ly * C * (0.5 + .5 * grow) - t * 6
        d = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2) / max(r, 1e-3)
        m = smoothstep(1.0, .9, d)
        # light from top-left: offset highlight disc + bottom-right core shade
        hd = np.sqrt((xx - cx + r * .32) ** 2 + (yy - cy + r * .34) ** 2) / max(r, 1e-3)
        sd = np.sqrt((xx - cx - r * .28) ** 2 + (yy - cy - r * .36) ** 2) / max(r, 1e-3)
        lt = np.where(hd < .62, 1.0, np.where(sd < .58, .28, .62))
        tone = np.where(m > .5, lt, tone)                     # painter's order: nearer lobes overwrite
        cov = np.maximum(cov, m)
    if t > .5:                                               # dissolve: chunky noise erosion from the rim inward
        k = (t - .5) / .5
        r = np.sqrt((xx - C / 2) ** 2 + (yy - C / 2) ** 2) / (C / 2)
        field = NOISE * .55 + (1 - r) * .45
        cov = cov * smoothstep(k * 1.02 - .02, k * 1.02 + .1, field)
    return tone, cov


atlas = np.zeros((C * 4, C * 4, 4))
for i in range(16):
    t = i / 15
    tone, cov = puff(t)
    x0, y0 = (i % 4) * C, (i // 4) * C
    atlas[y0:y0 + C, x0:x0 + C, 0:3] = tone[..., None]
    atlas[y0:y0 + C, x0:x0 + C, 3] = cov
img = Image.fromarray((np.clip(atlas, 0, 1) * 255).astype(np.uint8), 'RGBA')
img.save(OUT / 'smoke-atlas.png', optimize=True)

# glow atlas
g = np.zeros((C, C * 4))
r = np.sqrt((xx - C / 2) ** 2 + (yy - C / 2) ** 2) / (C / 2)
g[:, 0:C] = np.exp(-(r / .42) ** 2)                                                     # soft dot
ax, ay = np.abs(xx - C / 2) / (C / 2), np.abs(yy - C / 2) / (C / 2)
star = np.maximum(np.exp(-(ax / .07) ** 2) * np.exp(-(ay / .9) ** 2), np.exp(-(ay / .07) ** 2) * np.exp(-(ax / .9) ** 2))
g[:, C:2 * C] = np.clip(star + np.exp(-(r / .2) ** 2), 0, 1)                            # 4-point sparkle
hx, hy = (xx - C / 2) / (C * .36), -(yy - C / 2 - C * .05) / (C * .36)
heart = (hx ** 2 + hy ** 2 - 1) ** 3 - hx ** 2 * hy ** 3
hm = np.asarray(Image.fromarray(((heart < 0) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.6)), float) / 255
g[:, 2 * C:3 * C] = np.clip(hm * .85 + np.exp(-(r / .55) ** 2) * .25, 0, 1)            # heart with halo
g[:, 3 * C:4 * C] = np.exp(-((r - .78) / .09) ** 2)                                     # soft ring
Image.fromarray((np.clip(g, 0, 1) * 255).astype(np.uint8), 'L').convert('RGBA').save(OUT / 'glow-atlas.png', optimize=True)
gi = Image.open(OUT / 'glow-atlas.png'); a = np.asarray(gi).copy(); a[..., 3] = a[..., 0]; a[..., 0:3] = 255
Image.fromarray(a, 'RGBA').save(OUT / 'glow-atlas.png', optimize=True)

for f in ('smoke-atlas.png', 'glow-atlas.png'):
    print(f, f'{(OUT / f).stat().st_size / 1024:.0f} KB')
