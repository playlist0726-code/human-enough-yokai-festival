"""env_stall_fish — Goldfish Scooping stall (R04 hero asset).

Run: .venv-bpy/bin/python source/v2/environment/stall_fish/build.py
Out: public/assets/env/v2/env_stall_fish.glb

Footprint 4.7 x 3.4 m (shared/world.mjs STALLS 'fish'). Blue lacquered goldfish tub with
water (material kit_water, replaced by the runtime water shader), a school of goldfish,
paper scoops (poi), bowls, a goldfish emblem on the apron, crates and a keeper's stool.
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'kit'))
from kitlib import Builder, reset, box, cyl, sphere, torus, grid, finish  # noqa: E402
from stallkit import stall_frame, crate, stool, bowl, GOLD  # noqa: E402

ID = 'env_stall_fish'
W, D = 4.7, 3.4
COLOR = '#2f5f8f'


def goldfish(B, x, y, z, yaw, body='#f2762e', fin='#ffb66b', s=1.0):
    rot = (0, yaw, 0)
    c, sn = math.cos(yaw), math.sin(yaw)
    sphere(B, 'kit_paint', body, x, y, z, .1 * s, .042 * s, .052 * s, segs=8, rings=5, rot=rot)
    # tail: two flattened lobes behind the body
    tx, tz = x - c * .12 * s, z + sn * .12 * s
    for k in (-1, 1):
        sphere(B, 'kit_paint', fin, tx, y + .005, tz, .055 * s, .012 * s, .035 * s, segs=6, rings=3, rot=(0, yaw + k * .55, 0))
    # eye dots
    ex, ez = x + c * .07 * s, z - sn * .07 * s
    sphere(B, 'kit_paint', '#1d1b22', ex, y + .018 * s, ez, .012 * s, segs=5, rings=3)


def build():
    reset()
    B = Builder(ID)
    info = stall_frame(B, W, D, COLOR)
    top, cz = info['counter_top'], info['counter_z']
    # --- goldfish tub: rounded lacquer frame, white inner lip, water surface
    tw, td, th = 3.0, 1.22, .24
    tx, tz = -.25, cz + .02
    y0 = top
    for sx, sz, lx, lz in ((0, 1, tw, .09), (0, -1, tw, .09), (1, 0, .09, td), (-1, 0, .09, td)):
        box(B, 'kit_paint', '#2d6fa3', tx + sx * (tw - .09) / 2, y0 + th / 2, tz + sz * (td - .09) / 2, lx, th, lz, bevel=.03, segs=2)
    # white enamel lip on top of the lacquer frame
    for sx, sz, lx, lz in ((0, 1, tw - .02, .07), (0, -1, tw - .02, .07), (1, 0, .07, td - .02), (-1, 0, .07, td - .02)):
        box(B, 'kit_paint', '#f2ede0', tx + sx * (tw - .09) / 2, y0 + th + .008, tz + sz * (td - .09) / 2, lx, .02, lz, bevel=.008)
    box(B, 'kit_paint', '#2a5f8c', tx, y0 + .03, tz, tw - .1, .06, td - .1, bevel=.01)          # floor
    # water: one quad, the runtime swaps kit_water for the animated shader
    water_y = y0 + th - .035

    def water_fn(u, v):
        return (tx - (tw - .18) / 2 + u * (tw - .18), water_y, tz + (td - .18) / 2 - v * (td - .18))
    grid(B, 'kit_water', '#ffffff', water_fn, 1, 1, tile=2.0)
    # school of goldfish swimming just under the surface (bright enough to read from above)
    fish = [(-1.2, .25, .4, 'o'), (-.8, -.2, 2.6, 'o'), (-.35, .3, -.9, 'r'), (.05, -.25, 1.4, 'o'), (.45, .2, 3.6, 'w'),
            (.85, -.1, .9, 'o'), (1.05, .3, -2.4, 'b'), (-1.0, -.32, -1.8, 'w'), (.25, .02, 2.1, 'o'), (-.55, -.05, .2, 'o')]
    pal = {'o': ('#f2762e', '#ffb66b'), 'r': ('#e04a35', '#f59a74'), 'w': ('#f3ede4', '#ef6a46'), 'b': ('#2b2a35', '#4d4b5a')}
    for fx, fz, yaw, kind in fish:
        goldfish(B, tx + fx, water_y + .014, tz + fz, yaw, *pal[kind], s=1.45)
    # --- poi (paper scoops) on a little tray at the right of the tub
    px, pz = 1.62, cz + .35
    box(B, 'kit_wood', '#a07a5a', px, top + .02, pz, .5, .04, .34, bevel=.01)
    for i in range(4):
        y = top + .05 + i * .025
        torus(B, 'kit_paint', '#e6534a' if i % 2 else '#4a8fc9', px - .05, y, pz, .085, .011, segs=12, csegs=4)
        cyl(B, 'kit_paint', '#f6f2e8', px - .05, y, pz, .08, .004, segs=12)
        box(B, 'kit_paint', '#e6534a' if i % 2 else '#4a8fc9', px + .1, y, pz + .02 * i, .16, .015, .02, bevel=.004, rot=(0, .15 * i, 0))
    # bowls for caught fish
    for i, bx in enumerate((1.45, 1.75, 1.6)):
        bowl(B, bx, top, cz - .3 + (i == 2) * .2, .1)
    # --- goldfish emblem on the apron
    goldfish(B, 0, .76, D / 2 + .07, 0, '#f08a3a', '#ffc37e', s=2.6)
    # --- back: crates, buckets, stool, spare bowls on the shelf
    crate(B, -1.5, 0, -D / 2 + .55, .45)
    crate(B, -1.0, 0, -D / 2 + .6, .38, '#b58a62')
    cyl(B, 'kit_paint', '#3d76a8', 1.4, .2, -D / 2 + .6, .2, .4, segs=14, r2=.23)
    torus(B, 'kit_paint', '#c7c2b5', 1.4, .4, -D / 2 + .6, .225, .012, segs=14, csegs=4)
    stool(B, 1.55, -.95)
    for i in range(5):
        bowl(B, -1.6 + i * .32, 1.18, -D / 2 + .3, .09)
    finish(B, ID)


if __name__ == '__main__':
    build()
