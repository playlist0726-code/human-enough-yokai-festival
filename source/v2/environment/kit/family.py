"""Festival kit family (R04): the five stalls that follow the approved Goldfish hero, the paper
and stone lanterns and the lane flagstones. Each asset folder has a thin build.py that calls
build(<id>) here; run everything with

    .venv-bpy/bin/python source/v2/environment/kit/family.py            # all
    .venv-bpy/bin/python source/v2/environment/kit/family.py env_stall_cook

All stalls share stallkit.stall_frame (same proportions, same materials, same textures).
Game coordinates: +Z = customer side, origin = footprint centre on the ground.
"""
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kitlib import Builder, reset, box, cyl, sphere, torus, grid, lathe, finish  # noqa: E402
from stallkit import stall_frame, crate, stool, bowl, GOLD, CREAM, DARK, TIMBER, WOOD, ROPE  # noqa: E402

RED, GREEN, YELLOW, BLUE, PINK, WHITE, INK = '#d9534a', '#6fae7c', '#e8c35a', '#4a8fc9', '#f0a3b4', '#f6f1e6', '#2a2630'


def plush(B, x, y, z, color, s=1.0, ears='round'):
    sphere(B, 'kit_paint', color, x, y + .16 * s, z, .17 * s, .16 * s, .14 * s, segs=10, rings=6)
    sphere(B, 'kit_paint', color, x, y + .4 * s, z, .14 * s, .13 * s, .12 * s, segs=10, rings=6)
    for k in (-1, 1):
        if ears == 'round':
            sphere(B, 'kit_paint', color, x + k * .1 * s, y + .52 * s, z, .05 * s, segs=6, rings=4)
        else:
            cyl(B, 'kit_paint', color, x + k * .08 * s, y + .56 * s, z, .04 * s, .12 * s, segs=5, r2=.004)
        sphere(B, 'kit_paint', INK, x + k * .05 * s, y + .42 * s, z + .11 * s, .016 * s, segs=5, rings=3)
    sphere(B, 'kit_paint', WHITE, x, y + .36 * s, z + .11 * s, .045 * s, .035 * s, .03 * s, segs=6, rings=4)


def daruma(B, x, y, z, s=1.0, color=RED):
    sphere(B, 'kit_paint', color, x, y + .13 * s, z, .13 * s, .14 * s, .12 * s, segs=10, rings=6)
    sphere(B, 'kit_paint', '#f3e3c8', x, y + .16 * s, z + .085 * s, .075 * s, .06 * s, .05 * s, segs=8, rings=5)
    for k in (-1, 1):
        sphere(B, 'kit_paint', INK, x + k * .03 * s, y + .17 * s, z + .13 * s, .014 * s, segs=5, rings=3)


def bottle(B, x, y, z, color, h=.34, r=.07, cap=GOLD):
    cyl(B, 'kit_paint', color, x, y + h * .4, z, r, h * .8, segs=10)
    cyl(B, 'kit_paint', color, x, y + h * .88, z, r * .45, h * .2, segs=8)
    cyl(B, 'kit_paint', cap, x, y + h, z, r * .55, .04, segs=8)


def emblem_disc(B, x, d, color, inner=CREAM):
    """Round crest on the counter facade, left and right of the play sign."""
    cyl(B, 'kit_paint', inner, x, .62, d / 2 + .05, .2, .03, segs=16, rot=(math.pi / 2, 0, 0))
    torus(B, 'kit_paint', color, x, .62, d / 2 + .065, .2, .018, segs=16, csegs=4, rot=(math.pi / 2, 0, 0))


# ---------------------------------------------------------------- stalls

