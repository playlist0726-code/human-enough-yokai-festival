"""Stage 1 — generated mesh -> one clean game mesh.

  .venv-bpy/bin/python source/v2/pipeline/clean_character.py source/v2/characters/<id>/character.json

Steps: import raw GLB -> join -> orient/scale (feet at z=0, facing -Y) -> drop floating bits ->
decimate to `target_tris` -> UV (smart project + pack) -> bake from the high-res mesh
(baseColor 2048, normal, AO + roughness -> ORM) -> classify faces into body/cloth/eyes materials
by region + baked colour -> optional texture paint pass (paint.py hook) -> build/v2/<id>/clean.blend

Config keys used (character.json):
  raw            path to the generator GLB (source/v2/characters/<id>/raw/*.glb)
  height_m       real height in metres after scaling (feet to top)
  yaw_deg        extra rotation about Z if the generator faced the wrong way (0 = already -Y)
  target_tris    triangle budget for the clean mesh (player <= 25000; leave headroom ~22000)
  min_island     drop loose parts whose bbox diagonal is below this fraction of height (0.03)
  texture        {"base":2048,"orm":1024,"normal":1024}
  materials      ordered list of face classes; the first matching class wins, default "body":
                 {"name":"eyes","region":[x0,y0,z0,x1,y1,z1],"rules":[{"s_max":.3,"v_min":.72},{"v_max":.18}]}
  roughness      {"body":[0.55,0.75],"cloth":[0.6,0.8]} clamp range for the baked roughness
"""
import colorsys, math, os, sys
import bpy, bmesh
import numpy as np
from mathutils import Vector, Matrix
sys.path.insert(0, os.path.dirname(__file__))
import charkit as K


def import_raw(cfg):
    K.reset()
    bpy.ops.import_scene.gltf(filepath=K.repo_path(cfg['raw']))
    vl = bpy.context.view_layer.objects
    for o in [o for o in bpy.context.scene.objects if o.name not in vl]:
        bpy.data.objects.remove(o, do_unlink=True)  # hidden helper nodes
    import re
    for o in [o for o in bpy.context.scene.objects if cfg.get('exclude') and re.search(cfg['exclude'], o.name)]:
        bpy.data.objects.remove(o, do_unlink=True)  # config `exclude`: regex of node names to drop
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    if not meshes:
        raise SystemExit('raw GLB has no meshes')
    # Unparent (generators often wrap the mesh in transformed empties) and apply transforms.
    for o in meshes:
        o.modifiers.clear()
        if o.data.shape_keys:
            o.shape_key_clear()
        mw = o.matrix_world.copy()
        o.parent = None
        o.matrix_world = mw
    for o in [o for o in bpy.context.scene.objects if o.type != 'MESH']:
        bpy.data.objects.remove(o, do_unlink=True)
    with K.ctx_override(meshes[0], meshes):
        if len(meshes) > 1:
            bpy.ops.object.join()
    obj = bpy.context.view_layer.objects.active
    obj.name = 'hi'
    obj.data.name = 'hi'
    with K.ctx_override(obj):
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    K.log('raw', len(obj.data.vertices), 'verts', K.tri_count(obj), 'tris', len(obj.data.materials), 'materials')
    return obj


def orient_and_scale(obj, cfg):
    if cfg.get('yaw_deg'):
        obj.data.transform(Matrix.Rotation(math.radians(cfg['yaw_deg']), 4, 'Z'))
    mn, mx = K.mesh_bounds(obj)
    s = cfg['height_m'] / (mx.z - mn.z)
    obj.data.transform(Matrix.Scale(s, 4))
    mn, mx = K.mesh_bounds(obj)
    # centre x/y on the feet (lowest 12 % of the mesh) so the origin sits between the feet
    low = [v.co for v in obj.data.vertices if v.co.z < mn.z + (mx.z - mn.z) * 0.12]
    cx = (min(v.x for v in low) + max(v.x for v in low)) / 2
    cy = (min(v.y for v in low) + max(v.y for v in low)) / 2
    obj.data.transform(Matrix.Translation((-cx, -cy, -mn.z)))
    obj.data.update()
    mn, mx = K.mesh_bounds(obj)
    K.log('scaled to', round(mx.z, 3), 'm; width', round(mx.x - mn.x, 3), 'depth', round(mx.y - mn.y, 3))


