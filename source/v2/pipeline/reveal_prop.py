"""Reveal prop — cut the yokai feature that pops out of a human disguise (contract §7) from the
finished yokai mesh, so it matches the yokai exactly, then rebake it as a `prop` GLB.

  .venv-bpy/bin/python source/v2/pipeline/reveal_prop.py source/v2/characters/<id>/reveal.json

Config:
  source       yokai config (its build/v2/<id>/clean.blend is the cut source)
  select       {"region":[x0,y0,z0,x1,y1,z1] (fractions of the YOKAI height),
                "exclude_rules":[{"h_min":..,"h_max":..,"v_max":..}]}   faces to drop inside the region
  target_tris  <= 5000 (prop profile)
  width_m      final width of the prop in metres (fit to the human head it sits on)
  texture      {"base":1024}
  export       source GLB path; runtime: public/assets/models/v2/<id>_reveal.glb
The prop origin is the centre of its lowest ring (it sits on socket_reveal, +Y up after export).
"""
import colorsys, os, subprocess, shutil, sys
import bpy, bmesh
import numpy as np
from mathutils import Vector, Matrix
sys.path.insert(0, os.path.dirname(__file__))
import charkit as K
import clean_character as C


def run(cfg_path):
    cfg = K.load_config(cfg_path)
    src = K.load_config(cfg['source'])
    K.open_blend(K.build_path(src, 'clean.blend'))
    yokai = bpy.data.objects[src['id']]
    hi = yokai.copy(); hi.data = yokai.data.copy(); hi.name = 'hi'
    bpy.context.scene.collection.objects.link(hi)
    base_img = next(i for i in bpy.data.images if i.name.endswith('_baseColor'))
    px = C.pixels(base_img)
    h, w = px.shape[:2]
    # one box (`region`) or several (`regions`, e.g. both of Sumi's wings); a face is kept if it is inside any box
    regions = cfg['select'].get('regions') or [cfg['select']['region']]
    boxes = [(Vector(r[:3]) * src['height_m'], Vector(r[3:]) * src['height_m']) for r in regions]
    uv = yokai.data.uv_layers.active.data
    keep = set()
    for poly in yokai.data.polygons:
        if not any(K.in_box(poly.center, lo_box, hi_box) for lo_box, hi_box in boxes):
            continue
        u = sum(uv[i].uv.x for i in poly.loop_indices) / len(poly.loop_indices)
        v = sum(uv[i].uv.y for i in poly.loop_indices) / len(poly.loop_indices)
        r, g, b, _ = px[min(h - 1, int(v * h)), min(w - 1, int(u * w))]
        hh, ss, vv = colorsys.rgb_to_hsv(r ** (1 / 2.2), g ** (1 / 2.2), b ** (1 / 2.2))
        drop = False
        for rule in cfg['select'].get('exclude_rules', []):
            if (rule.get('h_min', 0) <= hh <= rule.get('h_max', 1) and rule.get('s_min', 0) <= ss <= rule.get('s_max', 1)
                    and rule.get('v_min', 0) <= vv <= rule.get('v_max', 1)):
                drop = True
        if not drop:
            keep.add(poly.index)
    bm = bmesh.new(); bm.from_mesh(yokai.data); bm.faces.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.index not in keep], context='FACES')
    bm.to_mesh(yokai.data); bm.free()
    lo = yokai
    lo.name = lo.data.name = cfg['id']
    lo.data.materials.clear()
    lo.vertex_groups.clear()
    C.remove_islands(lo, {**cfg, 'height_m': src['height_m']})
    for o in list(bpy.data.objects):
        if o not in (lo, hi):
            bpy.data.objects.remove(o, do_unlink=True)
    # decimate to the prop budget, re-UV, rebake from the full yokai mesh
    if K.tri_count(lo) > cfg.get('target_tris', 4500):
        m = lo.modifiers.new('d', 'DECIMATE'); m.ratio = cfg.get('target_tris', 4500) / K.tri_count(lo)
        with K.ctx_override(lo):
            bpy.ops.object.modifier_apply(modifier=m.name)
    for uvl in list(lo.data.uv_layers):
        lo.data.uv_layers.remove(uvl)
    C.unwrap(lo, cfg)
    size = cfg.get('texture', {}).get('base', 1024)
    img = C.new_image(f"{cfg['id']}_baseColor", size)
    bake_cfg = {**cfg, 'height_m': src['height_m']}
    C.bake(lo, hi, bake_cfg, 'DIFFUSE', img)
    bpy.data.objects.remove(hi, do_unlink=True)
    mat = bpy.data.materials.new(cfg['id'])
    nt, bsdf = C.principled(mat)
    t = nt.nodes.new('ShaderNodeTexImage'); t.image = img
    nt.links.new(t.outputs['Color'], bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = cfg.get('roughness', 0.45)
    lo.data.materials.clear(); lo.data.materials.append(mat)
    img.pack()
    # origin: centre of the lowest ring; scale to width
    mn, mx = K.mesh_bounds(lo)
    s = cfg['width_m'] / max(mx.x - mn.x, mx.y - mn.y)
    lo.data.transform(Matrix.Translation((-(mn.x + mx.x) / 2, -(mn.y + mx.y) / 2, -mn.z)))
    lo.data.transform(Matrix.Scale(s, 4))
    lo.data.update()
    out = K.repo_path(cfg['export'])
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with K.ctx_override(lo):
        bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=True, export_yup=True,
                                  export_image_format='JPEG', export_jpeg_quality=88, export_animations=False,
                                  export_skins=False, export_morph=False)
    r = subprocess.run(['node', os.path.join(K.REPO, 'tools/validate-glb.mjs'), out, '--profile', 'prop'], capture_output=True, text=True)
    print(r.stdout)
    open(os.path.splitext(out)[0] + '.validate.txt', 'w').write(r.stdout)
    if r.returncode:
        raise SystemExit('validator FAIL')
    if cfg.get('runtime'):
        shutil.copyfile(out, K.repo_path(cfg['runtime']))
    K.log('reveal prop', K.tri_count(lo), 'tris, width', cfg['width_m'])


if __name__ == '__main__':
    run(K.config_arg())