def stall_shoot():
    w, d, color = 4.5, 3.4, '#b23f55'
    B = Builder('env_stall_shoot')
    info = stall_frame(B, w, d, color)
    top, cz = info['counter_top'], info['counter_z']
    # prize steps behind the counter, red felt on timber
    for i in range(3):
        y, z = 1.25 + i * .46, -.72 - i * .3
        box(B, 'kit_wood', TIMBER, -.75, y - .04, z, 2.7, .08, .34, bevel=.015)
        box(B, 'kit_cloth', '#c9423f', -.75, y + .012, z, 2.6, .025, .3, bevel=.006, tile=.6)
        box(B, 'kit_wood', DARK, -.75, y - .25, z - .12, 2.6, .42, .05, bevel=.01)
    prizes = [(0, -1.8, 'plush', '#e9a15b'), (0, -1.25, 'daruma', RED), (0, -.7, 'plush', '#9fc3e6'), (0, -.15, 'box', YELLOW), (0, .35, 'daruma', '#e9c452'),
              (1, -1.7, 'box', BLUE), (1, -1.15, 'plush', PINK), (1, -.55, 'daruma', RED), (1, .05, 'plush', '#c7e3a6'),
              (2, -1.45, 'plush', '#f1d27a'), (2, -.75, 'box', RED), (2, -.05, 'plush', '#d9b4e8')]
    for row, px, kind, col in prizes:
        y, z = 1.26 + row * .46, -.72 - row * .3
        if kind == 'plush':
            plush(B, px, y, z, col, .62, 'round' if (row + int(px * 4)) % 2 else 'cat')
        elif kind == 'daruma':
            daruma(B, px, y, z, .9, col)
        else:
            box(B, 'kit_paint', col, px, y + .13, z, .26, .26, .2, bevel=.02)
            box(B, 'kit_paint', WHITE, px, y + .13, z, .27, .05, .21, bevel=.005)
    # cork rifles resting on the counter, cork cups
    for i, gx in enumerate((-1.35, -.35, .65)):
        yaw = .25 - i * .1
        box(B, 'kit_wood', '#b5835a', gx, top + .06, cz + .15, .16, .1, .55, bevel=.025, rot=(0, yaw, 0), grain='z')
        cyl(B, 'kit_paint', '#5b6068', gx + math.sin(yaw) * .5, top + .09, cz + .15 + math.cos(yaw) * .5, .028, .62, segs=8, rot=(math.pi / 2, yaw, 0))
        sphere(B, 'kit_wood', '#d8b98a', gx + math.sin(yaw) * .82, top + .09, cz + .15 + math.cos(yaw) * .82, .035, segs=6, rings=4)
    for bx in (1.4, 1.75):
        bowl(B, bx, top, cz + .3, .12, '#e7dcc6', RED)
        for k in range(5):
            cyl(B, 'kit_wood', '#d8b98a', bx + math.cos(k * 1.3) * .05, top + .07, cz + .3 + math.sin(k * 1.3) * .05, .022, .04, segs=6)
    for s in (-1, 1):
        emblem_disc(B, s * 1.5, d, color)
        sphere(B, 'kit_paint', RED, s * 1.5, .62, d / 2 + .075, .07, .07, .02)
    crate(B, 1.55, 0, -d / 2 + .55, .45)
    stool(B, 1.6, -1.0)
    return B


def stall_ring():
    w, d, color = 4.5, 3.3, '#c79a3d'
    B = Builder('env_stall_ring')
    info = stall_frame(B, w, d, color)
    top, cz = info['counter_top'], info['counter_z']
    # sloped green felt board with pegs and prizes
    bx, bz, bw, bd = -.35, cz - .02, 2.9, 1.15
    tilt = -.16
    box(B, 'kit_wood', TIMBER, bx, top + .12, bz, bw + .12, .1, bd + .12, bevel=.02, rot=(tilt, 0, 0))
    box(B, 'kit_cloth', '#3f8a63', bx, top + .18, bz, bw, .03, bd, bevel=.008, rot=(tilt, 0, 0), tile=.5)
    cols = [RED, YELLOW, BLUE, PINK]
    for r in range(3):
        for c in range(5):
            px = bx - 1.15 + c * .575
            pz = bz + .38 - r * .38
            py = top + .2 + (-(pz - bz)) * math.tan(-tilt)
            cyl(B, 'kit_wood', '#e7cfa3', px, py + .13, pz, .028, .26, segs=8)
            cyl(B, 'kit_paint', cols[(r + c) % 4], px, py + .015, pz, .09, .03, segs=12)
            if (r * 5 + c) % 4 == 0:
                torus(B, 'kit_paint', cols[(c + 1) % 4], px, py + .05, pz, .12, .016, segs=14, csegs=5)
            if (r * 5 + c) % 5 == 2:
                daruma(B, px + .17, py, pz + .02, .55, cols[c % 4])
    # stack of hoops and a hanging row under the beam
    for i in range(6):
        torus(B, 'kit_paint', cols[i % 4], 1.65, top + .03 + i * .03, cz + .3, .13, .016, segs=14, csegs=5)
    for i in range(7):
        x = -1.5 + i * .5
        cyl(B, 'kit_paint', ROPE, x, 2.62, d / 2 - .1, .006, .3, segs=4)
        torus(B, 'kit_paint', cols[i % 4], x, 2.36, d / 2 - .1, .12, .015, segs=14, csegs=5, rot=(math.pi / 2, 0, 0))
    for s in (-1, 1):
        emblem_disc(B, s * 1.5, d, color)
        torus(B, 'kit_paint', RED, s * 1.5, .62, d / 2 + .075, .09, .02, segs=14, csegs=4, rot=(math.pi / 2, 0, 0))
    plush(B, 1.5, 1.18, -d / 2 + .3, '#f1d27a', .7)
    plush(B, -1.5, 1.18, -d / 2 + .3, '#9fc3e6', .7, 'cat')
    crate(B, -1.45, 0, -d / 2 + .6, .42)
    stool(B, 1.55, -.95)
    return B


