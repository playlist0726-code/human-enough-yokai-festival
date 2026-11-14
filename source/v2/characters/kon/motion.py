"""Kon's personality on top of motion_lib (art bible §6: the neck goes first).

- The long neck (x_neck_01..04 between Spine1 and Neck) leads every move: a turn or a step starts
  at the head and travels DOWN the neck a few frames later; the body follows last.
- walk: light, sly, hips swaying, the neck carries a slow S-wave while the head stays almost level
  (like a periscope), ears bob a beat late, tails sway.
- idle: the neck snakes around to look; the floppy ear twitches; tails swish.
- reveal_panic: the neck shoots up (stretch), whips left/right, then cringes down; tails flare.
"""
import math
import motion_lib as ML

STYLE = {
    'idle': {'frames': 96, 'look': 0, 'hands': 'chest'},
    # legs ~12 cm: quick light steps (8 frames) so 3.6 u/s needs <= 1.8x; the slyness lives in the neck and hips
    'walk': {'frames': 8, 'step': 0.17, 'lift': 0.035, 'crouch': 0.03, 'bob': 0.01, 'sway': 0.02,
             'lean': 3, 'roll': 5, 'yaw': 7, 'arm_swing': 10, 'hands': 'chest', 'stance': 0.55, 'head_nod': 0},
    'run': {'frames': 9, 'step': 0.3, 'lift': 0.06, 'crouch': 0.035, 'bob': 0.025, 'sway': 0.012,
            'lean': 12, 'roll': 3, 'yaw': 6, 'arm_swing': 26, 'stance': 0.42, 'head_nod': 0},
    'hand_poses': {'chest': (-8, 45, 70), 'side': (10, 6, 14), 'up': (95, 20, 25)},
}

NECK = ['x_neck_01', 'x_neck_02', 'x_neck_03', 'x_neck_04']


def neck_wave(p, t, period, amp_x=0.0, amp_z=0.0, lag=0.08, lead=None):
    """S-wave travelling DOWN the neck (head first): segment i lags the head by i*lag seconds.
    lead(t) -> (pitch, yaw) of the head-end; each lower segment replays it later and weaker."""
    n = len(NECK)
    for i, b in enumerate(NECK):
        k = n - 1 - i                      # 0 at the top segment
        tt = t - k * lag
        w = 0.55 + 0.45 * (i / (n - 1))    # upper segments move more
        px = amp_x * math.sin(ML.TAU * tt / period) * (1 if i % 2 else -1) * w
        pz = amp_z * math.sin(ML.TAU * tt / period + 0.6) * w
        if lead:
            lx, lz = lead(tt)
            px += lx * w / n * 1.6
            pz += lz * w / n * 1.6
        p.r(b, ML.Q(x=px, z=pz))


def ears(p, t, period, droop=0.0):
    p.r('x_ear_L', ML.Q(x=4 * math.sin(ML.TAU * t / period - 0.9) + droop))
    p.r('x_ear_R', ML.Q(x=-3 * math.sin(ML.TAU * t / period - 1.2)))


def tails(p, t, period, amp=10.0, lift=0.0):
    for side, ph in (('L', 0.0), ('R', 1.4)):
        for i in (1, 2, 3):
            p.r(f'x_tail_{side}_{i:02d}', ML.Q(x=-lift * 0.3 * i, z=amp * (0.5 + 0.25 * i) * math.sin(ML.TAU * t / period + ph - 0.5 * i)))


def walk(t, ctx):
    st = ctx.style['walk']
    p, ph = ML.gait(t, ctx, st)
    T = st['frames'] / ML.FPS
    ML.hands(p, ctx, st['hands'], swing=st['arm_swing'] * math.sin(ML.TAU * ph))
    neck_wave(p, t, T * 2, amp_x=5, amp_z=6, lag=0.05)
    p.r('Head', ML.Q(z=-st['yaw'] * 0.8 * math.sin(ML.TAU * ph)))  # head stays level against the hip yaw
    ears(p, t, T / 2)
    tails(p, t, T * 2, amp=9)
    return p


