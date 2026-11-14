"""Festival kit, second family (R04 part 2): torii, Spirit Gate, shrine hall, fence, trees, bamboo,
rocks, nobori banner, drum tower (yagura) and street clutter. Same rules as family.py: game
coordinates (+Z = front, origin on the ground), shared kit_* materials, colour from vertex colours.

    .venv-bpy/bin/python source/v2/environment/kit/family2.py            # all
    .venv-bpy/bin/python source/v2/environment/kit/family2.py env_torii
"""
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa: E402,F401
import bmesh  # noqa: E402
from mathutils import Vector, noise  # noqa: E402
from kitlib import Builder, reset, box, cyl, sphere, torus, grid, finish  # noqa: E402
from stallkit import GOLD, CREAM, DARK, TIMBER, WOOD, ROPE  # noqa: E402

VERMILION, VERM_DARK, LACQUER, SLATE, SLATE_L = '#d2442f', '#a83424', '#2a2428', '#2c3a4c', '#3d4f66'
STONE, STONE_D, MOSS, WHITE, RED = '#ddd0ba', '#c2b6a2', '#5d7a48', '#f6f1e6', '#d9534a'


# ---------------------------------------------------------------- shared parts

def curved_beam(B, mat, color, length, y, thick, depth, rise, z=0, power=2.2, segs=14, bevel=.03, tile=None):
    """Beam along X whose ends sweep up (kasagi). Built from short rotated boxes."""
    for i in range(segs):
        u0, u1 = i / segs * 2 - 1, (i + 1) / segs * 2 - 1
        x0, x1 = u0 * length / 2, u1 * length / 2
        y0, y1 = y + rise * abs(u0) ** power, y + rise * abs(u1) ** power
        a = math.atan2(y1 - y0, x1 - x0)
        box(B, mat, color, (x0 + x1) / 2, (y0 + y1) / 2, z, math.hypot(x1 - x0, y1 - y0) * 1.04, thick, depth, bevel=bevel, rot=(0, 0, a), tile=tile)


def rope(B, x0, x1, y, z, sag=.35, r=.055, segs=12, color=ROPE, shide=3, tassels=True):
    """Shimenawa: sagging straw rope with zig-zag paper streamers and straw tassels."""
    pts = [(x0 + (x1 - x0) * i / segs, y - sag * math.sin(math.pi * i / segs)) for i in range(segs + 1)]
    for (ax, ay), (bx, by) in zip(pts, pts[1:]):
        a = math.atan2(by - ay, bx - ax)
        cyl(B, 'kit_cloth', color, (ax + bx) / 2, (ay + by) / 2, z, r, math.hypot(bx - ax, by - ay) * 1.08, segs=7, rot=(0, 0, a - math.pi / 2), tile=.25)
    for k in range(shide):
        t = (k + 1) / (shide + 1)
        x, yy = x0 + (x1 - x0) * t, y - sag * math.sin(math.pi * t) - r
        for j in range(3):
            box(B, 'kit_cloth', WHITE, x + (.05 if j % 2 else -.05), yy - .1 - j * .16, z + .02, .15, .18, .012, bevel=.0, rot=(0, 0, .25 if j % 2 else -.25), tile=.4)
    if tassels:
        for t in (.25, .75):
            x, yy = x0 + (x1 - x0) * t, y - sag * math.sin(math.pi * t) - r
            cyl(B, 'kit_cloth', color, x, yy - .18, z, .03, .36, segs=6, r2=.075, tile=.25)