def stall_cook():
    w, d, color = 4.7, 3.4, '#b95a36'
    B = Builder('env_stall_cook')
    info = stall_frame(B, w, d, color)
    top, cz = info['counter_top'], info['counter_z']
    # cast-iron takoyaki griddle on a brick-red burner box
    gx, gz, gw, gd = -.45, cz + .02, 2.7, 1.1
    box(B, 'kit_paint', '#7c3f33', gx, top + .08, gz, gw + .1, .16, gd + .1, bevel=.03)
    box(B, 'kit_paint', '#2b2d33', gx, top + .19, gz, gw, .07, gd, bevel=.02)
    for r in range(4):
        for c in range(9):
            x, z = gx - gw / 2 + .17 + c * (gw - .34) / 8, gz - gd / 2 + .16 + r * (gd - .32) / 3
            cyl(B, 'kit_paint', '#17181c', x, top + .226, z, .105, .012, segs=10)
            if (r * 9 + c) % 7 != 3:
                done = (r + c) % 3
                sphere(B, 'kit_paint', ['#e0a04e', '#c98338', '#f0c070'][done], x, top + .27, z, .095, .08, .095, segs=8, rings=5)
                if done == 1:
                    sphere(B, 'kit_paint', '#5a2f1c', x, top + .335, z, .06, .012, .06, segs=6, rings=3)   # sauce
                    sphere(B, 'kit_paint', '#7fae5a', x + .02, top + .35, z, .025, .006, .02, segs=5, rings=3)  # aonori
    # picks, sauce bottles, brush pot, paper boats
    for i, col in enumerate(['#6b3a22', '#f2e3b0', '#d4523e']):
        bottle(B, 1.3 + i * .2, top, cz + .42, col, .32, .065, RED if i != 2 else WHITE)
    cyl(B, 'kit_paint', '#3d76a8', 1.85, top + .08, cz + .42, .07, .16, segs=10)
    for k in range(4):
        cyl(B, 'kit_wood', '#e7cfa3', 1.85 + math.cos(k * 1.7) * .03, top + .22, cz + .42 + math.sin(k * 1.7) * .03, .006, .22, segs=4)
    for i in range(3):
        x, z = 1.25 + i * .33, cz - .2
        box(B, 'kit_wood', '#e9d5ac', x, top + .03, z, .3, .05, .16, bevel=.02)
        for k in range(3):
            sphere(B, 'kit_paint', '#c98338', x - .09 + k * .09, top + .09, z, .05, .045, .05, segs=6, rings=4)
            sphere(B, 'kit_paint', '#5a2f1c', x - .09 + k * .09, top + .125, z, .035, .008, .035, segs=5, rings=3)
    # octopus mascot on the front beam
    ox, oy, oz = -1.55, info['front_h'] + .38, d / 2 + .1
    sphere(B, 'kit_paint', '#e0574b', ox, oy, oz, .27, .25, .25, segs=12, rings=8)
    for k in range(6):
        a = -1.2 + k * .48
        sphere(B, 'kit_paint', '#e0574b', ox + math.sin(a) * .26, oy - .24, oz + .08 + math.cos(a) * .1, .075, .1, .075, segs=6, rings=4)
    for k in (-1, 1):
        sphere(B, 'kit_paint', WHITE, ox + k * .1, oy + .04, oz + .21, .055, segs=6, rings=4)
        sphere(B, 'kit_paint', INK, ox + k * .1, oy + .04, oz + .255, .026, segs=5, rings=3)
    torus(B, 'kit_cloth', WHITE, ox, oy + .17, oz, .25, .03, segs=14, csegs=5)  # hachimaki
    for s in (-1, 1):
        emblem_disc(B, s * 1.55, d, color)
        sphere(B, 'kit_paint', '#e0a04e', s * 1.55, .62, d / 2 + .075, .09, .09, .03)
    # gas bottle, flour sacks
    cyl(B, 'kit_paint', '#9aa3ad', -1.7, .35, -d / 2 + .6, .17, .7, segs=12)
    sphere(B, 'kit_paint', '#9aa3ad', -1.7, .7, -d / 2 + .6, .17, .1, .17, segs=12, rings=4)
    for i in range(2):
        sphere(B, 'kit_cloth', '#e6d9bd', 1.4 + i * .45, .16 + i * .02, -d / 2 + .62, .26, .17, .2, segs=8, rings=5)
    stool(B, 1.6, -1.0)
    return B


