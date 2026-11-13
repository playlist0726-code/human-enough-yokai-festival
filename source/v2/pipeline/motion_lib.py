"""motion_lib — the 14 ASSET_CONTRACT player clips as keyframe functions with personality knobs.

A clip is `fn(t, ctx) -> Pose`, sampled at 30 fps by animate_contract.py. t is seconds.
ctx gives rest joint positions (ctx.J['LeftFoot'] etc., metres, armature space), the style dict
and helpers. Pose holds armature-axis rotation deltas per bone, a Hips offset, bone scales
(squash & stretch) and optional foot targets (solved with 2-bone IK so planted feet do not slide).

Axes (armature space): character faces -Y, +X = character's left, +Z = up.
  lean forward / nod down : +X rotation on spine/neck/head
  leg swing back          : +X rotation on a leg (forward = negative)
  arm raise               : L arm -Y rotation, R arm +Y  -> use arm(side, raise, fwd)
  arm forward             : L arm -Z, R arm +Z           -> use arm(side, raise, fwd)

Characters choose a style in source/v2/characters/<id>/motion.py:
  STYLE = {...overrides of DEFAULT_STYLE...}
  CLIPS = {'walk': my_walk, ...}   # optional per-clip replacements (signature fn(t, ctx))
  SECONDARY = {'x_dish': {...}}    # follow-through on x_ bones, see animate_contract.py
"""
import math
from mathutils import Vector, Quaternion, Euler

FPS = 30
TAU = math.tau


def Q(x=0.0, y=0.0, z=0.0):
    """Armature-axis rotation in degrees (applied X then Y then Z)."""
    return Euler((math.radians(x), math.radians(y), math.radians(z)), 'XYZ').to_quaternion()


def sgn(side):
    return 1 if side == 'L' else -1


def arm(side, raise_=0.0, fwd=0.0, twist=0.0):
    """raise_: + lifts the arm up (from the A-pose rest), fwd: + swings it forward."""
    s = sgn(side)
    return Q(z=-s * fwd) @ Q(y=-s * raise_) @ Q(x=twist)


def elbow(side, bend=0.0):
    """+ bends the forearm forward/inward."""
    return Q(z=-sgn(side) * bend)


def ease(x):
    x = min(1.0, max(0.0, x))
    return x * x * (3 - 2 * x)


def ease_out(x):
    x = min(1.0, max(0.0, x))
    return 1 - (1 - x) ** 3


def ease_in(x):
    x = min(1.0, max(0.0, x))
    return x ** 3


def env(t, a, b, c, d):
    """0 before a, ramps to 1 over [a,b], holds, ramps back to 0 over [c,d]."""
    if t <= a or t >= d:
        return 0.0
    if t < b:
        return ease((t - a) / (b - a))
    if t <= c:
        return 1.0
    return 1 - ease((t - c) / (d - c))


def overshoot(x, amount=0.12):
    """0->1 with a spring overshoot (follow-through)."""
    x = min(1.0, max(0.0, x))
    return 1 - math.exp(-6 * x) * math.cos(9 * x) * (1 - amount) - (1 - x) * amount * 0


class Pose:
    def __init__(self):
        self.rot = {}       # bone -> Quaternion (armature axes)
        self.hips = Vector((0, 0, 0))
        self.scale = {}     # bone -> (x, y_along_bone, z)
        self.feet = {}      # 'L'/'R' -> Vector ankle target (armature space)
        self.foot_pitch = {}  # 'L'/'R' -> degrees (+ toes down)

    def r(self, bone, q):
        self.rot[bone] = q @ self.rot.get(bone, Quaternion())
        return self


DEFAULT_STYLE = {
    'idle': {'frames': 90, 'breath': 1.5, 'look': 22, 'hands': 'chest'},
    'walk': {'frames': 11, 'step': 0.17, 'lift': 0.045, 'crouch': 0.03, 'bob': 0.012, 'sway': 0.012,
             'lean': 7, 'roll': 4, 'yaw': 6, 'arm_swing': 14, 'hands': 'chest', 'stance': 0.56, 'head_nod': 3},
    'run': {'frames': 9, 'step': 0.29, 'lift': 0.07, 'crouch': 0.035, 'bob': 0.03, 'sway': 0.01,
            'lean': 14, 'roll': 3, 'yaw': 8, 'arm_swing': 38, 'stance': 0.4, 'head_nod': 4},
    'jump_start': {'frames': 8},
    'jump_air': {'frames': 18},
    'land': {'frames': 9},
    'drink_potion': {'frames': 27},
    'charm_cast': {'frames': 18},
    'charm_hold': {'frames': 30},
    'cover_ward': {'frames': 24},
    'reveal_panic': {'frames': 33},
    'hit': {'frames': 12},
    'sealed': {'frames': 60},
    'victory': {'frames': 36},
    # resting hand poses (arm raise, arm fwd, elbow bend)
    'hand_poses': {'chest': (-10, 52, 78), 'side': (8, 8, 18), 'up': (95, 20, 25)},
}