def hip_roof(B, w, d, y, rise, color=SLATE, upturn=.4, nu=14, nv=12, ridge=True):
    """Curved hip roof with upturned eaves, thick edge, gold ridge and corner tips."""
    def fn(u, v):
        a, b = u * 2 - 1, v * 2 - 1
        edge = max(abs(a), abs(b))
        return (a * w / 2, y + rise * (1 - edge) ** 1.25 + upturn * edge ** 6 * (abs(a) * abs(b)) ** .6 + .05 * edge ** 3, b * d / 2)
    grid(B, 'kit_paint', color, fn, nu, nv, tile=.7, double=True, flip=True)
    # tile ribs running down the slope
    for i in range(1, nu):
        a = i / nu * 2 - 1
        for sgn in (-1, 1):
            edge0 = abs(a)
            y0, y1 = fn(i / nu, .5 + sgn * edge0 / 2 if edge0 < 1 else .5)[1], fn(i / nu, .5 + sgn * .5)[1]
            z0, z1 = sgn * edge0 * d / 2, sgn * d / 2
            L = math.hypot(z1 - z0, y1 - y0)
            if L < .3:
                continue
            box(B, 'kit_paint', SLATE_L, a * w / 2, (y0 + y1) / 2 + .05, (z0 + z1) / 2, .07, .06, L, bevel=.015, rot=(-math.atan2(y1 - y0, z1 - z0), 0, 0), tile=.7)
    # eave boards
    for sgn in (-1, 1):
        box(B, 'kit_paint', VERM_DARK, 0, y + .0, sgn * (d / 2 - .12), w - .5, .14, .12, bevel=.02)
        box(B, 'kit_paint', VERM_DARK, sgn * (w / 2 - .12), y + .0, 0, .12, .14, d - .5, bevel=.02)
    if ridge:
        rl = max(.6, w - d) + .9
        box(B, 'kit_paint', LACQUER, 0, y + rise + .1, 0, rl, .26, .34, bevel=.05, segs=2)
        for sgn in (-1, 1):
            sphere(B, 'kit_paint', GOLD, sgn * rl / 2, y + rise + .2, 0, .2, .26, .2, segs=8, rings=5)
    for sx in (-1, 1):
        for sz in (-1, 1):
            cx, cy, cz = fn((sx + 1) / 2, (sz + 1) / 2)
            sphere(B, 'kit_paint', GOLD, cx, cy + .05, cz, .1, .1, .1, segs=6, rings=4)


def post(B, x, z, base_y, h, r=.2, r_top=None, lean=0, ring=True, stone=True):
    """Vermilion round post with stone plinth, black lacquer foot and gold bands."""
    if stone:
        cyl(B, 'kit_stone', STONE_D, x, base_y + .09, z, r * 1.75, .18, segs=12, tile=1.1)
    cyl(B, 'kit_paint', VERMILION, x - math.sin(lean) * h / 2, base_y + .18 + h / 2, z, r, h, segs=14, r2=r_top or r * .8, rot=(0, 0, lean), tile=1.2)
    cyl(B, 'kit_paint', LACQUER, x, base_y + .45, z, r * 1.12, .55, segs=14, r2=r * 1.06)
    if ring:
        cyl(B, 'kit_paint', GOLD, x, base_y + .74, z, r * 1.1, .05, segs=14)


# ---------------------------------------------------------------- torii

def torii():
    """Myojin torii, nominal width 6.8 m (posts at +-2.924, matches DECOR_COLLIDERS w*0.43)."""
    w = 6.8
    B = Builder('env_torii')
    for s in (-1, 1):
        post(B, s * w * .43, 0, 0, 4.25, r=.2, r_top=.155, lean=s * .022)
        for dz in (-1, 1):  # wedges through the tie beam
            box(B, 'kit_paint', GOLD, s * (w * .43 - .02), 3.36, dz * .17, .12, .1, .08, bevel=.015)
    box(B, 'kit_paint', VERMILION, 0, 3.35, 0, w * .98, .2, .26, bevel=.03, tile=1.2)
    box(B, 'kit_paint', LACQUER, 0, 3.74, 0, .52, .62, .12, bevel=.03)
    box(B, 'kit_paint', GOLD, 0, 3.74, .05, .4, .5, .06, bevel=.02)
    curved_beam(B, 'kit_paint', VERMILION, w * 1.1, 4.1, .24, .34, .2, tile=1.2)
    curved_beam(B, 'kit_paint', VERMILION, w * 1.22, 4.36, .22, .46, .3, tile=1.2)
    curved_beam(B, 'kit_paint', SLATE, w * 1.25, 4.5, .09, .56, .31, bevel=.02)
    rope(B, -w * .4, w * .4, 3.18, .14, sag=.32)
    return B


# ---------------------------------------------------------------- Spirit Gate (summit)