def stall_fortune():
    w, d, color = 4.4, 3.5, '#b0707a'
    B = Builder('env_stall_fortune')
    info = stall_frame(B, w, d, color)
    top, cz = info['counter_top'], info['counter_z']
    # hexagonal omikuji shaker on a red cushion
    box(B, 'kit_cloth', '#c9423f', -.9, top + .04, cz + .1, .7, .08, .6, bevel=.035, segs=2, tile=.5)
    cyl(B, 'kit_wood', '#c99e72', -.9, top + .36, cz + .1, .2, .56, segs=6, smooth=False)
    cyl(B, 'kit_paint', GOLD, -.9, top + .12, cz + .1, .215, .05, segs=6, smooth=False)
    cyl(B, 'kit_paint', GOLD, -.9, top + .6, cz + .1, .215, .05, segs=6, smooth=False)
    cyl(B, 'kit_paint', INK, -.9, top + .645, cz + .1, .03, .01, segs=8)
    for k in range(3):
        cyl(B, 'kit_wood', '#ecd9b0', -.9 + (k - 1) * .02, top + .74, cz + .1, .008, .22, segs=4, rot=(.1 * (k - 1), 0, .12 * (k - 1)))
    # drawer chest of fortunes
    box(B, 'kit_wood', TIMBER, .45, top + .3, cz - .2, 1.3, .6, .5, bevel=.02)
    for r in range(3):
        for c in range(5):
            x, y = .45 - .52 + c * .26, top + .11 + r * .19
            box(B, 'kit_wood', WOOD, x, y, cz + .06, .23, .16, .03, bevel=.01)
            sphere(B, 'kit_paint', GOLD, x, y, cz + .085, .018, segs=5, rings=3)
    # daruma row and lucky cat
    for i, col in enumerate([RED, '#e9c452', '#f0a3b4']):
        daruma(B, 1.35 + i * .27, top, cz + .42, .85 - i * .12, col)
    plush(B, -1.7, top, cz + .15, WHITE, .8, 'cat')
    sphere(B, 'kit_paint', GOLD, -1.7, top + .2, cz + .28, .035)
    # charm rack: bar with hanging omamori and ema plaques under the front beam
    cyl(B, 'kit_wood', DARK, 0, 2.66, d / 2 - .12, .025, w - .6, segs=6, rot=(0, 0, math.pi / 2))
    cols = [RED, '#6c57a8', YELLOW, GREEN, PINK, BLUE]
    n = 11
    for i in range(n):
        x = -(w - 1.0) / 2 + i * (w - 1.0) / (n - 1)
        if abs(x) < 1.3:
            continue  # leave the name sign clear
        cyl(B, 'kit_paint', ROPE, x, 2.55, d / 2 - .12, .005, .2, segs=4)
        if i % 2:
            box(B, 'kit_cloth', cols[i % 6], x, 2.36, d / 2 - .12, .12, .2, .03, bevel=.012, tile=.3)
            sphere(B, 'kit_paint', GOLD, x, 2.47, d / 2 - .1, .018, segs=5, rings=3)
        else:
            box(B, 'kit_wood', '#e2c08f', x, 2.36, d / 2 - .12, .2, .15, .02, bevel=.008, rot=(0, 0, .06))
    for s in (-1, 1):
        emblem_disc(B, s * 1.45, d, color)
        box(B, 'kit_paint', '#6c57a8', s * 1.45, .62, d / 2 + .075, .12, .12, .02, bevel=.005, rot=(0, 0, math.pi / 4))
    crate(B, 1.45, 0, -d / 2 + .6, .45)
    crate(B, -1.5, 0, -d / 2 + .6, .4, '#b58a62')
    stool(B, 1.5, -1.0)
    return B


