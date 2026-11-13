"""env_lantern_stone (R04 festival kit). Geometry lives in ../kit/family.py so the family shares one frame.

Run: .venv-bpy/bin/python source/v2/environment/lantern_stone/build.py
Out: public/assets/env/v2/env_lantern_stone.glb
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'kit'))
from family import build  # noqa: E402

if __name__ == '__main__':
    build('env_lantern_stone')