def gate_spirit():
    """Summit gate: stepped stone terrace, grand four-legged torii, rope, offering box, lantern plinths.
    The portal plane, name sign and paper lanterns stay runtime objects (festival.mjs)."""
    B = Builder('env_gate_spirit')
    for i in range(3):
        box(B, 'kit_stone', STONE if i % 2 else STONE_D, 0, .12 + i * .16, 0, 9 - i * .75, .2, 5 - i * .55, bevel=.04, segs=2, tile=1.6)
    for k in range(3):  # front steps
        box(B, 'kit_stone', STONE, 0, .36 - k * .13, 2.45 + k * .36, 4.8, .16, .42, bevel=.03, tile=1.6)
    top = .54
    for s in (-1, 1):
        post(B, s * 3, 0, top - .18, 4.75, r=.3, r_top=.23, lean=s * .015, stone=True)
        cyl(B, 'kit_paint', GOLD, s * 3, 4.6, 0, .25, .09, segs=14)
        for dz in (-1, 1):  # ryobu-style side legs
            post(B, s * 3, dz * 1.05, top - .18, 2.2, r=.13, r_top=.11, ring=False)
            box(B, 'kit_paint', SLATE, s * 3, top + 2.33, dz * 1.05, .5, .08, .5, bevel=.02)
        box(B, 'kit_paint', VERMILION, s * 3, top + 1.55, 0, .16, .2, 2.4, bevel=.03, tile=1.2)
        box(B, 'kit_paint', VERMILION, s * 3, top + .95, 0, .14, .16, 2.3, bevel=.03, tile=1.2)
        # lantern plinth (runtime hangs a paper lantern at y 1.72 above it)
        box(B, 'kit_stone', STONE_D, s * 4.3, .75, 1.9, .55, 1.1, .55, bevel=.05, segs=2, tile=1.1)
        box(B, 'kit_stone', STONE, s * 4.3, 1.33, 1.9, .7, .08, .7, bevel=.03, tile=1.1)
        sphere(B, 'kit_stone', MOSS, s * 4.3 + .2, .26, 2.12, .16, .08, .16, segs=6, rings=4)
    box(B, 'kit_paint', VERMILION, 0, 4.25, 0, 6.9, .26, .36, bevel=.04, tile=1.2)
    box(B, 'kit_paint', LACQUER, 0, 4.72, 0, .7, .66, .14, bevel=.03)
    box(B, 'kit_paint', GOLD, 0, 4.72, .06, .56, .52, .06, bevel=.02)
    curved_beam(B, 'kit_paint', VERMILION, 7.7, 5.1, .32, .5, .22, tile=1.2)
    curved_beam(B, 'kit_paint', VERMILION, 8.6, 5.42, .28, .64, .36, tile=1.2)
    curved_beam(B, 'kit_paint', SLATE, 8.85, 5.6, .12, .8, .38, bevel=.03)
    for s in (-1, 1):
        sphere(B, 'kit_paint', GOLD, s * 4.42, 6.02, 0, .12, .16, .12, segs=6, rings=4)
    rope(B, -2.75, 2.75, 4.02, .32, sag=.45, r=.085, shide=4)
    # offering box behind the portal
    box(B, 'kit_wood', TIMBER, 0, .95, -1, 2.5, .72, 1.0, bevel=.04)
    for i in range(9):
        box(B, 'kit_wood', DARK, -1.0 + i * .25, 1.33, -1, .1, .05, .9, bevel=.01, grain='z')
    box(B, 'kit_paint', GOLD, 0, .95, -.49, .5, .3, .03, bevel=.01)
    return B


# ---------------------------------------------------------------- shrine hall

