"""Sumi's personality on top of motion_lib (art bible §6: hops along flapping its wings).

- walk: a bird's skip-hop. Both feet push off almost together (R trails L by a few frames), the body
  is airborne for a moment and lands with a squash. The wings (= arms) flap once per hop: up on the
  push-off, down on the landing. Head bobs forward like a crow's.
- run: bigger, faster hops with full wing beats and a strong forward lean (trying to take off).
- reveal_panic: a failed take-off. Frantic wing beats, three little hops that go nowhere, head
  snapping left and right; the wing tips (x_wing_*) whip from SECONDARY follow-through.
- The beak and wing tips get follow-through from acceleration (SECONDARY).
"""
import math
from mathutils import Vector
import motion_lib as ML

Q, TAU = ML.Q, ML.TAU

STYLE = {
    'idle': {'frames': 96, 'look': 30, 'hands': 'wings'},
    # one hop per cycle; 'offset' = how far the right foot trails the left (0.5 would be a normal walk)
    'walk': {'frames': 12, 'step': 0.24, 'lift': 0.05, 'crouch': 0.03, 'bob': 0.045, 'sway': 0.006,
             'lean': 10, 'roll': 2, 'yaw': 3, 'stance': 0.5, 'offset': 0.1, 'head_nod': 9,
             'flap': 32, 'hands': 'wings'},
    'run': {'frames': 10, 'step': 0.36, 'lift': 0.08, 'crouch': 0.035, 'bob': 0.075, 'sway': 0.004,
            'lean': 20, 'roll': 1.5, 'yaw': 2, 'stance': 0.42, 'offset': 0.08, 'head_nod': 7,
            'flap': 55, 'hands': 'wings'},
    'reveal_panic': {'frames': 36},
    # wings rest slightly folded down from the A-pose (raise, fwd, elbow)
    'hand_poses': {'chest': (-12, 40, 60), 'side': (-6, 6, 10), 'up': (95, 20, 25), 'wings': (-14, 8, 12)},
}


def hop_gait(t, ctx, st):
    """Like ML.gait, but the feet move nearly together and the hips leave the ground between contacts."""
    T = st['frames'] / ML.FPS
    ph = (t / T) % 1.0
    p = ML.Pose()
    stance = st['stance']
    # airborne window = when both feet are in swing; a smooth bump that peaks mid-flight
    air = (ph - stance) / (1 - stance)
    up = math.sin(math.pi * air) if 0 < air < 1 else 0.0
    land = ML.env(ph, 0.0, 0.04, 0.12, 0.3)   # squash right after touchdown
    p.hips.z = -st['crouch'] - st['bob'] * 0.6 * land + st['bob'] * up
    p.hips.x = st['sway'] * math.sin(TAU * ph)
    p.scale['Spine1'] = (1 + 0.04 * land - 0.02 * up, 1 - 0.06 * land + 0.04 * up, 1)
    p.r('Hips', Q(y=-st['roll'] * math.sin(TAU * ph), z=st['yaw'] * math.sin(TAU * ph)))
    p.r('Spine', Q(x=st['lean'] * 0.6 + 5 * land))
    p.r('Spine1', Q(x=st['lean'] * 0.4))
    # crow head bob: thrusts forward on landing, pulls back in the air
    nod = st['head_nod'] * (land - 0.6 * up)
    p.r('Neck', Q(x=-st['lean'] * 0.5 + nod))
    p.r('Head', Q(x=-st['lean'] * 0.4 - 0.4 * nod))
    for side, off in (('L', 0.0), ('R', st['offset'])):
        q = (ph - off) % 1.0
        base = ctx.J[('Left' if side == 'L' else 'Right') + 'Foot'].copy()
        S = st['step']
        if q < stance:
            u = q / stance
            y, z, pitch = -S / 2 + S * u, 0.0, 0.0
        else:
            u = (q - stance) / (1 - stance)
            y = S / 2 - S * ML.ease(u)
            z = st['lift'] * math.sin(math.pi * u) ** 1.2
            pitch = 22 * math.sin(math.pi * u) * (1 - u) - 12 * math.sin(math.pi * u) * u
        p.feet[side] = base + Vector((0, y, z))
        p.foot_pitch[side] = pitch
    return p, ph, up, land


