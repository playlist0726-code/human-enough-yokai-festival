"""Stage 2 — clean mesh -> contract skeleton, skin weights, sockets, face morphs.

  .venv-bpy/bin/python source/v2/pipeline/rig_contract.py source/v2/characters/<id>/character.json

Reads build/v2/<id>/clean.blend, writes build/v2/<id>/rigged.blend.

Skeleton: the 16 contract bones + Spine1, LeftShoulder/RightShoulder, LeftToeBase/RightToeBase,
plus the character's `x_` bones from config. Joint positions come from `skeleton` in the config
(fractions of height, LEFT side only; the right side is mirrored). Check them with
`preview.py <cfg> --bones` before trusting the weights.

Weights: Blender bone-heat on a voxel-remeshed proxy (generated meshes are rarely manifold, which
makes bone-heat fail on the real mesh), transferred to the game mesh, then `weight_overrides`
(rigid regions such as a chibi head, the dish, the shell) and a 4-influence limit.

Config:
  skeleton   {"Hips":[x,y,z], "Spine":..., "Spine1":..., "Neck":..., "Head":..., "HeadTop":...,
              "LeftShoulder":..., "LeftArm":..., "LeftForeArm":..., "LeftHand":..., "LeftHandTip":...,
              "LeftUpLeg":..., "LeftLeg":..., "LeftFoot":..., "LeftToeBase":..., "LeftToeTip":...}
  extra_bones [{"name":"x_dish","parent":"Head","head":[..],"tail":[..],"mirror":false}]
              chains: {"name":"x_neck_{i:02d}","parent":"Spine1","points":[[..],[..],...]}
  weight_overrides [{"bone":"Head","box":[..6..],"falloff":0.02,"strength":1.0,"material":"eyes"?}]
  sockets    {"socket_hand_R":{"bone":"RightHand","at":[x,y,z]}, ...}   (positions as fractions of H)
  morphs     {"eye_material":"eyes", "blink_squash":0.08}
"""
import math, os, sys
import bpy, bmesh
from mathutils import Vector, Matrix
sys.path.insert(0, os.path.dirname(__file__))
import charkit as K

CHAIN = [  # name, head joint, tail joint, parent
    ('Hips', 'Hips', 'Spine', None),
    ('Spine', 'Spine', 'Spine1', 'Hips'),
    ('Spine1', 'Spine1', 'Neck', 'Spine'),
    ('Neck', 'Neck', 'Head', 'Spine1'),
    ('Head', 'Head', 'HeadTop', 'Neck'),
    ('LeftShoulder', 'LeftShoulder', 'LeftArm', 'Spine1'),
    ('LeftArm', 'LeftArm', 'LeftForeArm', 'LeftShoulder'),
    ('LeftForeArm', 'LeftForeArm', 'LeftHand', 'LeftArm'),
    ('LeftHand', 'LeftHand', 'LeftHandTip', 'LeftForeArm'),
    ('LeftUpLeg', 'LeftUpLeg', 'LeftLeg', 'Hips'),
    ('LeftLeg', 'LeftLeg', 'LeftFoot', 'LeftUpLeg'),
    ('LeftFoot', 'LeftFoot', 'LeftToeBase', 'LeftLeg'),
    ('LeftToeBase', 'LeftToeBase', 'LeftToeTip', 'LeftFoot'),
]


def mirror_name(n):
    if n.startswith('Left'):
        return 'Right' + n[4:]
    for a, b in (('_L_', '_R_'), ('_L', '_R')):
        if a in n:
            return n.replace(a, b)
    return n


def joints(cfg):
    h = cfg['height_m']
    j = {k: Vector(v) * h for k, v in cfg['skeleton'].items()}
    for k, v in list(j.items()):
        if k.startswith('Left'):
            j['Right' + k[4:]] = Vector((-v.x, v.y, v.z))
    return j