def shrine():
    """Main hall behind the gate (placed at scale 1.15): stone podium, steps, vermilion pillars,
    plaster walls, glowing lattice doors, bracket band, big curved roof."""
    B = Builder('env_shrine')
    box(B, 'kit_stone', STONE_D, 0, .3, 0, 7.4, .6, 5.8, bevel=.06, segs=2, tile=1.6)
    for k in range(4):
        box(B, 'kit_stone', STONE, 0, .52 - k * .13, 3.05 + k * .32, 3.8, .16, .4, bevel=.03, tile=1.6)
    for xx in (-3.2, -1.25, 1.25, 3.2):
        for zz in (-2.3, 2.3):
            post(B, xx, zz, .6 - .18, 3.3, r=.16, r_top=.14, stone=False)
    # walls: wood wainscot, white plaster, dark frame
    for (cx, cz, sx, sz) in ((0, -2.3, 6.4, .14), (-3.2, -.55, .14, 3.4), (3.2, -.55, .14, 3.4)):
        box(B, 'kit_wood', TIMBER, cx, 1.15, cz, sx, 1.1, sz, bevel=.02)
        box(B, 'kit_paint', '#efe6d2', cx, 2.75, cz, sx * .98, 2.1, sz * .8, bevel=.01)
        box(B, 'kit_paint', VERM_DARK, cx, 1.75, cz, sx, .12, sz * 1.2, bevel=.02)
    # inner sanctum: glowing paper doors with lattice
    box(B, 'kit_glow', '#ffffff', 0, 2.26, -.9, 3.6, 2.6, .06, bevel=.0, tile=4.52)  # v = 0.5 (brightest) at the door centre
    for i in range(10):
        box(B, 'kit_wood', DARK, -1.8 + i * .4, 2.26, -.86, .05, 2.6, .05, bevel=.008, grain='y')
    for j in range(5):
        box(B, 'kit_wood', DARK, 0, 1.1 + j * .58, -.86, 3.7, .05, .05, bevel=.008)
    for s in (-1, 1):
        box(B, 'kit_wood', TIMBER, s * 2.5, 2.26, -.9, 1.4, 2.6, .1, bevel=.02, grain='y')
    box(B, 'kit_wood', TIMBER, 0, .66, .6, 6.4, .12, 3.4, bevel=.02)  # floor
    # bracket band and beams under the roof
    box(B, 'kit_paint', VERMILION, 0, 4.05, 0, 7.0, .3, 5.2, bevel=.04, tile=1.2)
    box(B, 'kit_paint', '#efe6d2', 0, 4.3, 0, 7.3, .2, 5.5, bevel=.03)
    for i in range(13):
        for sgn in (-1, 1):
            box(B, 'kit_paint', GOLD, -3.6 + i * .6, 4.47, sgn * 2.85, .16, .14, .3, bevel=.02)
    hip_roof(B, 10.2, 8.2, 4.55, 2.3, upturn=.55, nu=16, nv=14)
    rope(B, -1.25, 1.25, 3.75, 2.36, sag=.3, r=.07, shide=3)
    # bell rope
    cyl(B, 'kit_cloth', '#c9423f', 0, 2.7, 2.2, .04, 1.9, segs=6, tile=.3)
    sphere(B, 'kit_paint', GOLD, 0, 3.72, 2.2, .14, segs=8, rings=5)
    return B


# ---------------------------------------------------------------- fence

def fence():
    """Vermilion railing module, 3.5 m along -Z... nodes: fence_post (upright) and fence_rails (tilts with the slope)."""
    P = Builder('fence_post')
    box(P, 'kit_paint', VERMILION, 0, .6, 0, .17, 1.2, .17, bevel=.03, tile=1.2, grain='y')
    box(P, 'kit_paint', LACQUER, 0, .1, 0, .22, .2, .22, bevel=.03)
    box(P, 'kit_paint', LACQUER, 0, 1.22, 0, .24, .06, .24, bevel=.02)
    sphere(P, 'kit_paint', GOLD, 0, 1.33, 0, .085, .1, .085, segs=8, rings=5)
    R = Builder('fence_rails')
    for yy, t in ((.42, .1), (.88, .12)):
        box(R, 'kit_paint', VERMILION, 0, yy, 1.75, .1, t, 3.5, bevel=.025, tile=1.2, grain='z')
    for i in range(1, 6):
        box(R, 'kit_paint', VERM_DARK, 0, .65, i * 3.5 / 6, .06, .4, .06, bevel=.012, grain='y')
    return [P.build(), R.build()]


# ---------------------------------------------------------------- trees, bamboo, rocks

def limb(B, pts, r0, r1, color='#6a5143'):
    """Tapered branch through points."""
    n = len(pts) - 1
    for i in range(n):
        a, b = Vector(pts[i]), Vector(pts[i + 1])
        d = b - a
        ra, rb = r0 + (r1 - r0) * i / n, r0 + (r1 - r0) * (i + 1) / n
        mid = (a + b) / 2
        # rotation taking +Y to d
        rx = math.atan2(d.z, d.y)
        rz = -math.atan2(d.x, math.hypot(d.y, d.z))
        cyl(B, 'kit_wood', color, mid.x, mid.y, mid.z, ra, d.length * 1.06, segs=8, r2=rb, rot=(rx, 0, rz), tile=.8, grain='y')


def tree_cherry():
    rng = random.Random(3)
    B = Builder('env_tree_cherry')
    limb(B, [(0, 0, 0), (.12, 1.1, .05), (-.1, 2.2, .1), (.05, 3.1, 0)], .3, .17)
    for k in range(5):
        cyl(B, 'kit_wood', '#6a5143', math.cos(k * 1.26) * .32, .12, math.sin(k * 1.26) * .32, .12, .3, segs=6, r2=.04, rot=(math.sin(k * 1.26) * .9, 0, -math.cos(k * 1.26) * .9))
    ends = []
    for k in range(6):
        a = k * 1.05 + .3
        e = (math.cos(a) * 1.9, 3.9 + (k % 3) * .35, math.sin(a) * 1.9)
        limb(B, [(.0, 2.4 + k * .1, .0), (math.cos(a) * .9, 3.2 + k * .05, math.sin(a) * .9), e], .12, .05)
        ends.append(e)
    ends.append((0, 4.7, 0))
    pinks = ['#f4bdd2', '#e9a3c2', '#f9d6e4', '#dd8fb4', '#f0b1ca']
    for e in ends:
        for j in range(4):
            r = rng.uniform(.75, 1.15)
            sphere(B, 'kit_paint', pinks[rng.randrange(5)], e[0] + rng.uniform(-.8, .8), e[1] + rng.uniform(-.25, .6), e[2] + rng.uniform(-.8, .8), r, r * .72, r, segs=8, rings=5, rot=(rng.uniform(-.3, .3), rng.uniform(0, 3), 0))
    return B