def remove_islands(obj, cfg):
    frac = cfg.get('min_island', 0.03)
    h = cfg['height_m']
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bm.verts.ensure_lookup_table()
    seen, kill = set(), []
    for v in bm.verts:
        if v.index in seen:
            continue
        stack, comp = [v], []
        seen.add(v.index)
        while stack:
            c = stack.pop()
            comp.append(c)
            for e in c.link_edges:
                o = e.other_vert(c)
                if o.index not in seen:
                    seen.add(o.index)
                    stack.append(o)
        xs = [c.co for c in comp]
        diag = (Vector((max(p.x for p in xs), max(p.y for p in xs), max(p.z for p in xs))) -
                Vector((min(p.x for p in xs), min(p.y for p in xs), min(p.z for p in xs)))).length
        if diag < frac * h:
            kill.extend(comp)
    if kill:
        bmesh.ops.delete(bm, geom=list(set(kill)), context='VERTS')
    bm.to_mesh(obj.data)
    bm.free()
    K.log('removed', len(kill), 'verts in floating bits')


def make_low(hi, cfg):
    lo = hi.copy()
    lo.data = hi.data.copy()
    lo.name = lo.data.name = cfg['id']
    bpy.context.scene.collection.objects.link(lo)
    target = cfg.get('target_tris', 22000)
    have = K.tri_count(lo)
    # merge welds first so decimation sees a connected surface
    bm = bmesh.new(); bm.from_mesh(lo.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=cfg['height_m'] * 2e-4)
    bm.to_mesh(lo.data); bm.free()
    if have > target:
        m = lo.modifiers.new('decimate', 'DECIMATE')
        m.decimate_type = 'COLLAPSE'
        m.ratio = target / K.tri_count(lo)
        m.use_collapse_triangulate = True
        with K.ctx_override(lo):
            bpy.ops.object.modifier_apply(modifier=m.name)
    for p in lo.data.polygons:
        p.use_smooth = True
    lo.data.materials.clear()
    lo.vertex_groups.clear()
    for uv in list(lo.data.uv_layers):
        lo.data.uv_layers.remove(uv)
    K.log('low', K.tri_count(lo), 'tris (target', target, ')')
    return lo


def unwrap(lo, cfg):
    lo.data.uv_layers.new(name='UVMap')
    with K.ctx_override(lo):
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.uv.smart_project(angle_limit=math.radians(cfg.get('uv_angle', 60)), island_margin=0.002,
                                 area_weight=0.0, correct_aspect=True, scale_to_bounds=False)
        bpy.ops.uv.pack_islands(rotate=True, margin=0.003)
        bpy.ops.object.mode_set(mode='OBJECT')


def new_image(name, size, data=False, alpha=False):
    img = bpy.data.images.get(name) or bpy.data.images.new(name, size, size, alpha=alpha, float_buffer=False)
    if img.size[0] != size:
        img.scale(size, size)
    img.colorspace_settings.name = 'Non-Color' if data else 'sRGB'
    return img


def bake_target_material(lo, img):
    """Temporary material on the low mesh with `img` as the active node (bake destination)."""
    mat = bpy.data.materials.get('__bake') or bpy.data.materials.new('__bake')
    mat.use_nodes = True
    nt = mat.node_tree
    for n in list(nt.nodes):
        if n.type == 'TEX_IMAGE':
            nt.nodes.remove(n)
    node = nt.nodes.new('ShaderNodeTexImage')
    node.image = img
    nt.nodes.active = node
    lo.data.materials.clear()
    lo.data.materials.append(mat)
    return mat


def bake(lo, hi, cfg, kind, img, selected_to_active=True, samples=1):
    scn = bpy.context.scene
    scn.render.engine = 'CYCLES'
    scn.cycles.device = 'CPU'
    scn.cycles.samples = samples
    scn.render.bake.use_selected_to_active = selected_to_active
    scn.render.bake.cage_extrusion = cfg['height_m'] * cfg.get('cage', 0.012)
    scn.render.bake.max_ray_distance = cfg['height_m'] * 0.05
    scn.render.bake.margin = 8
    scn.render.bake.target = 'IMAGE_TEXTURES'
    bake_target_material(lo, img)
    sel = [hi, lo] if selected_to_active else [lo]
    kw = {'type': kind}
    if kind == 'DIFFUSE':
        kw['pass_filter'] = {'COLOR'}
    if kind == 'NORMAL':
        kw.update(normal_space='TANGENT')
    with K.ctx_override(lo, sel):
        bpy.ops.object.bake(**kw)
    K.log('baked', kind, img.name)


