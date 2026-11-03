"""Bake tailored cloth, add weighted deformation and secondary chains; preserve v02 sources."""
import bpy,os,sys,json,math,shutil
from mathutils import Matrix,Vector
ROOT='/Users/gimjunsu/eve-games/yokai-festival'
SOURCE=ROOT+'/art/characters/roster-v02'
OUT=ROOT+'/art/characters/roster-v03'
PUBLIC=ROOT+'/public/assets/models'
key=sys.argv[sys.argv.index('--')+1]
bpy.ops.wm.open_mainfile(filepath=f'{SOURCE}/{key}/{key}.blend')
rig=next(o for o in bpy.data.objects if o.type=='ARMATURE')
coll=bpy.data.collections[key]
parts=[o for o in coll.objects if o.type=='MESH']
for o in bpy.context.view_layer.objects:o.select_set(False)
rig.select_set(True);bpy.context.view_layer.objects.active=rig
bpy.ops.object.mode_set(mode='EDIT')
bones=rig.data.edit_bones

def add(role,head,tail,parent):
 b=bones.new(key+'__'+role);b.head=head;b.tail=tail;b.parent=bones[key+'__'+parent];return b
add('hem_L',(-.25,0,.95),(-.25,0,.48),'body')
add('hem_R',(.25,0,.95),(.25,0,.48),'body')
if key=='kon_yokai':
 add('neck_mid',(-.26,0,1.97),(.20,0,2.34),'neck')
 add('neck_tip',(.20,0,2.34),(.04,0,2.67),'neck_mid')
 bones[key+'__head'].parent=bones[key+'__neck_tip']
if key=='nemu_yokai':
 add('tail_mid',(.62,.37,1.2),(.76,.26,2.0),'tail')
 add('tail_tip',(.76,.26,2.0),(.40,-.01,2.97),'tail_mid')
 bones[key+'__mask'].parent=bones[key+'__tail_tip']
bpy.ops.object.mode_set(mode='OBJECT');bpy.context.view_layer.update()

def smooth(t):
 t=max(0,min(1,t));return t*t*(3-2*t)

def weighted(ob,weight_fn):
 # Bake the author's drape and thickness before binding, preserving UVs and normals.
 world=ob.matrix_world.copy();deps=bpy.context.evaluated_depsgraph_get()
 mesh=bpy.data.meshes.new_from_object(ob.evaluated_get(deps),preserve_all_data_layers=True,depsgraph=deps)
 ob.modifiers.clear();ob.data=mesh;mesh.transform(rig.matrix_world.inverted()@world)
 ob.parent=rig;ob.parent_type='OBJECT';ob.parent_bone='';ob.matrix_parent_inverse=Matrix.Identity(4);ob.matrix_basis=Matrix.Identity(4)
 ob.vertex_groups.clear();groups={}
 for v in mesh.vertices:
  weights=weight_fn(v.co);total=sum(weights.values())
  for role,w in weights.items():
   if w<1e-7:continue
   if role not in groups:groups[role]=ob.vertex_groups.new(name=key+'__'+role)
   groups[role].add([v.index],w/total,'REPLACE')
 mod=ob.modifiers.new('Smooth weighted character deformation','ARMATURE');mod.object=rig;mod.use_deform_preserve_volume=True
 ob['weightedDeformation']=True
 return len(mesh.vertices)

report=[]
for ob in parts:
 name=ob.name.lower();role=ob.parent_bone.split('__')[-1]
 if 'tailored_yukata' in name or 'yukata tailored body' in name:
  def cloth(v):
   w=smooth((1.02-v.z)/.55)*.48;l=1-smooth((v.x+.22)/.44)
   return {'body':1-w,'hem_L':w*l,'hem_R':w*(1-l)}
  report.append([ob.name,weighted(ob,cloth),'cloth'])
 elif 'sleeve' in name:
  def sleeve(v,role=role):
   arm=.65+.35*smooth((abs(v.x)-.34)/.20)
   return {'body':1-arm,role:arm}
  report.append([ob.name,weighted(ob,sleeve),'sleeve'])
 elif key=='kon_yokai' and 'long_fox_neck' in name:
  def neck(v):
   if v.z<1.97:t=smooth((v.z-1.65)/.32);return {'neck':1-t,'neck_mid':t}
   t=smooth((v.z-1.97)/.45);return {'neck_mid':1-t,'neck_tip':t}
  report.append([ob.name,weighted(ob,neck),'neck'])
 elif key=='nemu_yokai' and 'face_tail' in name:
  def tail(v):
   if v.z<1.75:t=smooth((v.z-.9)/.85);return {'tail':1-t,'tail_mid':t}
   t=smooth((v.z-1.75)/1.1);return {'tail_mid':1-t,'tail_tip':t}
  report.append([ob.name,weighted(ob,tail),'tail'])

rig['assetVersion']='blender-roster-v03-weighted'
rig['deformation']='Weighted yukata + sleeves; chained Kon neck and Nemu tail'
# Leave a reusable native walk action for inspection. Web runtime supplies its own poses.
rig.animation_data_clear();rig.rotation_mode='XYZ'
for frame in range(1,50,4):
 phase=(frame-1)/48*math.tau
 for role,angle in [('leg_L',math.sin(phase)*.48),('leg_R',-math.sin(phase)*.48),('arm_L',-math.sin(phase)*.3),('arm_R',math.sin(phase)*.3),('hem_L',math.sin(phase-.5)*.13),('hem_R',-math.sin(phase-.5)*.13),('neck_mid',math.sin(phase-.5)*.04),('neck_tip',math.sin(phase-1)*.05),('tail_mid',math.sin(phase-.5)*.07),('tail_tip',math.sin(phase-1)*.08)]:
  b=rig.pose.bones.get(key+'__'+role)
  if not b:continue
  b.rotation_mode='XYZ';b.rotation_euler=(angle,0,0);b.keyframe_insert(data_path='rotation_euler',frame=frame)
if rig.animation_data and rig.animation_data.action:rig.animation_data.action.name=key+' • Walk preview'
bpy.context.scene.frame_end=48;bpy.context.scene.frame_set(1)
# Export the authored rest state; keep the native walk action in the .blend file.
action=rig.animation_data.action if rig.animation_data else None
if action:rig.animation_data.action=None
for b in rig.pose.bones:b.rotation_euler=(0,0,0);b.rotation_quaternion=(1,0,0,0)
bpy.context.view_layer.update()
for o in bpy.context.view_layer.objects:o.select_set(False)
for o in coll.objects:o.select_set(True)
bpy.context.view_layer.objects.active=rig
os.makedirs(f'{OUT}/{key}',exist_ok=True)
bpy.ops.export_scene.gltf(filepath=f'{PUBLIC}/{key}.glb',use_selection=True,export_format='GLB',export_animations=False,export_extras=True,export_yup=True,export_apply=False)
shutil.copyfile(f'{PUBLIC}/{key}.glb',f'{OUT}/{key}/{key}.glb')
if action:rig.animation_data.action=action
bpy.context.scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=f'{OUT}/{key}/{key}.blend')
with open(f'{OUT}/{key}/deformation.json','w') as f:json.dump({'key':key,'meshes':report,'bones':len(rig.data.bones)},f,indent=2)
print('REFINED',key,report)