def tree_pine():
    rng = random.Random(5)
    B = Builder('env_tree_pine')
    limb(B, [(0, 0, 0), (.3, 1.4, 0), (.05, 2.9, .15), (.45, 4.3, 0), (.2, 5.6, -.1)], .34, .1, '#5a4438')
    greens = ['#2c5743', '#356650', '#24493a', '#3f7459']
    pads = [(1.9, 2.5, .2, 1.5), (-1.5, 3.2, -.4, 1.35), (1.3, 4.0, .6, 1.25), (-1.0, 4.7, .3, 1.1), (.6, 5.4, -.3, 1.0), (.2, 6.2, -.1, .8)]
    for px, py, pz, r in pads:
        limb(B, [(.2, py - .5, 0), (px * .6, py - .25, pz * .6), (px, py - .1, pz)], .09, .04, '#5a4438')
        for j in range(3):
            rr = r * rng.uniform(.6, .9)
            sphere(B, 'kit_paint', greens[rng.randrange(4)], px + rng.uniform(-.5, .5), py + j * .12, pz + rng.uniform(-.5, .5), rr, rr * .34, rr, segs=8, rings=4, rot=(rng.uniform(-.12, .12), rng.uniform(0, 3), 0))
    return B


def tree_broadleaf():
    rng = random.Random(9)
    B = Builder('env_tree_broadleaf')
    limb(B, [(0, 0, 0), (-.1, 1.5, .08), (.1, 3.0, 0)], .36, .2, '#5f4b3c')
    greens = ['#3f6f4e', '#4d8058', '#356143', '#5b8c5c', '#2e5640']
    for k in range(5):
        a = k * 1.26
        limb(B, [(0, 2.3, 0), (math.cos(a) * .8, 3.2, math.sin(a) * .8), (math.cos(a) * 1.5, 3.9, math.sin(a) * 1.5)], .13, .06, '#5f4b3c')
    for j in range(16):
        a, v = rng.uniform(0, 6.28), rng.uniform(-.5, 1)
        rad = math.sqrt(max(.05, 1 - v * v)) * 2.0
        r = rng.uniform(.85, 1.3)
        sphere(B, 'kit_paint', greens[rng.randrange(5)], math.cos(a) * rad, 4.3 + v * 1.4, math.sin(a) * rad, r, r * .8, r, segs=8, rings=5, rot=(0, rng.uniform(0, 3), 0))
    return B


def bamboo():
    rng = random.Random(11)
    B = Builder('env_bamboo')
    for k in range(7):
        a = k * .9
        x, z, h = math.cos(a) * rng.uniform(.15, .7), math.sin(a) * rng.uniform(.15, .7), rng.uniform(4.6, 6.6)
        lean = (rng.uniform(-.06, .06), 0, rng.uniform(-.06, .06))
        col = ['#7c9c62', '#6f9058', '#8aa86c'][k % 3]
        cyl(B, 'kit_paint', col, x - math.sin(lean[2]) * h / 2, h / 2, z + math.sin(lean[0]) * h / 2, .055, h, segs=7, r2=.03, rot=lean, tile=.9)
        for j in range(1, int(h / .62)):
            torus(B, 'kit_paint', '#4f6b45', x - math.sin(lean[2]) * j * .62, j * .62, z + math.sin(lean[0]) * j * .62, .052, .009, segs=7, csegs=3)
        for j in range(5):
            y = h * (.55 + j * .1)
            aa = rng.uniform(0, 6.28)
            sphere(B, 'kit_paint', ['#86b06c', '#6f9c5c', '#9abf7a'][j % 3], x + math.cos(aa) * .45, y, z + math.sin(aa) * .45, .55, .09, .2, segs=6, rings=3, rot=(rng.uniform(-.4, .4), -aa, rng.uniform(-.5, -.1)))
    return B


