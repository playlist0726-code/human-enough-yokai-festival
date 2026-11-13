"""Mizu in disguise: the human-base walk, but she still clutches her hands near her chest and
takes careful steps (the habit gives her away)."""
from importlib import util as _u
import os as _os
_spec = _u.spec_from_file_location('human_base_motion', _os.path.join(_os.path.dirname(__file__), '..', 'human-base', 'motion.py'))
_base = _u.module_from_spec(_spec); _spec.loader.exec_module(_base)

STYLE = {k: (dict(v) if isinstance(v, dict) else v) for k, v in _base.STYLE.items()}
STYLE['walk'].update({'hands': 'chest', 'arm_swing': 10, 'step': 0.26, 'lean': 4})
STYLE['idle'].update({'hands': 'chest', 'look': 24})
CLIPS = dict(_base.CLIPS)
SECONDARY = {}
