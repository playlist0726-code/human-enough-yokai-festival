"""charkit — shared helpers for the v2 character pipeline (headless Blender / pip bpy 5.2).

Every stage script (clean_character.py, rig_contract.py, animate_contract.py, export_contract.py)
reads the same per-character config: source/v2/characters/<id>/character.json.
Paths in the config are relative to the repository root. Intermediate .blend files go to
build/v2/<id>/ (git-ignored); only the exported GLB and small sources are committed.

Conventions (match ASSET_CONTRACT v1 after glTF export):
  Blender armature space: character faces -Y, +X is the character's LEFT, +Z is up, feet at z=0.
  glTF export converts this to Y-up / front +Z.
"""
import json, math, os, sys
import bpy
from mathutils import Vector, Matrix, Quaternion, Euler

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))


def log(*a):
    print('[charkit]', *a, flush=True)


def load_config(path, _base=False):
    path = path if os.path.isabs(path) else os.path.join(REPO, path)
    with open(path) as f:
        cfg = json.load(f)
    if cfg.get('extends'):  # e.g. a human disguise built on source/v2/characters/human-base/base.json
        base = load_config(cfg['extends'], _base=True)
        base.pop('_dir', None)
        merged = {**base, **{k: v for k, v in cfg.items() if not isinstance(v, dict) or not isinstance(base.get(k), dict)}}
        for k, v in cfg.items():
            if isinstance(v, dict) and isinstance(base.get(k), dict):
                merged[k] = {**base[k], **v}
        cfg = merged
    cfg['_dir'] = os.path.dirname(path)
    if _base:
        return cfg
    cfg.setdefault('build_dir', f"build/v2/{cfg['id']}")
    os.makedirs(repo_path(cfg['build_dir']), exist_ok=True)
    return cfg


def repo_path(p):
    return p if os.path.isabs(p) else os.path.join(REPO, p)


def build_path(cfg, name):
    return os.path.join(repo_path(cfg['build_dir']), name)


def config_arg(argv=None):
    argv = argv if argv is not None else sys.argv
    argv = argv[argv.index('--') + 1:] if '--' in argv else argv[1:]
    if not argv:
        raise SystemExit('usage: <script> source/v2/characters/<id>/character.json')
    return argv[0]


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def open_blend(path):
    bpy.ops.wm.open_mainfile(filepath=path)


def save_blend(path):
    bpy.ops.wm.save_as_mainfile(filepath=path, compress=True)
    log('saved', os.path.relpath(path, REPO))


def ctx_override(active, selected=None):
    """Context override for operators in background mode."""
    selected = selected if selected is not None else [active]
    bpy.context.view_layer.update()
    names = {o.name for o in selected}
    for o in bpy.context.view_layer.objects:
        o.select_set(o.name in names)
    bpy.context.view_layer.objects.active = active
    return bpy.context.temp_override(active_object=active, object=active,
                                     selected_objects=selected, selected_editable_objects=selected)


def mesh_bounds(obj):
    vs = [obj.matrix_world @ v.co for v in obj.data.vertices]
    mn = Vector((min(v.x for v in vs), min(v.y for v in vs), min(v.z for v in vs)))
    mx = Vector((max(v.x for v in vs), max(v.y for v in vs), max(v.z for v in vs)))
    return mn, mx


def tri_count(obj):
    return sum(len(p.vertices) - 2 for p in obj.data.polygons)


def norm_box(cfg, box):
    """Config boxes are fractions of character height H: [x0,y0,z0,x1,y1,z1] in armature space
    (x: +left, y: +back, z: up). Returns two Vectors in metres."""
    h = cfg['height_m']
    return Vector(box[:3]) * h, Vector(box[3:]) * h


def in_box(p, lo, hi, pad=0.0):
    return all(lo[i] - pad <= p[i] <= hi[i] + pad for i in range(3))


def box_weight(p, lo, hi, falloff):
    """1 inside the box, fading to 0 over `falloff` metres outside it."""
    if falloff <= 0:
        return 1.0 if in_box(p, lo, hi) else 0.0
    d = 0.0
    for i in range(3):
        if p[i] < lo[i]:
            d = max(d, lo[i] - p[i])
        elif p[i] > hi[i]:
            d = max(d, p[i] - hi[i])
    return max(0.0, 1.0 - d / falloff)


def world_rot_to_basis(pose_bone, quat_armature):
    """Rotation given in armature axes (about the bone head) -> pose-bone basis quaternion."""
    rest = pose_bone.bone.matrix_local.to_quaternion()
    return rest.inverted() @ quat_armature @ rest


def euler_deg(x=0.0, y=0.0, z=0.0):
    return Euler((math.radians(x), math.radians(y), math.radians(z)), 'XYZ').to_quaternion()


def smoothstep(a, b, x):
    t = min(1.0, max(0.0, (x - a) / (b - a))) if b != a else float(x >= b)
    return t * t * (3 - 2 * t)


def write_json(path, data):
    with open(path, 'w') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write('\n')
