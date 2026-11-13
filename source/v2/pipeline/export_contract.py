"""Stage 4 — export the contract GLB and validate it.

  .venv-bpy/bin/python source/v2/pipeline/export_contract.py source/v2/characters/<id>/character.json

Reads build/v2/<id>/animated.blend. Writes `export` (source GLB, validated against the contract,
JPEG textures so the raw file fits the profile's size budget) and copies it to `runtime`
(public/assets/models/v2/...); `npm run build` later compresses the runtime copy in place
(Meshopt + KTX2/WebP). Runs tools/validate-glb.mjs and fails on FAIL.
"""
import os, shutil, subprocess, sys
import bpy
sys.path.insert(0, os.path.dirname(__file__))
import charkit as K


def reencode_images(path, quality, sizes=None, sheen=0.35, ao=1.0):
    """Re-encode every JPEG/PNG texture inside a GLB at `quality` (the Blender exporter ignores
    export_jpeg_quality for packed images). Rebuilds the BIN chunk with 4-byte alignment."""
    import io, json, struct
    from PIL import Image
    b = open(path, 'rb').read()
    jl = struct.unpack('<I', b[12:16])[0]
    g = json.loads(b[20:20 + jl])
    bin_off = 20 + jl + 8
    bin_data = b[bin_off:bin_off + struct.unpack('<I', b[20 + jl:24 + jl])[0]]
    # material fixes the Blender exporter cannot express:
    #  - metallicFactor 0: the ORM blue channel is ~0 but JPEG/WebP chroma bleed leaves 0.05-0.15
    #    and glTF multiplies it by a default metallicFactor of 1 -> plastic/metal shine in three.js
    #  - sheen colour = cloth_sheen weight (the exporter writes white, far too satin)
    for m in g.get('materials', []):
        m.setdefault('pbrMetallicRoughness', {})['metallicFactor'] = 0
        if 'occlusionTexture' in m:  # config ao_strength: soften baked AO (hair overhangs darken faces)
            m['occlusionTexture']['strength'] = ao
        if m.get('name', '').endswith('_eyes'):  # eyes are smooth glass: no baked normal noise, soft glossy
            m.pop('normalTexture', None)
            m['pbrMetallicRoughness']['roughnessFactor'] = 0.25
            cc = m.get('extensions', {}).get('KHR_materials_clearcoat')
            if cc:
                cc['clearcoatRoughnessFactor'] = 0.12
        sh = m.get('extensions', {}).get('KHR_materials_sheen')
        if sh:
            sh['sheenColorFactor'] = [sheen] * 3
    img_views = {}
    for im in g.get('images', []):
        v = g['bufferViews'][im['bufferView']]
        raw = bin_data[v.get('byteOffset', 0):v.get('byteOffset', 0) + v['byteLength']]
        pic = Image.open(io.BytesIO(raw))
        for suffix, px in (sizes or {}).items():  # e.g. {"normal": 512} for small on-screen forms
            if im.get('name', '').endswith(suffix) and pic.width > px:
                pic = pic.resize((px, px), Image.LANCZOS)
        out = io.BytesIO()
        pic.convert('RGB').save(out, 'JPEG', quality=quality, optimize=True, progressive=False)
        im['mimeType'] = 'image/jpeg'
        img_views[im['bufferView']] = out.getvalue()
    new = bytearray()
    for i, v in enumerate(g['bufferViews']):
        data = img_views.get(i)
        if data is None:
            data = bin_data[v.get('byteOffset', 0):v.get('byteOffset', 0) + v['byteLength']]
        while len(new) % 4:
            new.append(0)
        v['byteOffset'] = len(new)
        v['byteLength'] = len(data)
        new += data
    while len(new) % 4:
        new.append(0)
    g['buffers'][0]['byteLength'] = len(new)
    js = json.dumps(g, separators=(',', ':')).encode()
    js += b' ' * ((4 - len(js) % 4) % 4)
    total = 12 + 8 + len(js) + 8 + len(new)
    with open(path, 'wb') as f:
        f.write(struct.pack('<4sII', b'glTF', 2, total))
        f.write(struct.pack('<I4s', len(js), b'JSON')); f.write(js)
        f.write(struct.pack('<I4s', len(new), b'BIN\x00')); f.write(new)


def run(cfg_path):
    cfg = K.load_config(cfg_path)
    K.open_blend(K.build_path(cfg, cfg.get('export_stage', 'animated') + '.blend'))
    keep = [o for o in bpy.data.objects if o.name in (cfg['id'], 'Armature') or o.name.startswith('socket_')]
    for o in list(bpy.data.objects):
        if o not in keep:
            bpy.data.objects.remove(o, do_unlink=True)
    arm = bpy.data.objects.get('Armature')
    if arm and arm.animation_data:
        arm.animation_data.action = None
    # face morphs default to 0; the runtime drives blink/shock
    out = K.repo_path(cfg['export'])
    os.makedirs(os.path.dirname(out), exist_ok=True)
    for o in keep:
        o.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath=out, export_format='GLB', use_selection=True,
        export_yup=True, export_apply=False,
        export_texcoords=True, export_normals=True, export_tangents=False,
        export_materials='EXPORT', export_image_format='JPEG', export_jpeg_quality=cfg.get('jpeg_quality', 88),
        export_skins=True, export_all_influences=False, export_def_bones=False,
        export_morph=True, export_morph_normal=False, export_morph_animation=False,
        export_animations=True, export_animation_mode='ACTIONS', export_force_sampling=True,
        export_frame_step=1, export_optimize_animation_size=True, export_anim_single_armature=True,
        export_reset_pose_bones=True, export_current_frame=False, export_rest_position_armature=True,
        export_extras=False, export_cameras=False, export_lights=False)
    reencode_images(out, cfg.get('jpeg_quality', 88), cfg.get('export_texture_size'), cfg.get('cloth_sheen', 0.35), cfg.get('ao_strength', 1.0))
    K.log('exported', os.path.relpath(out, K.REPO), os.path.getsize(out), 'bytes')
    r = subprocess.run(['node', os.path.join(K.REPO, 'tools/validate-glb.mjs'), out, '--profile', cfg.get('profile', 'player')],
                       capture_output=True, text=True)
    print(r.stdout)
    report = os.path.splitext(out)[0] + '.validate.txt'
    with open(report, 'w') as f:
        f.write(r.stdout)
    if r.returncode != 0:
        raise SystemExit('validator FAIL — see ' + os.path.relpath(report, K.REPO))
    if cfg.get('runtime'):
        dst = K.repo_path(cfg['runtime'])
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        shutil.copyfile(out, dst)
        K.log('runtime copy', os.path.relpath(dst, K.REPO))


if __name__ == '__main__':
    run(K.config_arg())