def rocks():
    """Three mossy boulders (nodes rock_a..c): displaced icospheres, moss painted on upward faces."""
    objs = []
    for k, name in enumerate('abc'):
        B = Builder(f'rock_{name}')
        b = bmesh.new()
        bmesh.ops.create_icosphere(b, subdivisions=3, radius=1.0)
        cl = b.loops.layers.color.new('Color')
        seed = Vector((k * 7.3, k * 1.7, 3.1))
        sx, sy, sz = [(1.0, .62, .8), (.8, .8, .7), (1.2, .5, .9)][k]
        for v in b.verts:
            n = noise.noise(v.co * 1.4 + seed) * .32 + noise.noise(v.co * 3.1 + seed) * .12
            v.co *= 1 + n
            v.co = Vector((v.co.x * sx, max(-.25, v.co.y * sy), v.co.z * sz))
            v.co.y += .25
        b.normal_update()
        for f in b.faces:
            f.smooth = False
            up = max(0.0, f.normal.y)
            m = min(1.0, max(0.0, (up - .55) * 3 + noise.noise(f.calc_center_median() * 2 + seed) * .8))
            col = (1 - m * .55, 1 - m * .32, 1 - m * .62, 1)
            for l in f.loops:
                l[cl] = col
        B.add(b, 'kit_stone', ['#d6cab6', '#c9bda9', '#dccfba'][k], tile=1.4)
        objs.append(B.build())
    return objs


# ---------------------------------------------------------------- nobori banner

def banner():
    """Nobori: pole with crossbar (node banner_pole) and a tall flag (node banner_flag, white so the
    runtime tints it per instance; the flag hangs on +X of the pole and sways in the shader)."""
    P = Builder('banner_pole')
    cyl(P, 'kit_wood', '#8a6a4f', 0, 2.35, 0, .045, 4.7, segs=8, r2=.035, tile=.8, grain='y')
    box(P, 'kit_wood', '#8a6a4f', .45, 4.5, 0, .98, .05, .05, bevel=.012)
    sphere(P, 'kit_wood', '#d9a94e', 0, 4.74, 0, .06, segs=6, rings=4)
    cyl(P, 'kit_wood', '#b9ab95', 0, .09, 0, .16, .18, segs=8, tile=.8)
    F = Builder('banner_flag')
    w0, w1, y0, y1 = .07, .88, 1.25, 4.46

    def part_fn(ya, yb):
        def fn(u, v):
            return (w0 + (w1 - w0) * u, yb + (ya - yb) * v, .035 * math.sin(v * 7 + u * 2) * u)
        return fn
    bands = [(y1, y1 - .42, '#c4c4c4'), (y1 - .42, y1 - .5, '#ffffff'), (y1 - .5, y0 + .55, '#ffffff'), (y0 + .55, y0 + .47, '#ffffff'), (y0 + .47, y0, '#c4c4c4')]
    for ya, yb, col in bands:
        grid(F, 'kit_cloth', col, part_fn(yb, ya), 4, max(2, int((ya - yb) * 6)), tile=.38, double=True)
    # crest disc on both faces and pole loops
    for sgn in (-1, 1):
        cyl(F, 'kit_cloth', '#fff7e2', (w0 + w1) / 2, 3.25, sgn * .035, .26, .012, segs=16, rot=(math.pi / 2, 0, 0), tile=.5)
        cyl(F, 'kit_cloth', '#c4c4c4', (w0 + w1) / 2, 3.25, sgn * .045, .15, .012, segs=12, rot=(math.pi / 2, 0, 0), tile=.5)
    for i in range(7):
        box(F, 'kit_cloth', '#c9c9c9', .03, y0 + .2 + i * .5, 0, .1, .07, .02, bevel=.005)
    for i in range(3):
        box(F, 'kit_cloth', '#c9c9c9', .2 + i * .3, 4.49, 0, .07, .1, .02, bevel=.005)
    return [P.build(), F.build()]


# ---------------------------------------------------------------- drum tower