def hands(p, ctx, name, k=1.0, swing=0.0):
    rz, fw, eb = ctx.style['hand_poses'][name]
    for side in 'LR':
        sw = swing * (1 if side == 'L' else -1)
        p.r(f'{"Left" if side == "L" else "Right"}Arm', arm(side, rz * k, (fw + sw) * k))
        p.r(f'{"Left" if side == "L" else "Right"}ForeArm', elbow(side, eb * k))


def feet_rest(p, ctx, crouch=0.0):
    for side in 'LR':
        p.feet[side] = ctx.J[('Left' if side == 'L' else 'Right') + 'Foot'].copy()
    p.hips.z -= crouch


# ---------------------------------------------------------------- locomotion
def gait(t, ctx, st):
    T = st['frames'] / FPS
    ph = (t / T) % 1.0
    p = Pose()
    p.hips.z = -st['crouch'] - st['bob'] * (0.5 + 0.5 * math.cos(4 * TAU / 2 * ph * 1.0))
    p.hips.x = st['sway'] * math.sin(TAU * ph)
    p.r('Hips', Q(y=-st['roll'] * math.sin(TAU * ph), z=st['yaw'] * math.sin(TAU * ph)))
    p.r('Spine', Q(x=st['lean'] * 0.6, z=-st['yaw'] * 0.8 * math.sin(TAU * ph)))
    p.r('Spine1', Q(x=st['lean'] * 0.4, y=st['roll'] * 0.6 * math.sin(TAU * ph)))
    p.r('Neck', Q(x=-st['lean'] * 0.5 + st['head_nod'] * math.cos(4 * math.pi * ph - 0.6)))
    p.r('Head', Q(x=-st['lean'] * 0.4, y=-st['roll'] * 0.5 * math.sin(TAU * ph - 0.5)))
    for side, off in (('L', 0.0), ('R', 0.5)):
        q = (ph + off) % 1.0
        base = ctx.J[('Left' if side == 'L' else 'Right') + 'Foot'].copy()
        S, stance = st['step'], st['stance']
        if q < stance:  # planted: slides back under the body at constant speed
            u = q / stance
            y = -S / 2 + S * u
            z = 0.0
            pitch = 0.0
        else:          # swing forward with lift
            u = (q - stance) / (1 - stance)
            y = S / 2 - S * ease(u)
            z = st['lift'] * math.sin(math.pi * u) ** 1.2
            pitch = 18 * math.sin(math.pi * u) * (1 - u) - 10 * math.sin(math.pi * u) * u
        p.feet[side] = base + Vector((0, y, z))
        p.foot_pitch[side] = pitch
    return p, ph


def walk(t, ctx):
    st = ctx.style['walk']
    p, ph = gait(t, ctx, st)
    hands(p, ctx, st['hands'], swing=st['arm_swing'] * math.sin(TAU * ph))
    return p


def run(t, ctx):
    st = ctx.style['run']
    p, ph = gait(t, ctx, st)
    # flight phase: hips rise between contacts
    p.hips.z += st['bob'] * 1.2 * max(0.0, math.sin(2 * TAU * ph - 0.4))
    for side in 'LR':
        s = 1 if side == 'L' else -1
        sw = st['arm_swing'] * math.sin(TAU * ph) * s
        nm = 'Left' if side == 'L' else 'Right'
        p.r(nm + 'Arm', arm(side, -20, 25 + sw))
        p.r(nm + 'ForeArm', elbow(side, 85))
    return p


