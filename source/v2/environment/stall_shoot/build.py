"""env_stall_shoot (R04 festival kit). Geometry lives in ../kit/family.py so the family shares one frame.

Run: .venv-bpy/bin/python source/v2/environment/stall_shoot/build.py
Out: public/assets/env/v2/env_stall_shoot.glb
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'kit'))
from family import build  # noqa: E402

if __name__ == '__main__':
    build('env_stall_shoot')
