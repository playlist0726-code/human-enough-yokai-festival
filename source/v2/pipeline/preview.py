"""Review renders (Cycles CPU, no GPU needed).

  .venv-bpy/bin/python source/v2/pipeline/preview.py <character.json> [--stage clean|rigged|animated]
        [--bones] [--views 0,90,180,270] [--clip walk --frames 12] [--size 512] [--out dir]

--bones   draws the skeleton over a half-transparent mesh (check joint placement before skinning)
--clip    renders frames of an action (frame strip PNGs; tools/ turn them into a GIF)
Lighting mimics the game's night look: cool moon key, warm lantern fill, rim.
"""
import argparse, math, os, sys
import bpy
from mathutils import Vector, Matrix, Euler
sys.path.insert(0, os.path.dirname(__file__))
import charkit as K


def setup_scene(size, bg=(0.11, 0.12, 0.2)):
    scn = bpy.context.scene
    scn.render.engine = 'CYCLES'
    scn.cycles.device = 'CPU'
    scn.cycles.samples = 24
    scn.cycles.use_denoising = True
    scn.render.resolution_x = scn.render.resolution_y = size
    scn.render.film_transparent = False
    scn.view_settings.view_transform = 'AgX'
    world = bpy.data.worlds.new('w') if not scn.world else scn.world
    scn.world = world
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs[0].default_value = (*bg, 1)
    world.node_tree.nodes['Background'].inputs[1].default_value = 0.6
    def light(name, kind, energy, color, rot, size_=1.0):
        d = bpy.data.lights.new(name, kind)
        d.energy, d.color = energy, color
        if kind == 'AREA':
            d.size = size_
        o = bpy.data.objects.new(name, d)
        o.rotation_euler = Euler([math.radians(a) for a in rot])
        scn.collection.objects.link(o)
        return o
    light('key', 'SUN', 3.2, (1.0, 0.9, 0.8), (50, 0, 25))
    light('fill', 'SUN', 1.2, (0.65, 0.75, 1.0), (60, 0, -110))
    light('rim', 'SUN', 2.0, (0.75, 0.85, 1.0), (110, 0, 180))


def camera(height, yaw_deg):
    cam = bpy.data.objects.get('__cam')
    if not cam:
        cam = bpy.data.objects.new('__cam', bpy.data.cameras.new('__cam'))
        bpy.context.scene.collection.objects.link(cam)
    cam.data.type = 'ORTHO'
    cam.data.ortho_scale = height * 1.25
    r = height * 4
    a = math.radians(yaw_deg)
    # yaw 0 = looking at the character's face (character faces -Y)
    cam.location = Vector((math.sin(a) * r, -math.cos(a) * r, height * 0.5))
    cam.rotation_euler = Euler((math.radians(90), 0, a))
    bpy.context.scene.camera = cam
    return cam


def bone_sticks(arm):
    mat = bpy.data.materials.new('__bone')
    mat.use_nodes = True
    em = mat.node_tree.nodes.new('ShaderNodeEmission')
    em.inputs['Color'].default_value = (1, 0.15, 0.1, 1)
    em.inputs['Strength'].default_value = 3
    mat.node_tree.links.new(em.outputs[0], mat.node_tree.nodes['Material Output'].inputs['Surface'])
    for b in arm.data.bones:
        h, t = arm.matrix_world @ b.head_local, arm.matrix_world @ b.tail_local
        bpy.ops.mesh.primitive_cylinder_add(radius=0.006, depth=(t - h).length, location=(h + t) / 2)
        c = bpy.context.active_object
        c.rotation_mode = 'QUATERNION'
        c.rotation_quaternion = Vector((0, 0, 1)).rotation_difference((t - h).normalized())
        c.data.materials.append(mat)
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.012, location=h)
        bpy.context.active_object.data.materials.append(mat)
    for o in bpy.data.objects:
        if o.type == 'EMPTY' and o.name.startswith('socket_'):
            bpy.ops.mesh.primitive_ico_sphere_add(radius=0.02, location=o.matrix_world.translation)
            bpy.context.active_object.data.materials.append(mat)


def ghost(mesh):
    for mat in mesh.data.materials:
        nt = mat.node_tree
        bsdf = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
        bsdf.inputs['Alpha'].default_value = 0.35


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('cfg')
    ap.add_argument('--stage', default='clean')
    ap.add_argument('--bones', action='store_true')
    ap.add_argument('--views', default='0,90,180')
    ap.add_argument('--clip')
    ap.add_argument('--frames', type=int, default=0)
    ap.add_argument('--every', type=int, default=1)
    ap.add_argument('--view', type=float, default=30)
    ap.add_argument('--size', type=int, default=512)
    ap.add_argument('--samples', type=int, default=24)
    ap.add_argument('--out')
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
    a = ap.parse_args(argv)
    cfg = K.load_config(a.cfg)
    K.open_blend(K.build_path(cfg, f'{a.stage}.blend'))
    out = a.out or K.build_path(cfg, 'preview')
    os.makedirs(out, exist_ok=True)
    setup_scene(a.size)
    bpy.context.scene.cycles.samples = a.samples
    mesh = bpy.data.objects[cfg['id']]
    arm = bpy.data.objects.get('Armature')
    if a.bones and arm:
        ghost(mesh)
        bone_sticks(arm)
    h = cfg['height_m'] * 1.08
    if a.clip:
        act = bpy.data.actions[a.clip]
        arm.animation_data_create()
        arm.animation_data.action = act
        if act.slots:
            arm.animation_data.action_slot = act.slots[0]
        n = a.frames or int(act.frame_range[1])
        camera(h, a.view)
        for f in range(0, n + 1, a.every):
            bpy.context.scene.frame_set(f)
            bpy.context.scene.render.filepath = os.path.join(out, f'{a.clip}_{f:03d}.png')
            bpy.ops.render.render(write_still=True)
        K.log('rendered', a.clip, n + 1, 'frames to', out)
        return
    for yaw in [float(v) for v in a.views.split(',')]:
        camera(h, yaw)
        tag = 'bones_' if a.bones else ''
        bpy.context.scene.render.filepath = os.path.join(out, f'{a.stage}_{tag}{int(yaw):03d}.png')
        bpy.ops.render.render(write_still=True)
    K.log('preview written to', out)


if __name__ == '__main__':
    main()
