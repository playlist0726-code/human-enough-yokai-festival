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
