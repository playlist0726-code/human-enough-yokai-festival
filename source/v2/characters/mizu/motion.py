"""Mizu's personality on top of motion_lib (art bible §6: careful little scurrying steps).

- walk: short, quick, careful steps; hands clutched at the chest; slight forward hunch so the big
  head leads; head bobs a beat late. Feet barely lift (she does not want to spill her dish).
- run: still hands-in, but a frantic pitter-patter with a stronger lean.
- reveal_panic: the dish sloshes (x_dish follow-through) while she flails and looks around.
- the dish and shell get follow-through from acceleration (SECONDARY).
"""
import math
import motion_lib as ML

STYLE = {
    'idle': {'frames': 96, 'look': 26, 'hands': 'chest'},
    # chibi legs (~18 cm) at the server's 3.6 u/s = 1.5 m/s: the only honest answer is a fast scurry.
    # step is near the leg's reach; the runtime speeds the cycle up ~1.4x at full walking speed.
    'walk': {'frames': 10, 'step': 0.2, 'lift': 0.03, 'crouch': 0.035, 'bob': 0.01, 'sway': 0.01,
             'lean': 9, 'roll': 3, 'yaw': 5, 'arm_swing': 8, 'hands': 'chest', 'stance': 0.55, 'head_nod': 4},
    'run': {'frames': 9, 'step': 0.27, 'lift': 0.055, 'crouch': 0.036, 'bob': 0.022, 'sway': 0.008,
            'lean': 15, 'roll': 2.5, 'yaw': 6, 'arm_swing': 20, 'stance': 0.42, 'head_nod': 5},
    'hand_poses': {'chest': (-12, 55, 82), 'side': (8, 8, 18), 'up': (95, 20, 25)},
}


def run(t, ctx):
    """Hands stay near the chest even when running (protecting the dish), elbows pump."""
    st = ctx.style['run']
    p, ph = ML.gait(t, ctx, st)
    p.hips.z += st['bob'] * 1.1 * max(0.0, math.sin(2 * ML.TAU * ph - 0.4))
    for side in 'LR':
        s = 1 if side == 'L' else -1
        nm = 'Left' if side == 'L' else 'Right'
        pump = st['arm_swing'] * math.sin(ML.TAU * ph) * s
        p.r(nm + 'Arm', ML.arm(side, -14, 48 + pump))
        p.r(nm + 'ForeArm', ML.elbow(side, 88))
    return p


CLIPS = {'run': run}

SECONDARY = {
    'x_dish': {'gain': 0.9, 'lag': 2, 'limit': 14, 'squash': 0.004},
    'x_shell': {'gain': 0.5, 'lag': 1, 'limit': 8},
}