def build_armature(cfg, mesh):
    j = joints(cfg)
    arm_data = bpy.data.armatures.new('Armature')
    arm = bpy.data.objects.new('Armature', arm_data)
    bpy.context.scene.collection.objects.link(arm)
    arm.show_in_front = True
    with K.ctx_override(arm):
        bpy.ops.object.mode_set(mode='EDIT')
        eb = arm_data.edit_bones
        chain = list(CHAIN) + [(mirror_name(a), mirror_name(b), mirror_name(c), mirror_name(d) if d else None)
                               for a, b, c, d in CHAIN if a.startswith('Left')]
        for name, hj, tj, parent in chain:
            b = eb.new(name)
            b.head, b.tail = j[hj], j[tj]
            if (b.tail - b.head).length < 1e-4:
                b.tail = b.head + Vector((0, 0, 0.02))
            # roll: keep bone Z pointing back (+Y) for up/down bones, up (+Z) for sideways/forward bones
            b.align_roll(Vector((0, 1, 0)) if abs((b.tail - b.head).normalized().z) > 0.7 else Vector((0, 0, 1)))
        for name, hj, tj, parent in chain:
            if parent:
                eb[name].parent = eb[parent]
                eb[name].use_connect = False
        h = cfg['height_m']
        for x in cfg.get('extra_bones', []):
            names_pts = []
            if 'points' in x:  # chain of bones through points
                pts = [Vector(p) * h for p in x['points']]
                names_pts = [(x['name'].format(i=i + 1), pts[i], pts[i + 1]) for i in range(len(pts) - 1)]
            else:
                names_pts = [(x['name'], Vector(x['head']) * h, Vector(x['tail']) * h)]
            sides = [(names_pts, x['parent'])]
            if x.get('mirror'):
                sides.append(([(mirror_name(n), Vector((-a.x, a.y, a.z)), Vector((-b.x, b.y, b.z))) for n, a, b in names_pts],
                              mirror_name(x['parent'])))
            for pts, parent in sides:
                prev = eb[parent]
                for n, a, b in pts:
                    bone = eb.new(n)
                    bone.head, bone.tail = a, b
                    bone.align_roll(Vector((0, 1, 0)) if abs((b - a).normalized().z) > 0.7 else Vector((0, 0, 1)))
                    bone.parent = prev
                    prev = bone
        bpy.ops.object.mode_set(mode='OBJECT')
    for b in arm_data.bones:
        b.use_deform = True
    K.log('armature', len(arm_data.bones), 'bones')
    return arm


def skin(cfg, mesh, arm):
    """Bone heat on a voxel proxy, transferred to the real mesh."""
    proxy = mesh.copy()
    proxy.data = mesh.data.copy()
    proxy.name = '__proxy'
    bpy.context.scene.collection.objects.link(proxy)
    proxy.data.shape_keys and proxy.shape_key_clear()
    rm = proxy.modifiers.new('remesh', 'REMESH')
    rm.mode = 'VOXEL'
    rm.voxel_size = cfg['height_m'] * cfg.get('proxy_voxel', 0.008)
    with K.ctx_override(proxy):
        bpy.ops.object.modifier_apply(modifier=rm.name)
    K.log('proxy', len(proxy.data.vertices), 'verts')
    with K.ctx_override(arm, [proxy, arm]):
        bpy.ops.object.parent_set(type='ARMATURE_AUTO')
    used = {x.group for v in proxy.data.vertices for x in v.groups if x.weight > 0.01}
    empty = [g.name for g in proxy.vertex_groups if g.index not in used]
    if len(proxy.vertex_groups) == 0:
        raise SystemExit('bone heat produced no groups')
    for b in arm.data.bones:
        if b.name not in mesh.vertex_groups:
            mesh.vertex_groups.new(name=b.name)
    dt = mesh.modifiers.new('weights', 'DATA_TRANSFER')
    dt.object = proxy
    dt.use_vert_data = True
    dt.data_types_verts = {'VGROUP_WEIGHTS'}
    dt.vert_mapping = 'POLYINTERP_NEAREST'
    dt.layers_vgroup_select_src = 'ALL'
    dt.layers_vgroup_select_dst = 'NAME'
    with K.ctx_override(mesh):
        bpy.ops.object.modifier_apply(modifier=dt.name)
    bpy.data.objects.remove(proxy, do_unlink=True)
    mod = mesh.modifiers.new('Armature', 'ARMATURE')
    mod.object = arm
    mesh.parent = arm
    K.log('weights transferred; bones without heat on proxy:', [n for n in empty][:10])