def stall_ice():
    w, d, color = 4.6, 3.5, '#4f86ab'
    B = Builder('env_stall_ice')
    info = stall_frame(B, w, d, color)
    top, cz = info['counter_top'], info['counter_z']
    # hand-cranked kakigori shaver
    sx, sz = -.95, cz + .02
    teal = '#4fa3a0'
    box(B, 'kit_paint', teal, sx, top + .05, sz, .78, .1, .7, bevel=.03)
    for k in (-1, 1):
        box(B, 'kit_paint', teal, sx + k * .32, top + .5, sz - .2, .09, .9, .12, bevel=.025)
    box(B, 'kit_paint', teal, sx, top + .95, sz - .1, .82, .12, .42, bevel=.035)
    box(B, 'kit_paint', '#cfeef2', sx, top + .62, sz - .02, .36, .32, .36, bevel=.03)      # ice block
    cyl(B, 'kit_paint', '#c9ced6', sx, top + .83, sz - .02, .2, .04, segs=12)             # press plate
    cyl(B, 'kit_paint', '#c9ced6', sx, top + 1.08, sz - .02, .03, .4, segs=8)             # screw
    torus(B, 'kit_paint', '#d6584c', sx + .52, top + .72, sz - .02, .22, .028, segs=16, csegs=5, rot=(0, 0, math.pi / 2))  # crank wheel
    cyl(B, 'kit_paint', '#c9ced6', sx + .44, top + .72, sz - .02, .025, .18, segs=6, rot=(0, 0, math.pi / 2))
    cyl(B, 'kit_wood', '#e7cfa3', sx + .56, top + .92, sz - .02, .03, .12, segs=6, rot=(0, 0, math.pi / 2))
    bowl(B, sx, top + .1, sz + .05, .15, '#dff2f4', BLUE)
    sphere(B, 'kit_paint', WHITE, sx, top + .24, sz + .05, .13, .12, .13, segs=10, rings=6)
    # finished bowls with syrup
    for i, col in enumerate([RED, '#7fc46a', '#f0c84a']):
        x = .15 + i * .42
        bowl(B, x, top, cz + .32, .14, '#dff2f4', BLUE)
        sphere(B, 'kit_paint', WHITE, x, top + .14, cz + .32, .125, .12, .125, segs=10, rings=6)
        sphere(B, 'kit_paint', col, x, top + .2, cz + .32, .1, .075, .1, segs=8, rings=5)
    # syrup bottles in a rack
    box(B, 'kit_wood', TIMBER, 1.45, top + .04, cz - .25, 1.0, .08, .3, bevel=.015)
    for i, col in enumerate([RED, '#7fc46a', '#f0c84a', '#5aa0e0', '#b06fd0']):
        bottle(B, 1.05 + i * .2, top + .08, cz - .25, col, .4, .07, WHITE)
    # ice flag: white banner, blue waves, red sun
    fx, fy, fz = w / 2 + .12, 2.2, d / 2 + .1
    cyl(B, 'kit_wood', DARK, fx - .02, fy + .42, fz, .012, .5, segs=5, rot=(0, 0, math.pi / 2))

    def flag_fn(u, v):
        return (fx - .24 + u * .46, fy + .4 - v * .8, fz + .03 * math.sin(v * 5) * v)
    grid(B, 'kit_cloth', WHITE, flag_fn, 4, 8, tile=.5, double=True)
    cyl(B, 'kit_paint', RED, fx, fy + .12, fz + .035, .12, .012, segs=14, rot=(math.pi / 2, 0, 0))
    for k in range(3):
        box(B, 'kit_paint', '#3f7fc0', fx, fy - .2 - k * .07, fz + .04, .4, .03, .012, bevel=.004, rot=(0, 0, .12 if k % 2 else -.12))
    for s in (-1, 1):
        emblem_disc(B, s * 1.5, d, color)
        sphere(B, 'kit_paint', '#cfeef2', s * 1.5, .62, d / 2 + .075, .09, .09, .03)
    # cooler box and ice blocks at the back
    box(B, 'kit_paint', '#e9f3f5', -1.45, .28, -d / 2 + .6, .8, .55, .5, bevel=.04)
    box(B, 'kit_paint', '#4f86ab', -1.45, .58, -d / 2 + .6, .84, .08, .54, bevel=.03)
    crate(B, 1.45, 0, -d / 2 + .6, .45)
    stool(B, 1.55, -1.0)
    return B