def yagura():
    """Bon-odori drum tower inside the 5 x 4 m obstacle: striped skirt, deck with railing, taiko,
    four posts and a curved roof. Runtime adds the name sign and paper lanterns."""
    B = Builder('env_yagura')
    w, d, deck = 4.4, 3.5, 1.45
    box(B, 'kit_wood', DARK, 0, .1, 0, w + .3, .2, d + .3, bevel=.03)
    # kohaku curtain around the base
    n = 10
    for i in range(n):
        col = '#c9423f' if i % 2 else WHITE
        x = -w / 2 + (i + .5) * w / n
        for sgn in (-1, 1):
            box(B, 'kit_cloth', col, x, deck / 2 + .12, sgn * (d / 2 + .02), w / n, deck - .2, .04, bevel=.0, tile=.7)
    m = 8
    for i in range(m):
        col = '#c9423f' if i % 2 else WHITE
        z = -d / 2 + (i + .5) * d / m
        for sgn in (-1, 1):
            box(B, 'kit_cloth', col, sgn * (w / 2 + .02), deck / 2 + .12, z, .04, deck - .2, d / m, bevel=.0, tile=.7)
    box(B, 'kit_paint', GOLD, 0, deck - .03, d / 2 + .05, w + .1, .06, .05, bevel=.012)
    box(B, 'kit_wood', TIMBER, 0, deck + .05, 0, w + .5, .16, d + .5, bevel=.04, segs=2)
    box(B, 'kit_cloth', '#b83c3a', 0, deck + .14, 0, w - .5, .03, d - .5, bevel=.0, tile=.6)
    for sx in (-1, 1):
        for sz in (-1, 1):
            box(B, 'kit_wood', TIMBER, sx * (w / 2 - .05), 2.75, sz * (d / 2 - .05), .2, 5.5, .2, bevel=.035, segs=2, grain='y')
            box(B, 'kit_paint', GOLD, sx * (w / 2 - .05), deck + .3, sz * (d / 2 - .05), .25, .1, .25, bevel=.02)
    # railing
    for yy in (deck + .55, deck + .95):
        for sgn in (-1, 1):
            box(B, 'kit_paint', VERMILION, 0, yy, sgn * (d / 2 + .12), w + .5, .09, .09, bevel=.02, tile=1.2)
            box(B, 'kit_paint', VERMILION, sgn * (w / 2 + .12), yy, 0, .09, .09, d + .5, bevel=.02, tile=1.2)
    for i in range(9):
        x = -w / 2 + i * w / 8
        for sgn in (-1, 1):
            box(B, 'kit_paint', VERM_DARK, x, deck + .6, sgn * (d / 2 + .12), .06, .8, .06, bevel=.012, grain='y')
    # taiko on a cradle, drum axis along Z so the head faces the lane
    ty = deck + 1.35
    cyl(B, 'kit_wood', '#9a5a3c', 0, ty, 0, .78, 1.15, segs=20, rot=(math.pi / 2, 0, 0), tile=.9)
    cyl(B, 'kit_wood', '#a8623f', 0, ty, 0, .84, .5, segs=20, rot=(math.pi / 2, 0, 0), tile=.9)
    for sgn in (-1, 1):
        cyl(B, 'kit_paint', '#f3e6c8', 0, ty, sgn * .585, .76, .03, segs=20, rot=(math.pi / 2, 0, 0))
        for i in range(18):
            a = i / 18 * math.tau
            sphere(B, 'kit_paint', LACQUER, math.cos(a) * .76, ty + math.sin(a) * .76, sgn * .5, .035, segs=5, rings=3)
        # tomoe swirl on the head
        for i in range(3):
            a = i / 3 * math.tau
            cyl(B, 'kit_paint', '#b83c3a', math.cos(a) * .2, ty + math.sin(a) * .2, sgn * .605, .17, .01, segs=10, rot=(math.pi / 2, 0, 0))
    for sgn in (-1, 1):
        box(B, 'kit_wood', DARK, sgn * .55, deck + .5, 0, .14, .75, 1.0, bevel=.03, rot=(0, 0, sgn * .35))
    box(B, 'kit_wood', DARK, 0, deck + .22, 0, 1.7, .12, 1.1, bevel=.03)
    for sgn in (-1, 1):
        cyl(B, 'kit_wood', '#e7cfa3', sgn * .95, deck + .26, .75, .03, .7, segs=6, rot=(math.pi / 2, .4 * sgn, 0))
    # beams and roof
    for sgn in (-1, 1):
        box(B, 'kit_wood', TIMBER, 0, 5.3, sgn * (d / 2 - .05), w + .7, .2, .2, bevel=.035)
        box(B, 'kit_wood', TIMBER, sgn * (w / 2 - .05), 5.3, 0, .2, .2, d + .7, bevel=.035)
        box(B, 'kit_paint', VERMILION, 0, 4.9, sgn * (d / 2 - .05), w, .14, .12, bevel=.025)
    hip_roof(B, w + 1.9, d + 1.9, 5.45, 1.25, upturn=.4, nu=12, nv=10)
    # ladder at the back
    for sgn in (-1, 1):
        box(B, 'kit_wood', WOOD, sgn * .28, deck / 2 + .1, -d / 2 - .32, .06, deck + .5, .06, bevel=.012, rot=(.22, 0, 0), grain='y')
    for i in range(5):
        box(B, 'kit_wood', WOOD, 0, .25 + i * .3, -d / 2 - .46 + i * .065, .6, .05, .05, bevel=.01)
    return B