def idle(t, ctx):
    st = ctx.style['idle']
    T = st['frames'] / FPS
    ph = t / T
    p = Pose()
    feet_rest(p, ctx, crouch=0.006 + 0.004 * math.sin(TAU * ph * 2))
    br = math.sin(TAU * ph * 2)  # two breaths per loop
    p.scale['Spine1'] = (1 - 0.008 * br, 1 + 0.018 * br, 1 + 0.01 * br)
    look = st['look'] * (ease((ph - 0.15) / 0.12) - ease((ph - 0.42) / 0.12)
                         - ease((ph - 0.6) / 0.12) + ease((ph - 0.85) / 0.12))
    p.r('Neck', Q(z=look * 0.35, x=1.5 * br))
    p.r('Head', Q(z=look * 0.65, y=-look * 0.12))
    p.hips.x = 0.004 * math.sin(TAU * ph)
    p.r('Spine', Q(y=-1.5 * math.sin(TAU * ph)))
    hands(p, ctx, st['hands'], k=1.0)
    # fidget: fingers/hands rub together
    fid = 4 * math.sin(TAU * ph * 6) * env(ph, 0.45, 0.5, 0.6, 0.65)
    p.r('LeftForeArm', elbow('L', fid)).r('RightForeArm', elbow('R', -fid))
    return p


# ---------------------------------------------------------------- jumps
def jump_start(t, ctx):
    n = ctx.style['jump_start']['frames'] / FPS
    x = t / n
    p = Pose()
    crouch = 0.06 * math.sin(math.pi * min(1, x / 0.55))  # anticipation dip
    ext = ease_out((x - 0.5) / 0.5)                         # push off
    feet_rest(p, ctx, crouch=crouch - ext * 0.02)
    for s in 'LR':
        p.foot_pitch[s] = 25 * ext
    p.r('Spine', Q(x=12 * (crouch / 0.06) - 6 * ext))
    p.r('Head', Q(x=-8 * ext))
    p.scale['Spine1'] = (1 + 0.05 * (crouch / 0.06) - 0.03 * ext, 1 - 0.07 * (crouch / 0.06) + 0.08 * ext, 1)
    for side in 'LR':
        nm = 'Left' if side == 'L' else 'Right'
        p.r(nm + 'Arm', arm(side, -25 * (crouch / 0.06) + 80 * ext, -20 * (crouch / 0.06) + 20 * ext))
        p.r(nm + 'ForeArm', elbow(side, 30))
    return p


def jump_air(t, ctx):
    n = ctx.style['jump_air']['frames'] / FPS
    ph = t / n
    p = Pose()
    tuck = 0.05
    for side in 'LR':
        b = ctx.J[('Left' if side == 'L' else 'Right') + 'Foot'].copy()
        p.feet[side] = b + Vector((0, -0.02, tuck + 0.01 * math.sin(TAU * ph + (0 if side == 'L' else 2))))
        p.foot_pitch[side] = 20
    flap = 18 * math.sin(TAU * ph * 2)
    for side in 'LR':
        nm = 'Left' if side == 'L' else 'Right'
        p.r(nm + 'Arm', arm(side, 70 + flap * (1 if side == 'L' else -1), 15))
        p.r(nm + 'ForeArm', elbow(side, 25))
    p.r('Spine', Q(x=-4)).r('Head', Q(x=-6 + 3 * math.sin(TAU * ph)))
    p.scale['Spine1'] = (0.97, 1.05, 1.0)
    return p


def land(t, ctx):
    n = ctx.style['land']['frames'] / FPS
    x = t / n
    p = Pose()
    sq = math.exp(-5 * x) * math.sin(math.pi * min(1, x * 2.2) + 0.3) if x < 1 else 0
    sq = max(0.0, 1 - x) * (1 if x < 0.25 else math.cos((x - 0.25) * 4))
    feet_rest(p, ctx, crouch=0.055 * sq)
    p.r('Spine', Q(x=10 * sq)).r('Head', Q(x=-6 * sq))
    p.scale['Spine1'] = (1 + 0.07 * sq, 1 - 0.1 * sq, 1 + 0.04 * sq)
    for side in 'LR':
        nm = 'Left' if side == 'L' else 'Right'
        p.r(nm + 'Arm', arm(side, 30 * sq, 10 * sq))
    hands(p, ctx, 'chest', k=ease(x))
    return p


# ---------------------------------------------------------------- upper-body actions (no Hips/leg keys)
UPPER = {'drink_potion', 'charm_cast', 'charm_hold', 'cover_ward'}