# ---------------------------------------------------------------- lanterns

LANTERN_CENTER = .62   # body centre above the tassel tip (runtime hangs it by this)


def lantern_paper():
    """Chochin: ribbed paper body (kit_glow, param UVs: u around, v up), dark caps, ring, tassel. Min Y = 0."""
    B = Builder('env_lantern_paper')
    c = LANTERN_CENTER
    n = 18
    prof = []
    for i in range(n + 1):
        t = i / n
        r = .115 + math.sin(math.pi * t) * .205 + (.008 if i % 2 else -.004)
        prof.append((r, (t - .5) * .72))
    lathe(B, 'kit_glow', '#ffffff', 0, c, 0, prof, segs=16, uv=(1, 1))
    for s in (-1, 1):
        cyl(B, 'kit_paint', '#2c2428', 0, c + s * .385, 0, .135, .07, segs=12)
        torus(B, 'kit_paint', GOLD, 0, c + s * .35, 0, .13, .012, segs=12, csegs=4)
    torus(B, 'kit_paint', '#2c2428', 0, c + .47, 0, .05, .01, segs=10, csegs=4, rot=(math.pi / 2, 0, 0))
    cyl(B, 'kit_paint', '#c7423a', 0, c - .45, 0, .012, .08, segs=5)
    sphere(B, 'kit_paint', GOLD, 0, c - .48, 0, .03, segs=6, rings=4)
    cyl(B, 'kit_paint', '#c7423a', 0, .065, 0, .034, .13, segs=7, r2=.018)
    return B


def lantern_stone():
    """Toro: mossy base, post, firebox with glowing paper windows, pyramid roof, finial. 0.6 m footprint."""
    B = Builder('env_lantern_stone')
    st, st2 = '#d9cdb8', '#c4b8a4'
    box(B, 'kit_stone', st2, 0, .09, 0, .62, .18, .62, bevel=.04, segs=2, tile=1.1)
    box(B, 'kit_stone', st, 0, .23, 0, .46, .1, .46, bevel=.03, tile=1.1)
    cyl(B, 'kit_stone', st, 0, .62, 0, .15, .7, segs=10, r2=.115, tile=1.1)
    box(B, 'kit_stone', st2, 0, 1.01, 0, .54, .1, .54, bevel=.035, segs=2, tile=1.1)
    # firebox: stone corner posts, glowing windows with a cross bar
    box(B, 'kit_glow', '#ffffff', 0, 1.26, 0, .3, .38, .3, bevel=.0, tile=.504)  # v = 0.5 (brightest) at the window centre
    for sx in (-1, 1):
        for sz in (-1, 1):
            box(B, 'kit_stone', st, sx * .17, 1.26, sz * .17, .07, .42, .07, bevel=.015, tile=1.1, grain='y')
    for a in range(4):
        rot = (0, a * math.pi / 2, 0)
        dx, dz = math.sin(a * math.pi / 2) * .158, math.cos(a * math.pi / 2) * .158
        box(B, 'kit_stone', st2, dx, 1.26, dz, .28, .03, .02, bevel=.004, rot=rot, tile=1.1)
        box(B, 'kit_stone', st2, dx, 1.26, dz, .03, .36, .02, bevel=.004, rot=rot, tile=1.1)
    # roof: low pyramid with upturned eaves
    cyl(B, 'kit_stone', st2, 0, 1.6, 0, .5, .26, segs=4, r2=.1, smooth=False, rot=(0, math.pi / 4, 0), tile=1.1)
    box(B, 'kit_stone', st, 0, 1.47, 0, .72, .05, .72, bevel=.02, tile=1.1)
    sphere(B, 'kit_stone', st, 0, 1.8, 0, .085, .1, .085, segs=8, rings=5)
    # moss clumps on base and roof
    for x, y, z, r in ((.2, .2, .22, .1), (-.24, .19, -.1, .08), (.18, 1.52, -.2, .09), (-.2, 1.5, .22, .07)):
        sphere(B, 'kit_stone', '#5d7a48', x, y, z, r, r * .45, r, segs=6, rings=4)
    return B