def overrides(cfg, mesh, arm):
    """Blend each vertex toward a rigid bone inside config boxes, then keep the top 4 and normalise."""
    groups = {g.name: g.index for g in mesh.vertex_groups}
    names = {i: n for n, i in groups.items()}
    mat_names = [m.name for m in mesh.data.materials]
    vmat = {}
    for p in mesh.data.polygons:
        for vi in p.vertices:
            vmat.setdefault(vi, set()).add(mat_names[p.material_index].split('_', 1)[-1])
    rules = []
    for o in cfg.get('weight_overrides', []):
        lo, hi = K.norm_box(cfg, o['box'])
        rules.append((o['bone'], lo, hi, o.get('falloff', 0.0) * cfg['height_m'], o.get('strength', 1.0), o.get('material')))
        if o.get('mirror'):
            rules.append((mirror_name(o['bone']), Vector((-hi.x, lo.y, lo.z)), Vector((-lo.x, hi.y, hi.z)),
                          o.get('falloff', 0.0) * cfg['height_m'], o.get('strength', 1.0), o.get('material')))
    changed = 0
    for v in mesh.data.vertices:
        w = {names[g.group]: g.weight for g in v.groups if g.weight > 0}
        for bone, lo, hi, fall, strength, mat in rules:
            if mat and mat not in vmat.get(v.index, ()):
                continue
            f = K.box_weight(v.co, lo, hi, fall) * strength
            if f <= 0:
                continue
            tot = sum(w.values()) or 1.0
            w = {k: x / tot * (1 - f) for k, x in w.items()}
            w[bone] = w.get(bone, 0) + f
            changed += 1
        top = sorted(w.items(), key=lambda kv: -kv[1])[:4]
        tot = sum(x for _, x in top)
        if tot <= 0:  # unweighted vertex: nearest bone head
            nearest = min(arm.data.bones, key=lambda b: (b.head_local - v.co).length).name
            top, tot = [(nearest, 1.0)], 1.0
        for g in list(v.groups):
            mesh.vertex_groups[g.group].remove([v.index])
        for k, x in top:
            mesh.vertex_groups[k].add([v.index], x / tot, 'REPLACE')
    K.log('weight overrides touched', changed, 'vertex/rule pairs')


def sockets(cfg, arm):
    h = cfg['height_m']
    for name, s in cfg.get('sockets', {}).items():
        e = bpy.data.objects.new(name, None)
        e.empty_display_size = 0.04
        bpy.context.scene.collection.objects.link(e)
        e.parent = arm
        e.parent_type = 'BONE'
        e.parent_bone = s['bone']
        bpy.context.view_layer.update()
        e.matrix_world = Matrix.Translation(Vector(s['at']) * h)
    K.log('sockets', list(cfg.get('sockets', {})))


def morphs(cfg, mesh):
    """face_blink (eye squashed to a line) and face_shock (eye widened) from the eye material."""
    m = cfg.get('morphs', {})
    eye_mat = [i for i, mat in enumerate(mesh.data.materials) if mat.name.endswith('_' + m.get('eye_material', 'eyes'))]
    if not eye_mat:
        K.log('no eye material -> no face morphs')
        return
    eye_v = sorted({vi for p in mesh.data.polygons if p.material_index in eye_mat for vi in p.vertices})
    # include body verts that touch the eye rim (eyelid skin) so the squash does not tear
    pts = [mesh.data.vertices[i].co for i in eye_v]
    c = sum(pts, Vector()) / len(pts)
    rz = max(abs(p.z - c.z) for p in pts)
    mesh.shape_key_add(name='Basis')
    blink = mesh.shape_key_add(name='face_blink')
    shock = mesh.shape_key_add(name='face_shock')
    sq = m.get('blink_squash', 0.08)
    for i in eye_v:
        p = mesh.data.vertices[i].co
        blink.data[i].co = Vector((p.x, p.y + (rz * 0.15 if p.y < c.y else 0), c.z + (p.z - c.z) * sq))
        shock.data[i].co = c + (p - c) * Vector((1.16, 1.0, 1.2))
    blink.value = shock.value = 0.0  # Blender 5 adds new keys at 1.0; the contract default is 0
    K.log('morphs face_blink/face_shock on', len(eye_v), 'eye verts')


def run(cfg_path):
    cfg = K.load_config(cfg_path)
    K.open_blend(K.build_path(cfg, 'clean.blend'))
    mesh = bpy.data.objects[cfg['id']]
    arm = build_armature(cfg, mesh)
    skin(cfg, mesh, arm)
    overrides(cfg, mesh, arm)
    morphs(cfg, mesh)
    sockets(cfg, arm)
    K.save_blend(K.build_path(cfg, 'rigged.blend'))


if __name__ == '__main__':
    run(K.config_arg())
