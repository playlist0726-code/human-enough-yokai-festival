"""Polish proportions and face, add blinks, and deliver native + portable files."""
import bpy, math, os
from mathutils import Vector
OUT='/Users/gimjunsu/eve-games/yokai-festival/art/characters/mizu-blender'
scene=bpy.context.scene
rig=bpy.data.objects['Mizu.Rig']
char=bpy.data.collections['MIZU • Character']

# Reduce the eye slightly to leave a genuine muzzle area below it.
eye_names=['Mizu.Eye rim','Mizu.Eye ivory','Mizu.Eye pupil','Mizu.Eye large glint','Mizu.Eye small glint']
for name in eye_names:
    ob=bpy.data.objects[name]
    ob.location.x*=.91
    ob.location.z=2.44+(ob.location.z-2.44)*.87
    ob.scale.x*=.91;ob.scale.z*=.87
mouth=bpy.data.objects['Mizu.Small worried mouth']
for sp in mouth.data.splines:
    for p in sp.bezier_points:
        p.co.z-=.12;p.co.y+=.105

# Paint the blush into the head surface; no floating pink cheek discs.
for ob in list(char.objects):
    if ob.name.startswith('Mizu.Blush.'):
        bpy.data.objects.remove(ob,do_unlink=True)
head=bpy.data.objects['Mizu.Head • sculpted cheek silhouette']
attr=head.data.color_attributes.new(name='MizuSkin',type='FLOAT_COLOR',domain='POINT')
for v,c in zip(head.data.vertices,attr.data):
    x,y,z=v.co
    w=max(math.exp(-(((x-.57)/.15)**2+((z-2.10)/.12)**2)*1.5),math.exp(-(((x+.57)/.15)**2+((z-2.10)/.12)**2)*1.5))
    w*=max(0,min(1,(-y-.12)/.25))*.80
    base=(.055,.64,.51);pink=(.96,.44,.40)
    c.color=tuple(base[i]*(1-w)+pink[i]*w for i in range(3))+(1,)
mat=head.data.materials[0].copy();mat.name='Mizu • painted jade face';head.data.materials[0]=mat
n=mat.node_tree.nodes.new('ShaderNodeVertexColor');n.layer_name='MizuSkin'
p=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
mat.node_tree.links.new(n.outputs['Color'],p.inputs['Base Color'])

# Increase the head/body ratio to match the supplied chibi concept.
# The transform is baked into each part so the articulation pivot stays editable.
for ob in char.objects:
    if ob.parent_bone!='head':continue
    if ob.type=='MESH':
        for v in ob.data.vertices:
            co=ob.matrix_basis@v.co
            co=Vector((co.x*1.10,co.y*1.10,1.8+(co.z-1.8)*1.12-.07))
            v.co=ob.matrix_basis.inverted()@co
    elif ob.type=='CURVE':
        for sp in ob.data.splines:
            for p in sp.bezier_points:
                co=ob.matrix_basis@p.co
                co=Vector((co.x*1.10,co.y*1.10,1.8+(co.z-1.8)*1.12-.07))
                p.co=ob.matrix_basis.inverted()@co

# Blinking is authored as mesh shape keys, retained on GLB export.
for name in eye_names:
    ob=bpy.data.objects[name]
    ob.shape_key_add(name='Basis'); blink=ob.shape_key_add(name='Blink')
    zz=[v.co.z for v in ob.data.vertices];center=(max(zz)+min(zz))/2
    for v in blink.data:v.co.z=center+(v.co.z-center)*.035
    for f,val in [(1,0),(38,0),(41,1),(44,0),(96,0),(99,1),(102,0),(121,0)]:
        blink.value=val;blink.keyframe_insert('value',frame=f)
    blink.value=0

scene.camera.data.ortho_scale=4.35
scene.frame_set(1)
bpy.ops.object.select_all(action='DESELECT')
for ob in char.objects:ob.select_set(True)
bpy.context.view_layer.objects.active=rig
props=bpy.ops.export_scene.gltf.get_rna_type().properties
kwargs=dict(filepath=OUT+'/mizu-character-v01.glb',use_selection=True)
if 'export_format' in props:kwargs['export_format']='GLB'
if 'export_animations' in props:kwargs['export_animations']=True
if 'export_yup' in props:kwargs['export_yup']=True
if 'export_apply' in props:kwargs['export_apply']=False
bpy.ops.export_scene.gltf(**kwargs)
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True)
bpy.ops.wm.save_as_mainfile(filepath=OUT+'/mizu-character-v01.blend')
print({'blend':bpy.data.filepath,'glb_bytes':os.path.getsize(OUT+'/mizu-character-v01.glb'),'objects':len(char.objects),'bones':len(rig.data.bones)})
