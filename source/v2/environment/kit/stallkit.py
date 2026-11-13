"""Common festival stall frame (R04): counter, posts, sloped striped awning, scalloped valance,
lantern arms, back shelf. Every env_stall_<kind> build.py calls stall_frame() and then adds its
own game props on the counter. Proportions follow festival.png: chunky timber, thick counter top,
awning lower at the front, two-tone stripes, rounded edges everywhere.

Game coordinates: origin = footprint centre on the ground, +Z = customer side (front), metres.
The collider is the w x d footprint (shared/world.mjs STALLS); only the awning and lantern arms
reach past it, above head height.
"""
import math
from kitlib import box, cyl, grid, sphere, torus

WOOD = '#ffffff'      # natural cedar (texture colour)
TIMBER = '#8c6a55'    # darker posts and beams
DARK = '#5b4334'
CREAM = '#f1e2c4'
GOLD = '#d9a94e'
ROPE = '#d8c39a'

COUNTER_DEPTH = 1.5
COUNTER_H = 1.05


def counter_z(d):
    return d / 2 - COUNTER_DEPTH / 2


def stall_frame(B, w, d, color, accent=CREAM, apron=True):
    cz = counter_z(d)
    # --- counter: plank facade, thick top, kick board, side panels
    planks = max(10, int(w / .3))
    pw = w / planks
    for i in range(planks):
        x = -w / 2 + (i + .5) * pw
        h = COUNTER_H - .1 + ((i * 37) % 5) * .006
        box(B, 'kit_wood', WOOD, x, h / 2 + .05, d / 2 - .03, pw - .012, h, .06, bevel=.012, grain='y')
    box(B, 'kit_wood', TIMBER, 0, .45, cz, w - .08, .9, COUNTER_DEPTH - .1, bevel=.02)
    box(B, 'kit_wood', DARK, 0, .05, d / 2 - .02, w + .02, .1, .1, bevel=.02)
    box(B, 'kit_wood', TIMBER, 0, COUNTER_H + .04, cz + .03, w + .18, .09, COUNTER_DEPTH + .14, bevel=.03, segs=2)
    for s in (-1, 1):
        box(B, 'kit_wood', WOOD, s * (w / 2 - .02), COUNTER_H / 2, cz, .06, COUNTER_H - .05, COUNTER_DEPTH - .02, bevel=.015, grain='z')
    if apron:
        # short patterned cloth across the facade, tied at the posts
        aw = w - .5
        def apron_fn(u, v):
            x = -aw / 2 + u * aw
            sag = math.sin(u * math.pi) * .035
            y = .98 - v * .42 - sag * (1 - v)
            return (x, y, d / 2 + .015 + .02 * math.sin(u * math.pi))
        grid(B, 'kit_cloth', color, apron_fn, 18, 3, tile=.9)
        for s in (-1, 1):
            sphere(B, 'kit_paint', ROPE, s * aw / 2, .97, d / 2 + .03, .05)
    # --- posts (front shorter -> awning slopes to the customers)
    front_h, back_h = 2.95, 3.45
    for sx in (-1, 1):
        for sz, h in ((1, front_h), (-1, back_h)):
            x, z = sx * (w / 2 - .07), sz * (d / 2 - .07)
            box(B, 'kit_wood', TIMBER, x, h / 2, z, .14, h, .14, bevel=.025, segs=2, grain='y')
            box(B, 'kit_wood', DARK, x, .06, z, .2, .12, .2, bevel=.02)
    # beams
    box(B, 'kit_wood', TIMBER, 0, front_h - .08, d / 2 - .07, w + .34, .15, .15, bevel=.03, segs=2)
    box(B, 'kit_wood', TIMBER, 0, back_h - .08, -d / 2 + .07, w + .34, .15, .15, bevel=.03, segs=2)
    slope = math.atan2(back_h - front_h, d - .14)
    for sx in (-1, 1):
        box(B, 'kit_wood', TIMBER, sx * (w / 2 - .07), (front_h + back_h) / 2 - .08, 0, .12, .12, math.hypot(d - .14, back_h - front_h) + .2, bevel=.025, rot=(slope, 0, 0), grain='z')
    # rafters under the cloth
    raft = 5
    for i in range(raft):
        x = -w / 2 + .2 + i * (w - .4) / (raft - 1)
        box(B, 'kit_wood', WOOD, x, (front_h + back_h) / 2 + .02, 0, .06, .07, math.hypot(d + .7, back_h - front_h), bevel=.012, rot=(slope, 0, 0), grain='z')
    # --- awning: striped cloth sagging between rafters, overhangs the counter
    zf, zb = d / 2 + .55, -d / 2 - .25
    yf, yb = front_h + .02, back_h + .1
    stripes = 8
    ow = w + .5
    for k in range(stripes):
        u0, u1 = k / stripes, (k + 1) / stripes
        col = color if k % 2 == 0 else accent

        def roof_fn(u, v, u0=u0, u1=u1):
            uu = u0 + (u1 - u0) * u
            x = -ow / 2 + uu * ow
            z = zb + (zf - zb) * v
            y = yb + (yf - yb) * v
            y -= .07 * abs(math.sin(uu * math.pi * (raft - 1)))  # sag between rafters
            y += .05 * math.sin(v * math.pi)                        # gentle belly
            return (x, y + .07, z)
        grid(B, 'kit_cloth', col, roof_fn, 3, 10, tile=1.2, double=True)
    # scalloped valance hanging from the front edge
    scallops = int(ow / .42)

    def val_fn(u, v):
        x = -ow / 2 + u * ow
        hem = .30 + .07 * abs(math.cos(u * scallops * math.pi))
        y = yf + .07 - v * hem
        return (x, y, zf + .015)
    grid(B, 'kit_cloth', color, val_fn, scallops * 4, 2, tile=.9, double=True)
    # valance trim and tassels
    box(B, 'kit_paint', GOLD, 0, yf + .07, zf + .03, ow + .04, .05, .05, bevel=.015)
    for s in (-1, 1):
        cyl(B, 'kit_paint', GOLD, s * (ow / 2), yf - .2, zf + .03, .035, .28, segs=8, r2=.012)
        sphere(B, 'kit_paint', '#c7513f', s * (ow / 2), yf - .03, zf + .03, .055)
    # lantern arms (runtime hangs env_lantern_paper at x=+-(w/2-.1), y=2.04, z=d/2+.57)
    for s in (-1, 1):
        x = s * (w / 2 - .1)
        box(B, 'kit_wood', DARK, x, 2.62, d / 2 + .25, .05, .05, .7, bevel=.01, grain='z')
        cyl(B, 'kit_paint', ROPE, x, 2.43, d / 2 + .57, .008, .36, segs=5)
    # --- back of the stall: low shelf with crates
    box(B, 'kit_wood', TIMBER, 0, .55, -d / 2 + .3, w - .3, .06, .45, bevel=.015)
    box(B, 'kit_wood', TIMBER, 0, 1.15, -d / 2 + .3, w - .3, .06, .45, bevel=.015)
    for s in (-1, 1):
        box(B, 'kit_wood', TIMBER, s * (w / 2 - .25), .6, -d / 2 + .3, .06, 1.2, .45, bevel=.012)
    return {'counter_top': COUNTER_H + .09, 'counter_z': cz, 'front_h': front_h, 'back_h': back_h}


def crate(B, x, y, z, s=.4, color='#c99e72'):
    box(B, 'kit_wood', color, x, y + s * .35, z, s, s * .7, s * .75, bevel=.015)
    box(B, 'kit_wood', DARK, x, y + s * .55, z + s * .38, s * 1.02, .04, .02, bevel=.005)


def stool(B, x, z):
    cyl(B, 'kit_wood', TIMBER, x, .45, z, .2, .06, segs=12)
    for a in range(3):
        ang = a / 3 * math.tau
        box(B, 'kit_wood', DARK, x + math.cos(ang) * .12, .22, z + math.sin(ang) * .12, .04, .44, .04, bevel=.008, grain='y')


def bowl(B, x, y, z, r=.1, color='#f3eee2', rim='#3f6fa0'):
    cyl(B, 'kit_paint', color, x, y + .03, z, r * .65, .06, segs=14, r2=r)
    torus(B, 'kit_paint', rim, x, y + .06, z, r * .96, .008, segs=14, csegs=4)