def wings(p, ctx, raise_, fwd=8.0, bend=12.0, lag=0.0):
    for side in 'LR':
        nm = 'Left' if side == 'L' else 'Right'
        p.r(nm + 'Arm', ML.arm(side, raise_, fwd))
        p.r(nm + 'ForeArm', ML.elbow(side, bend + lag))
        p.r(nm + 'Hand', Q(z=(lag * 0.6) * (1 if side == 'L' else -1)))
    return p


def walk(t, ctx):
    st = ctx.style['walk']
    p, ph, up, land = hop_gait(t, ctx, st)
    # wing beat: lifts on push-off (just before the flight), comes down on landing; the forearm lags
    beat = math.sin(TAU * (ph - st['stance'] + 0.1))
    return wings(p, ctx, -14 + st['flap'] * (0.5 + 0.5 * beat), fwd=6, bend=12, lag=-14 * beat)


def run(t, ctx):
    st = ctx.style['run']
    p, ph, up, land = hop_gait(t, ctx, st)
    beat = math.sin(TAU * (ph - st['stance'] + 0.12))
    return wings(p, ctx, -10 + st['flap'] * (0.5 + 0.5 * beat), fwd=14, bend=10, lag=-22 * beat)


def idle(t, ctx):
    p = ML.idle(t, ctx)
    # ruffle: a little wing shake twice per loop
    ph = t / (ctx.style['idle']['frames'] / ML.FPS)
    shake = 6 * math.sin(TAU * ph * 14) * (ML.env(ph, 0.3, 0.33, 0.38, 0.41) + ML.env(ph, 0.75, 0.78, 0.82, 0.85))
    for side in 'LR':
        nm = 'Left' if side == 'L' else 'Right'
        p.r(nm + 'Arm', ML.arm(side, shake, 0))
    return p


def reveal_panic(t, ctx):
    """A failed take-off: frantic flapping, three hops that go nowhere, head snapping around."""
    n = ctx.style['reveal_panic']['frames'] / ML.FPS
    x = t / n
    p = ML.Pose()
    jolt = ML.env(x, 0.0, 0.06, 0.12, 0.22)
    flap_k = ML.env(x, 0.08, 0.16, 0.85, 0.97)
    ML.feet_rest(p, ctx, crouch=0.03 * jolt)
    # three hops between 0.25 and 0.85
    hop = 0.0
    if 0.25 < x < 0.85:
        k = ((x - 0.25) / 0.2) % 1.0
        hop = math.sin(math.pi * k)
    for s in 'LR':
        p.feet[s] = p.feet[s] + Vector((0, 0, 0.07 * hop))
        p.foot_pitch[s] = 20 * hop
    p.hips.z += 0.07 * hop - 0.02 * jolt
    p.scale['Spine1'] = (1 - 0.06 * jolt, 1 + 0.12 * jolt + 0.04 * hop, 1 - 0.04 * jolt)
    look = 35 * math.sin(TAU * 3.5 * x) * ML.env(x, 0.2, 0.28, 0.8, 0.9)
    p.r('Spine', Q(x=-10 * jolt - 6 * hop)).r('Neck', Q(x=-12 * jolt, z=look * 0.3)).r('Head', Q(x=-14 * jolt, z=look * 0.7))
    beat = math.sin(TAU * 5.5 * x)
    raise_ = -14 + (40 * jolt) + flap_k * (35 + 45 * beat)
    return wings(p, ctx, raise_, fwd=10 + 10 * flap_k, bend=10, lag=-26 * beat * flap_k)


CLIPS = {'walk': walk, 'run': run, 'idle': idle, 'reveal_panic': reveal_panic}

SECONDARY = {
    'x_beak': {'gain': 0.3, 'lag': 1, 'limit': 6},
    'x_wing_L_01': {'gain': 0.6, 'lag': 1, 'limit': 12},
    'x_wing_L_02': {'gain': 1.0, 'lag': 2, 'limit': 20},
    'x_wing_R_01': {'gain': 0.6, 'lag': 1, 'limit': 12},
    'x_wing_R_02': {'gain': 1.0, 'lag': 2, 'limit': 20},
}