def run(t, ctx):
    st = ctx.style['run']
    p, ph = ML.gait(t, ctx, st)
    T = st['frames'] / ML.FPS
    p.hips.z += st['bob'] * max(0.0, math.sin(2 * ML.TAU * ph - 0.4))
    for side in 'LR':
        s = 1 if side == 'L' else -1
        nm = 'Left' if side == 'L' else 'Right'
        p.r(nm + 'Arm', ML.arm(side, -15, 30 + st['arm_swing'] * math.sin(ML.TAU * ph) * s)).r(nm + 'ForeArm', ML.elbow(side, 80))
    # neck streams forward, head up
    for i, b in enumerate(NECK):
        p.r(b, ML.Q(x=6 + 2 * math.sin(ML.TAU * ph * 2 - i * 0.7)))
    p.r('Head', ML.Q(x=-st['lean'] - 18))
    ears(p, t, T, droop=-12)
    tails(p, t, T, amp=6, lift=15)
    return p


def idle(t, ctx):
    p = ML.idle(t, ctx)
    T = ctx.style['idle']['frames'] / ML.FPS
    ph = t / T
    # look left, then right: the head leads, the neck follows down its length
    look = lambda tt: (0.0, 40 * (ML.ease((tt / T - 0.12) / 0.1) - 2 * ML.ease((tt / T - 0.42) / 0.12) + ML.ease((tt / T - 0.75) / 0.1)))
    neck_wave(p, t, T / 3, amp_x=3, amp_z=2, lag=0.09, lead=look)
    twitch = 18 * ML.env(ph, 0.55, 0.57, 0.58, 0.62)
    ears(p, t, T / 4, droop=twitch)
    tails(p, t, T / 2, amp=12)
    return p


def reveal_panic(t, ctx):
    p = ML.reveal_panic(t, ctx)
    n = ctx.style['reveal_panic']['frames'] / ML.FPS
    x = t / n
    shoot = ML.env(x, 0.0, 0.1, 0.3, 0.5)      # neck shoots up
    whip = ML.env(x, 0.2, 0.3, 0.7, 0.85)
    cringe = ML.env(x, 0.7, 0.85, 0.95, 1.0)
    # neck shoots up by straightening its S (alternate segments counter-rotate against the rest curve);
    # no bone scale here: scale compounds down the chain and would inflate the head
    for i, b in enumerate(NECK):
        straight = (14 if i % 2 else -14) * shoot
        p.r(b, ML.Q(x=-4 * shoot + 9 * cringe, y=straight, z=30 * whip * math.sin(ML.TAU * 3 * x - i * 0.8) / 2))
    p.r('Head', ML.Q(x=-12 * shoot + 8 * cringe))
    ears(p, t, 0.2, droop=-20 * shoot)
    tails(p, t, 0.25, amp=22 * whip + 8, lift=30 * shoot)
    for side in 'LR':  # puff only the root: children inherit the scale
        p.scale[f'x_tail_{side}_01'] = (1 + 0.15 * whip, 1 + 0.05 * whip, 1 + 0.15 * whip)
    return p


def hit(t, ctx):
    p = ML.hit(t, ctx)
    n = ctx.style['hit']['frames'] / ML.FPS
    k = ML.ease_out(t / n / 0.2) * (1 - ML.ease((t / n - 0.3) / 0.7))
    for i, b in enumerate(NECK):
        p.r(b, ML.Q(x=-8 * k * (1 if i % 2 else -0.5)))
    return p


def victory(t, ctx):
    p = ML.victory(t, ctx)
    T = ctx.style['victory']['frames'] / ML.FPS
    neck_wave(p, t, T / 2, amp_x=6, amp_z=10, lag=0.06)
    tails(p, t, T / 2, amp=18, lift=12)
    return p


CLIPS = {'walk': walk, 'run': run, 'idle': idle, 'reveal_panic': reveal_panic, 'hit': hit, 'victory': victory}

SECONDARY = {
    'x_ear_L': {'gain': 1.0, 'lag': 2, 'limit': 18},
    'x_ear_R': {'gain': 0.6, 'lag': 2, 'limit': 10},
    'x_tail_L_03': {'gain': 0.7, 'lag': 3, 'limit': 14},
    'x_tail_R_03': {'gain': 0.7, 'lag': 3, 'limit': 14},
}
