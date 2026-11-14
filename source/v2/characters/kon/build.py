"""Rebuild Kon (yokai + reveal twin tails) from the generator result (headless Blender, pip bpy 5.2).

  .venv-bpy/bin/python source/v2/characters/pon/build.py [--from clean|rig|animate|export]

The human disguise (kon_human) belongs to R09 and extends source/v2/characters/human-base/base.json.
"""
import os, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))
rel = lambda p: os.path.relpath(os.path.join(HERE, p), REPO)
subprocess.run([sys.executable, os.path.join(REPO, 'source/v2/pipeline/build_character.py'),
                rel('character.json'), rel('reveal.json'), *sys.argv[1:]], check=True, cwd=REPO)