# ---------------------------------------------------------------- street clutter

def clutter():
    """Small dressing props, one node each: barrel (sake komodaru), crates, wagasa (parasol), bench."""
    objs = []
    B = Builder('clutter_barrel')
    cyl(B, 'kit_cloth', '#e3cf9d', 0, .36, 0, .36, .72, segs=14, tile=.5)
    for yy in (.12, .36, .6):
        torus(B, 'kit_cloth', '#b9975c', 0, yy, 0, .365, .022, segs=14, csegs=4)
    cyl(B, 'kit_paint', '#f6f1e6', 0, .73, 0, .33, .03, segs=14)
    cyl(B, 'kit_paint', RED, 0, .4, .355, .17, .02, segs=12, rot=(math.pi / 2, 0, 0))
    objs.append(B.build())
    B = Builder('clutter_crates')
    for (x, y, z, s, c, r) in ((0, 0, 0, .6, '#c99e72', .1), (.62, 0, .08, .52, '#b58a62', -.2), (.2, .45, .02, .48, '#d2aa7c', .35)):
        box(B, 'kit_wood', c, x, y + s * .37, z, s, s * .74, s * .8, bevel=.02, rot=(0, r, 0))
        box(B, 'kit_wood', DARK, x, y + s * .37, z, s * 1.03, .05, s * .83, bevel=.01, rot=(0, r, 0))
    objs.append(B.build())
    B = Builder('clutter_wagasa')
    cyl(B, 'kit_wood', '#6d5546', 0, 1.25, 0, .035, 2.5, segs=7, tile=.8, grain='y')
    cyl(B, 'kit_paint', '#c8402f', 0, 2.38, 0, 1.25, .42, segs=20, r2=.05, caps=False, smooth=False)
    cyl(B, 'kit_paint', '#f3e6c8', 0, 2.2, 0, 1.27, .06, segs=20, r2=1.2, caps=False, smooth=False)
    for i in range(20):
        a = i / 20 * math.tau
        box(B, 'kit_wood', '#6d5546', math.cos(a) * .62, 2.33, math.sin(a) * .62, 1.25, .015, .02, bevel=.0, rot=(0, -a, -.33))
    sphere(B, 'kit_paint', GOLD, 0, 2.62, 0, .06, segs=6, rings=4)
    cyl(B, 'kit_wood', '#b9ab95', 0, .1, 0, .2, .2, segs=8, tile=.8)
    objs.append(B.build())
    B = Builder('clutter_bench')
    box(B, 'kit_wood', TIMBER, 0, .47, 0, 2.2, .1, .7, bevel=.03)
    for sx in (-1, 1):
        for sz in (-1, 1):
            box(B, 'kit_wood', DARK, sx * .9, .22, sz * .25, .1, .44, .1, bevel=.02, grain='y')
    box(B, 'kit_cloth', '#b83c3a', 0, .535, 0, 2.3, .03, .74, bevel=.0, tile=.6)
    for sgn in (-1, 1):
        box(B, 'kit_cloth', '#b83c3a', sgn * 1.15, .43, 0, .02, .22, .74, bevel=.0, tile=.6)
    objs.append(B.build())
    return objs


BUILDERS = {
    'env_torii': torii, 'env_gate_spirit': gate_spirit, 'env_shrine': shrine, 'env_fence': fence,
    'env_tree_cherry': tree_cherry, 'env_tree_pine': tree_pine, 'env_tree_broadleaf': tree_broadleaf,
    'env_bamboo': bamboo, 'env_rocks': rocks, 'env_banner': banner, 'env_yagura': yagura, 'env_clutter': clutter,
}
PROFILES = {'env_fence': 'prop', 'env_bamboo': 'prop', 'env_rocks': 'prop', 'env_banner': 'prop'}


def build(asset_id):
    reset()
    finish(BUILDERS[asset_id](), asset_id)


if __name__ == '__main__':
    for a in (sys.argv[1:] or list(BUILDERS)):
        build(a)
