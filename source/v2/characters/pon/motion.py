"""Pon's personality on top of motion_lib (art bible §6: a waddle).

- walk: wide stance, short steps, the whole round body rocks side to side over the stance foot
  (big roll + sway), arms held out a little for balance, the tail swings against the rock.
- idle: breathing belly, a lazy chomp of the belly mouth now and then, a look around.
- reveal_panic: the belly jaw chomps frantically, the tail puffs up (scale), stamping hops.
- x_belly_jaw: + closes the mouth (rotation about X pulls the lower jaw up).
- SECONDARY: tail follow-through; jaw bounces a little on landings.
"""
import math
import motion_lib as ML
from mathutils import Vector

STYLE = {
    'idle': {'frames': 96, 'look': 18, 'hands': 'side'},
    # legs are ~11 cm: steps stay inside the leg's reach, so the waddle is mostly the body rocking
    'walk': {'frames': 8, 'step': 0.15, 'lift': 0.03, 'crouch': 0.035, 'bob': 0.01, 'sway': 0.035,
             'lean': 3, 'roll': 11, 'yaw': 4, 'arm_swing': 10, 'hands': 'side', 'stance': 0.58, 'head_nod': 2},
    'run': {'frames': 7, 'step': 0.18, 'lift': 0.045, 'crouch': 0.04, 'bob': 0.03, 'sway': 0.03,
            'lean': 10, 'roll': 9, 'yaw': 5, 'arm_swing': 30, 'stance': 0.42, 'head_nod': 3},
    'hand_poses': {'chest': (-5, 40, 60), 'side': (18, 6, 14), 'up': (95, 20, 25)},
}

JAW = 'x_belly_jaw'


def jaw(p, close):
    """close: 0 = open (modelled), 1 = shut."""
    p.r(JAW, ML.Q(x=-26 * max(-0.3, min(1.0, close))))


def tail(p, swing=0.0, lift=0.0):
    for i in (1, 2, 3):
        p.r(f'x_tail_{i:02d}', ML.Q(x=-lift * (0.5 + i * 0.25), y=swing * (0.6 + i * 0.3)))


def walk(t, ctx):
    st = ctx.style['walk']
    p, ph = ML.gait(t, ctx, st)
    ML.hands(p, ctx, st['hands'], swing=st['arm_swing'] * math.sin(ML.TAU * ph))
    # arms float out on the side the body rocks away from (balance)
    for side in 'LR':
        s = 1 if side == 'L' else -1
        p.r(('Left' if side == 'L' else 'Right') + 'Arm', ML.arm(side, 8 + 10 * s * math.sin(ML.TAU * ph), 0))
    tail(p, swing=12 * math.sin(ML.TAU * ph - 0.8), lift=4)
    jaw(p, 0.15 + 0.1 * math.sin(2 * ML.TAU * ph))
    return p


def run(t, ctx):
    st = ctx.style['run']
    p, ph = ML.gait(t, ctx, st)
    p.hips.z += st['bob'] * max(0.0, math.sin(2 * ML.TAU * ph - 0.4))
    for side in 'LR':
        s = 1 if side == 'L' else -1
        nm = 'Left' if side == 'L' else 'Right'
        p.r(nm + 'Arm', ML.arm(side, 5, 20 + st['arm_swing'] * math.sin(ML.TAU * ph) * s))
        p.r(nm + 'ForeArm', ML.elbow(side, 60))
    tail(p, swing=8 * math.sin(ML.TAU * ph - 0.8), lift=14)
    jaw(p, -0.2)  # mouth wide, panting
    return p


def idle(t, ctx):
    p = ML.idle(t, ctx)
    n = ctx.style['idle']['frames'] / ML.FPS
    ph = t / n
    chomp = ML.env(ph, 0.62, 0.66, 0.66, 0.7) + ML.env(ph, 0.72, 0.76, 0.76, 0.8)
    jaw(p, 0.25 + 0.75 * chomp)
    tail(p, swing=6 * math.sin(ML.TAU * ph), lift=2 * math.sin(ML.TAU * ph * 2))
    return p


def reveal_panic(t, ctx):
    """Belly mouth chomps in panic, tail puffs up, Pon stamps around in a circle of tiny hops."""
    p = ML.reveal_panic(t, ctx)
    n = ctx.style['reveal_panic']['frames'] / ML.FPS
    x = t / n
    flail = ML.env(x, 0.12, 0.2, 0.75, 0.92)
    jaw(p, 0.5 + 0.5 * math.sin(ML.TAU * 5 * x) * flail)
    puff = ML.env(x, 0.02, 0.1, 0.8, 1.0)
    for i in (1, 2, 3):
        p.scale[f'x_tail_{i:02d}'] = (1 + 0.25 * puff, 1 + 0.08 * puff, 1 + 0.25 * puff)
    tail(p, swing=12 * math.sin(ML.TAU * 3 * x) * flail, lift=18 * puff)
    return p


def hit(t, ctx):
    p = ML.hit(t, ctx)
    jaw(p, -0.25)
    return p


def victory(t, ctx):
    p = ML.victory(t, ctx)
    ph = t / (ctx.style['victory']['frames'] / ML.FPS)
    jaw(p, -0.25 + 0.4 * max(0.0, -math.sin(ML.TAU * ph)))
    tail(p, swing=15 * math.sin(ML.TAU * ph * 2), lift=10)
    return p


def drink_potion(t, ctx):
    """Pon pours the potion straight into the belly mouth (left hand stays out)."""
    p = ML.Pose()
    n = ctx.style['drink_potion']['frames'] / ML.FPS
    x = t / n
    lift = ML.env(x, 0.0, 0.3, 0.72, 1.0)
    tip = ML.env(x, 0.3, 0.45, 0.62, 0.78)
    p.r('RightArm', ML.arm('R', 5, 55 * lift)).r('RightForeArm', ML.elbow('R', 70 * lift))
    p.r('RightHand', ML.Q(y=-60 * tip))
    p.r('Spine1', ML.Q(x=-6 * tip))
    jaw(p, -0.3 * tip + 0.6 * ML.env(x, 0.7, 0.75, 0.8, 0.9))  # wide, then a satisfied chomp
    return p


CLIPS = {'walk': walk, 'run': run, 'idle': idle, 'reveal_panic': reveal_panic, 'hit': hit,
         'victory': victory, 'drink_potion': drink_potion}

SECONDARY = {
    'x_tail_03': {'gain': 0.8, 'lag': 3, 'limit': 16},
}