def drink_potion(t, ctx):
    n = ctx.style['drink_potion']['frames'] / FPS
    x = t / n
    p = Pose()
    lift = env(x, 0.0, 0.3, 0.72, 1.0)
    tip = env(x, 0.3, 0.45, 0.62, 0.78)
    gulp = math.sin(TAU * 3 * (x - 0.35)) * env(x, 0.35, 0.4, 0.6, 0.65)
    p.r('RightArm', arm('R', -10 + 25 * lift, 20 + 60 * lift))
    p.r('RightForeArm', elbow('R', 30 + 95 * lift))
    p.r('RightHand', Q(y=-40 * tip))
    p.r('LeftArm', arm('L', -10, 45)).r('LeftForeArm', elbow('L', 70))
    p.r('Neck', Q(x=-14 * tip)).r('Head', Q(x=-12 * tip + 2 * gulp))
    p.r('Spine1', Q(x=-4 * tip))
    p.scale['Head'] = (1 + 0.02 * gulp, 1 - 0.02 * gulp, 1)
    return p


def charm_pose(p, k, wiggle):
    for side in 'LR':
        nm = 'Left' if side == 'L' else 'Right'
        p.r(nm + 'Arm', arm(side, 10 * k, 70 * k + wiggle * (1 if side == 'L' else -1)))
        p.r(nm + 'ForeArm', elbow(side, 20 * k))
        p.r(nm + 'Hand', Q(x=-25 * k + wiggle))


def charm_cast(t, ctx):
    n = ctx.style['charm_cast']['frames'] / FPS
    x = t / n
    p = Pose()
    wind = env(x, 0.0, 0.25, 0.3, 0.45)      # anticipation: pull hands back to chest
    push = ease_out((x - 0.3) / 0.45)        # throw the charm forward
    p.r('Spine1', Q(x=-6 * wind + 9 * push)).r('Head', Q(x=4 * wind - 6 * push, y=-6 * push))
    for side in 'LR':
        nm = 'Left' if side == 'L' else 'Right'
        p.r(nm + 'Arm', arm(side, -5 * wind, 50 * wind))
        p.r(nm + 'ForeArm', elbow(side, 90 * wind))
    charm_pose(p, push, 10 * math.sin(TAU * 4 * x) * push)
    return p


def charm_hold(t, ctx):
    n = ctx.style['charm_hold']['frames'] / FPS
    ph = t / n
    p = Pose()
    w = 8 * math.sin(TAU * 2 * ph)
    charm_pose(p, 1.0, w)
    p.r('Spine1', Q(x=9, y=2 * math.sin(TAU * ph))).r('Head', Q(x=-6, z=4 * math.sin(TAU * ph)))
    return p


def cover_ward(t, ctx):
    n = ctx.style['cover_ward']['frames'] / FPS
    x = t / n
    p = Pose()
    k = ease_out(x / 0.35) - 0.0 * ease((x - 0.8) / 0.2)
    shake = 3 * math.sin(TAU * 6 * x) * env(x, 0.3, 0.4, 0.75, 0.9)
    p.r('Spine1', Q(x=-6 * k)).r('Head', Q(x=5 * k))
    for side in 'LR':
        nm = 'Left' if side == 'L' else 'Right'
        p.r(nm + 'Arm', arm(side, 55 * k + shake, 20 * k))
        p.r(nm + 'ForeArm', elbow(side, -5 * k))
        p.r(nm + 'Hand', Q(x=-30 * k))
    return p


# ---------------------------------------------------------------- reactions
def reveal_panic(t, ctx):
    """The game's signature gag: jolt, freeze, flail, frantic look-around, hop."""
    n = ctx.style['reveal_panic']['frames'] / FPS
    x = t / n
    p = Pose()
    jolt = env(x, 0.0, 0.08, 0.16, 0.3)          # startle: stretch up
    flail = env(x, 0.15, 0.25, 0.75, 0.92)
    hop = math.sin(math.pi * min(1, max(0, (x - 0.55) / 0.2))) if 0.55 < x < 0.75 else 0
    feet_rest(p, ctx, crouch=0.04 * env(x, 0.0, 0.04, 0.05, 0.1) - 0.02 * jolt)
    if hop:
        for s in 'LR':
            p.feet[s] = p.feet[s] + Vector((0, 0, 0.0))
        p.hips.z += 0.0
    p.scale['Spine1'] = (1 - 0.05 * jolt, 1 + 0.1 * jolt, 1 - 0.03 * jolt)
    look = 28 * math.sin(TAU * 3.2 * x) * env(x, 0.25, 0.32, 0.7, 0.85)
    p.r('Spine', Q(x=-8 * jolt)).r('Neck', Q(x=-6 * jolt, z=look * 0.3)).r('Head', Q(x=-10 * jolt, z=look * 0.7))
    for side in 'LR':
        nm, s = ('Left', 1) if side == 'L' else ('Right', -1)
        fl = 35 * math.sin(TAU * 4.5 * x + (0 if side == 'L' else math.pi)) * flail
        p.r(nm + 'Arm', arm(side, 85 * max(jolt, flail) + fl, 15 + 10 * flail))
        p.r(nm + 'ForeArm', elbow(side, 30 + 0.6 * fl))
    # nervous little stamps
    stamp = 0.025 * max(0.0, math.sin(TAU * 4 * x)) * flail
    p.feet['L'] = p.feet['L'] + Vector((0, 0, stamp))
    p.feet['R'] = p.feet['R'] + Vector((0, 0, 0.025 * max(0.0, -math.sin(TAU * 4 * x)) * flail))
    return p


