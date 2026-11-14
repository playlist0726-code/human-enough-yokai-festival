"""Rebuild every Sumi asset from the generator results (headless Blender, pip bpy 5.2).

  .venv-bpy/bin/python source/v2/characters/sumi/build.py [--from clean|rig|animate|export]

Order matters: the reveal prop is cut from the finished yokai mesh.
Outputs: source/v2/characters/sumi/export/*.glb (validated) and public/assets/models/v2/sumi_*.glb.
"""
import os, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))
rel = lambda p: os.path.relpath(os.path.join(HERE, p), REPO)
subprocess.run([sys.executable, os.path.join(REPO, 'source/v2/pipeline/build_character.py'),
                rel('character.json'), rel('reveal.json'), *sys.argv[1:]], check=True, cwd=REPO)
