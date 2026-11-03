"""Final seating corrections, portrait render, and character-only export."""
import bpy, os, contextlib
from mathutils import Vector
OUT='/Users/gimjunsu/eve-games/yokai-festival/art/characters/mizu-blender'
scene=bpy.context.scene
head=bpy.data.objects['Mizu.Head • sculpted cheek silhouette']
if not scene.get('face_seating_done'):
    inv=head.matrix_world.inverted()
    for v in head.data.vertices:
        w=head.matrix_world@v.co;w.y-=.24;v.co=inv@w
    head.data.update()
    scene['face_seating_done']=True
for name in ['Mizu.Eye rim','Mizu.Eye ivory','Mizu.Eye pupil','Mizu.Eye large glint','Mizu.Eye small glint']:
    ob=bpy.data.objects[name]
    if not ob.get('gaze_lift_done'):
        mat=ob.matrix_world.copy();mat.translation.z+=.14;ob.matrix_world=mat
        ob['gaze_lift_done']=True
bpy.context.view_layer.update()
# Close every eye component onto one lid line; highlights must not float.
eye=bpy.data.objects['Mizu.Eye ivory']
coords=[eye.matrix_world@v.co for v in eye.data.vertices]
lid_z=(max(v.z for v in coords)+min(v.z for v in coords))/2
for name in ['Mizu.Eye rim','Mizu.Eye ivory','Mizu.Eye pupil','Mizu.Eye large glint','Mizu.Eye small glint']:
    ob=bpy.data.objects[name];inverse=ob.matrix_world.inverted()
    basis=ob.data.shape_keys.key_blocks['Basis'];blink=ob.data.shape_keys.key_blocks['Blink']
    for a,b in zip(basis.data,blink.data):
        w=ob.matrix_world@a.co
        w.z=lid_z+(w.z-lid_z)*(.025 if name=='Mizu.Eye rim' else .001)
        if name!='Mizu.Eye rim':w.y+=.45
        b.co=inverse@w
mouth=bpy.data.objects['Mizu.Small worried mouth'];invm=mouth.matrix_world.inverted()
pts=[(-.09,1.91),(-.025,1.94),(.045,1.92),(.085,1.94)]
for p,(x,z) in zip(mouth.data.splines[0].bezier_points,pts):
    origin=Vector((x,-3,z));direction=Vector((0,1,0))
    hit,pt,n,index=head.ray_cast(head.matrix_world.inverted()@origin,(head.matrix_world.inverted().to_3x3()@direction).normalized())
    w=Vector((x,(head.matrix_world@pt).y-.019 if hit else -.55,z))
    p.co=invm@w
neck=bpy.data.objects['Mizu.Neck'];neck.hide_render=True;neck.hide_set(True)
scene.camera.location=(2.3,-8.5,3.65)
scene.camera.rotation_euler=(Vector((0,0,1.55))-scene.camera.location).to_track_quat('-Z','Y').to_euler()
scene.camera.data.ortho_scale=4.1
scene.render.resolution_x=1000;scene.render.resolution_y=1000;scene.cycles.samples=48
scene.render.filepath=OUT+'/mizu-portrait.png'
scene.frame_set(1)
bpy.ops.object.select_all(action='DESELECT')
for ob in bpy.data.collections['MIZU • Character'].objects:
    if ob!=neck:ob.select_set(True)
with open(OUT+'/export.log','w') as log,contextlib.redirect_stdout(log):
    bpy.ops.export_scene.gltf(filepath=OUT+'/mizu-character-v01.glb',use_selection=True,export_format='GLB',export_animations=True,export_yup=True,export_apply=False)
bpy.ops.object.select_all(action='DESELECT')
rig=bpy.data.objects['Mizu.Rig'];rig.select_set(True);bpy.context.view_layer.objects.active=rig
bpy.ops.wm.save_as_mainfile(filepath=OUT+'/mizu-character-v01.blend')
bpy.ops.render.render(write_still=True)
print({'portrait':scene.render.filepath,'glb_bytes':os.path.getsize(OUT+'/mizu-character-v01.glb')})