def hit(t, ctx):
    n = ctx.style['hit']['frames'] / FPS
    x = t / n
    p = Pose()
    k = ease_out(x / 0.2) * (1 - ease((x - 0.3) / 0.7))
    feet_rest(p, ctx, crouch=0.025 * k)
    p.hips.y += 0.03 * k
    p.r('Spine', Q(x=-14 * k)).r('Spine1', Q(x=-8 * k)).r('Head', Q(x=-16 * k, y=8 * k))
    p.scale['Head'] = (1 + 0.05 * k, 1 - 0.06 * k, 1)
    for side in 'LR':
        nm = 'Left' if side == 'L' else 'Right'
        p.r(nm + 'Arm', arm(side, 45 * k, -25 * k)).r(nm + 'ForeArm', elbow(side, 20 * k))
    return p


def sealed(t, ctx):
    n = ctx.style['sealed']['frames'] / FPS
    ph = t / n
    p = Pose()
    feet_rest(p, ctx, crouch=0.06)
    for s in 'LR':
        p.feet[s] = p.feet[s] + Vector((0.015 * (1 if s == 'L' else -1), -0.01, 0))
    wob = math.sin(TAU * ph)
    p.r('Spine', Q(x=16, y=6 * wob)).r('Spine1', Q(x=8)).r('Neck', Q(x=10, y=8 * math.sin(TAU * ph - 0.6)))
    p.r('Head', Q(z=10 * math.sin(TAU * ph - 1.0), y=6 * wob))
    for side in 'LR':
        nm = 'Left' if side == 'L' else 'Right'
        p.r(nm + 'Arm', arm(side, -25, 5 + 4 * wob)).r(nm + 'ForeArm', elbow(side, 10))
    return p


def victory(t, ctx):
    n = ctx.style['victory']['frames'] / FPS
    ph = t / n
    p = Pose()
    h = max(0.0, math.sin(TAU * ph))  # one hop per loop, ground contact with squash
    c = max(0.0, -math.sin(TAU * ph))
    feet_rest(p, ctx, crouch=0.04 * c)
    for s in 'LR':
        p.feet[s] = p.feet[s] + Vector((0, 0, 0.05 * h))
        p.foot_pitch[s] = 15 * h
    p.hips.z += 0.05 * h
    p.scale['Spine1'] = (1 + 0.05 * c - 0.02 * h, 1 - 0.07 * c + 0.05 * h, 1)
    p.r('Spine', Q(x=-6 * h + 8 * c)).r('Head', Q(x=-10 * h, z=8 * math.sin(TAU * ph * 2)))
    for side in 'LR':
        nm = 'Left' if side == 'L' else 'Right'
        wave = 15 * math.sin(TAU * ph * 2 + (0 if side == 'L' else math.pi))
        p.r(nm + 'Arm', arm(side, 100 + wave, 15)).r(nm + 'ForeArm', elbow(side, 20))
    return p


CLIPS = {
    'idle': idle, 'walk': walk, 'run': run, 'jump_start': jump_start, 'jump_air': jump_air, 'land': land,
    'drink_potion': drink_potion, 'charm_cast': charm_cast, 'charm_hold': charm_hold, 'cover_ward': cover_ward,
    'reveal_panic': reveal_panic, 'hit': hit, 'sealed': sealed, 'victory': victory,
}
LOOPING = {'idle', 'walk', 'run', 'jump_air', 'charm_hold', 'sealed', 'victory'}