# ---------------------------------------------------------------- lane flagstones

TILE_W, TILE_D, TILE_H = .91, .77, .09


def path_tiles():
    """Four flagstone variants (nodes tile_a..tile_d): uneven tops, chipped corners, worn edges."""
    import bmesh
    from mathutils import Vector
    objs = []
    rng = random.Random(7)
    tints = ['#fff6e6', '#f3e6d0', '#fffaf0', '#ecdfca', '#f8ecd8']
    for k, name in enumerate('abcd'):  # prop profile allows 4 primitives; runtime adds 180-degree turns and tints
        B = Builder(f'tile_{name}')
        b = bmesh.new()
        bmesh.ops.create_grid(b, x_segments=4, y_segments=4, size=.5)
        # grid in XY -> stone slab: scale, extrude down, jitter outline and top
        for v in b.verts:
            v.co.x *= TILE_W
            v.co.y *= TILE_D
            edge = abs(abs(v.co.x) - TILE_W / 2) < 1e-4 or abs(abs(v.co.y) - TILE_D / 2) < 1e-4
            corner = abs(abs(v.co.x) - TILE_W / 2) < 1e-4 and abs(abs(v.co.y) - TILE_D / 2) < 1e-4
            if corner:
                chip = rng.uniform(.03, .1)
                v.co.x -= math.copysign(chip, v.co.x)
                v.co.y -= math.copysign(chip * rng.uniform(.5, 1), v.co.y)
            elif edge:
                v.co.x += rng.uniform(-.018, .018)
                v.co.y += rng.uniform(-.018, .018)
            v.co.z = TILE_H + (rng.uniform(-.012, .012) if not edge else rng.uniform(-.03, -.012))
        ext = bmesh.ops.extrude_face_region(b, geom=list(b.faces))
        skirt = [e for e in ext['geom'] if isinstance(e, bmesh.types.BMVert)]
        for v in skirt:
            v.co.z = 0
            v.co.x *= 1.03
            v.co.y *= 1.03
        bmesh.ops.recalc_face_normals(b, faces=b.faces)
        # blender (x, y, z-up) -> game (x, up, front): y_game = z, z_game = -y
        for v in b.verts:
            v.co = Vector((v.co.x, v.co.z, -v.co.y))
        for f in b.faces:
            f.smooth = False
        B.add(b, 'kit_stone', tints[k], tile=1.3)
        objs.append(B.build())
    return objs


BUILDERS = {
    'env_stall_shoot': stall_shoot, 'env_stall_ring': stall_ring, 'env_stall_cook': stall_cook,
    'env_stall_fortune': stall_fortune, 'env_stall_ice': stall_ice,
    'env_lantern_paper': lantern_paper, 'env_lantern_stone': lantern_stone, 'env_path_tiles': path_tiles,
}


def build(asset_id):
    reset()
    finish(BUILDERS[asset_id](), asset_id)


if __name__ == '__main__':
    for a in (sys.argv[1:] or list(BUILDERS)):
        build(a)