def pixels(img):
    a = np.empty(img.size[0] * img.size[1] * 4, dtype=np.float32)
    img.pixels.foreach_get(a)
    return a.reshape(img.size[1], img.size[0], 4)


def set_pixels(img, arr):
    img.pixels.foreach_set(arr.astype(np.float32).ravel())
    img.update()


def classify_faces(lo, cfg, base_px):
    """Return {material name: [face indices]} using region boxes + baked colour rules."""
    classes = cfg.get('materials', [])
    h, w = base_px.shape[:2]
    uv = lo.data.uv_layers.active.data
    names = [c['name'] for c in classes]
    label = []
    for poly in lo.data.polygons:
        c = poly.center
        u = sum(uv[i].uv.x for i in poly.loop_indices) / len(poly.loop_indices)
        v = sum(uv[i].uv.y for i in poly.loop_indices) / len(poly.loop_indices)
        r, g, b, _ = base_px[min(h - 1, max(0, int(v * h))), min(w - 1, max(0, int(u * w)))]
        hh, ss, vv = colorsys.rgb_to_hsv(r ** (1 / 2.2), g ** (1 / 2.2), b ** (1 / 2.2))
        lab = 'body'
        for cls in classes:
            lo_, hi_ = K.norm_box(cfg, cls['region'])
            if not K.in_box(c, lo_, hi_):
                continue
            for rule in cls.get('rules', [{}]):
                ok = (ss <= rule.get('s_max', 1) and ss >= rule.get('s_min', 0) and vv <= rule.get('v_max', 1)
                      and vv >= rule.get('v_min', 0))
                if 'h_min' in rule or 'h_max' in rule:
                    a, z = rule.get('h_min', 0), rule.get('h_max', 1)
                    ok = ok and ((a <= hh <= z) if a <= z else (hh >= a or hh <= z))
                if ok:
                    lab = cls['name']
                    break
            if lab != 'body':
                break
        label.append(lab)
    # majority smoothing over edge-neighbours removes speckle at colour boundaries
    bm = bmesh.new(); bm.from_mesh(lo.data); bm.faces.ensure_lookup_table()
    for _ in range(cfg.get('material_smooth', 2)):
        new = label[:]
        for f in bm.faces:
            votes = {}
            for e in f.edges:
                for nf in e.link_faces:
                    if nf.index != f.index:
                        votes[label[nf.index]] = votes.get(label[nf.index], 0) + 1
            if votes:
                best = max(votes, key=votes.get)
                if votes[best] >= 2 and best != label[f.index]:
                    new[f.index] = best
        label = new
    bm.free()
    out = {}
    for i, lab in enumerate(label):
        out.setdefault(lab, []).append(i)
    K.log('material faces', {k: len(v) for k, v in out.items()}, 'classes', ['body'] + names)
    return out


def principled(mat):
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled')
    nt.links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    return nt, bsdf


def gltf_output_group():
    """The 'glTF Material Output' node group the exporter reads occlusion from."""
    g = bpy.data.node_groups.get('glTF Material Output')
    if g:
        return g
    g = bpy.data.node_groups.new('glTF Material Output', 'ShaderNodeTree')
    g.interface.new_socket('Occlusion', in_out='INPUT', socket_type='NodeSocketFloat')
    g.interface.new_socket('Thickness', in_out='INPUT', socket_type='NodeSocketFloat')
    g.nodes.new('NodeGroupInput')
    return g


