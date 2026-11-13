"""Human base motion: a yokai *pretending* to walk like a person (art bible §5: the disguise is the joke).

Upright, a little too stiff, arms swinging a little too evenly. Disguise configs reuse this and
override STYLE through their own motion file (e.g. mizu/motion_human.py imports * from here).
R09 NPCs use the same clips and add guest-only clips (charmed_walk, wait, cheer, talk).
"""
import math
import motion_lib as ML

STYLE = {
    'idle': {'frames': 90, 'look': 18, 'hands': 'side'},
    # server walk 3.6 u/s = 2.2 m/s for a 1.55 m chibi: brisk steps near the leg's reach (0.29 m legs)
    'walk': {'frames': 11, 'step': 0.28, 'lift': 0.05, 'crouch': 0.04, 'bob': 0.012, 'sway': 0.008,
             'lean': 2, 'roll': 2, 'yaw': 4, 'arm_swing': 26, 'hands': 'side', 'stance': 0.5, 'head_nod': 2},
    'run': {'frames': 11, 'step': 0.4, 'lift': 0.08, 'crouch': 0.035, 'bob': 0.03, 'sway': 0.008,
            'lean': 10, 'roll': 2, 'yaw': 7, 'arm_swing': 40, 'stance': 0.42, 'head_nod': 3},
    'hand_poses': {'chest': (-8, 50, 75), 'side': (12, 4, 12), 'up': (95, 20, 25)},
}

CLIPS = {}
SECONDARY = {}