def build_materials(lo, cfg, imgs, faces):
    """body/cloth: baseColor + ORM + normal. eyes: same baseColor, glossy clearcoat, no ORM."""
    lo.data.materials.clear()
    order = ['body'] + [c['name'] for c in cfg.get('materials', []) if c['name'] in faces]
    rough = cfg.get('roughness', {})
    for name in order:
        mat = bpy.data.materials.new(f"{cfg['id']}_{name}")
        nt, bsdf = principled(mat)
        tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = imgs['base']
        nt.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
        nrm = nt.nodes.new('ShaderNodeTexImage'); nrm.image = imgs['normal']
        nmap = nt.nodes.new('ShaderNodeNormalMap')
        nt.links.new(nrm.outputs['Color'], nmap.inputs['Color'])
        nt.links.new(nmap.outputs['Normal'], bsdf.inputs['Normal'])
        if name == 'eyes':
            bsdf.inputs['Roughness'].default_value = 0.12
            bsdf.inputs['Metallic'].default_value = 0.0
            bsdf.inputs['Coat Weight'].default_value = 1.0
            bsdf.inputs['Coat Roughness'].default_value = 0.05
        else:
            orm = nt.nodes.new('ShaderNodeTexImage'); orm.image = imgs['orm']
            sep = nt.nodes.new('ShaderNodeSeparateColor')
            nt.links.new(orm.outputs['Color'], sep.inputs['Color'])
            nt.links.new(sep.outputs['Green'], bsdf.inputs['Roughness'])
            nt.links.new(sep.outputs['Blue'], bsdf.inputs['Metallic'])
            grp = nt.nodes.new('ShaderNodeGroup'); grp.node_tree = gltf_output_group()
            nt.links.new(sep.outputs['Red'], grp.inputs['Occlusion'])
            if name == 'cloth':
                bsdf.inputs['Sheen Weight'].default_value = cfg.get('cloth_sheen', 0.35)
                bsdf.inputs['Sheen Roughness'].default_value = 0.5
        lo.data.materials.append(mat)
    idx = {n: i for i, n in enumerate(order)}
    for name, fl in faces.items():
        for f in fl:
            lo.data.polygons[f].material_index = idx[name]
    return order


def run(cfg_path):
    cfg = K.load_config(cfg_path)
    hi = import_raw(cfg)
    orient_and_scale(hi, cfg)
    remove_islands(hi, cfg)
    lo = make_low(hi, cfg)
    unwrap(lo, cfg)
    tex = {'base': 2048, 'orm': 1024, 'normal': 1024, **cfg.get('texture', {})}
    imgs = {
        'base': new_image(f"{cfg['id']}_baseColor", tex['base']),
        'normal': new_image(f"{cfg['id']}_normal", tex['normal'], data=True),
        'rough': new_image('__rough', tex['orm'], data=True),
        'ao': new_image('__ao', tex['orm'], data=True),
        'orm': new_image(f"{cfg['id']}_orm", tex['orm'], data=True),
    }
    bake(lo, hi, cfg, 'DIFFUSE', imgs['base'])
    bake(lo, hi, cfg, 'NORMAL', imgs['normal'])
    bake(lo, hi, cfg, 'ROUGHNESS', imgs['rough'])
    hi.hide_render = True
    bake(lo, hi, cfg, 'AO', imgs['ao'], selected_to_active=False, samples=cfg.get('ao_samples', 48))
    hi.hide_render = False
    base_px = pixels(imgs['base'])
    faces = classify_faces(lo, cfg, base_px)
    # ORM: R = AO (softened), G = roughness clamped to the art-bible range, B = 0 (nothing is metal)
    ao = pixels(imgs['ao'])[..., 0]
    rg = pixels(imgs['rough'])[..., 0]
    lo_r, hi_r = cfg.get('roughness', {}).get('body', [0.55, 0.75])
    orm = np.ones(ao.shape + (4,), dtype=np.float32)
    orm[..., 0] = 0.35 + 0.65 * ao
    orm[..., 1] = np.clip(rg, lo_r, hi_r)
    orm[..., 2] = 0.0
    set_pixels(imgs['orm'], orm)
    # optional hand-paint pass: source/v2/characters/<id>/paint.py defines paint(cfg, lo, imgs, np)
    paint = os.path.join(cfg['_dir'], 'paint.py')
    if os.path.exists(paint):
        ns = {}
        exec(compile(open(paint).read(), paint, 'exec'), ns)
        ns['paint'](cfg, lo, imgs, np)
        K.log('paint pass applied')
    build_materials(lo, cfg, imgs, faces)
    for k in ('rough', 'ao'):
        bpy.data.images.remove(imgs[k])
    for img in (imgs['base'], imgs['normal'], imgs['orm']):
        img.filepath_raw = K.build_path(cfg, img.name + '.png')
        img.file_format = 'PNG'
        img.save()
        img.pack()
    bpy.data.objects.remove(hi, do_unlink=True)
    if bpy.data.materials.get('__bake'):
        bpy.data.materials.remove(bpy.data.materials['__bake'])
    K.save_blend(K.build_path(cfg, 'clean.blend'))
    K.log('clean done:', K.tri_count(lo), 'tris,', len(lo.data.materials), 'materials')


if __name__ == '__main__':
    run(K.config_arg())
