import bpy,math,os
from mathutils import Vector
BASE='/Users/gimjunsu/eve-games/yokai-festival'
OUT=BASE+'/art/characters/roster-v02'
IDS=['mizu','pon','kon','sumi','nemu','akari','kasa']
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene;scene.name='EVE • All Yokai and Human Disguises'
rows={}
for form in ['yokai','human']:
 row=[]
 for index,id in enumerate(IDS):
  bpy.ops.object.select_all(action='DESELECT')
  bpy.ops.import_scene.gltf(filepath=BASE+'/public/assets/models/'+id+'_'+form+'.glb')
  imported=list(bpy.context.selected_objects);top=[o for o in imported if not o.parent]
  root=bpy.data.objects.new(id+' '+form,None);scene.collection.objects.link(root)
  for o in top:o.parent=root
  bpy.context.view_layer.update()
  points=[o.matrix_world@Vector(c) for o in imported if o.type=='MESH' for c in o.bound_box]
  lo=Vector(tuple(min(v[i] for v in points) for i in range(3)));hi=Vector(tuple(max(v[i] for v in points) for i in range(3)))
  scale=2.85/(hi.z-lo.z);root.scale=(scale,)*3;root.location=((index-3)*3.1-(lo.x+hi.x)/2*scale,-(lo.y+hi.y)/2*scale,-lo.z*scale)
  root['form']=form;row.append(root)
  cu=bpy.data.curves.new(id+' label','FONT');cu.body=id.upper();cu.align_x='CENTER';cu.size=.22;cu.extrude=.002
  label=bpy.data.objects.new(id+' '+form+' label',cu);scene.collection.objects.link(label);label.location=((index-3)*3.1,-.60,.06);label.rotation_euler=(math.pi/2,0,0);label['form']=form
 rows[form]=row
def visible(root,yes):
 root.hide_render=not yes
 for o in root.children_recursive:o.hide_render=not yes
world=bpy.data.worlds.new('Night teal studio');world.use_nodes=True;scene.world=world
bg=next(n for n in world.node_tree.nodes if n.type=='BACKGROUND');bg.inputs[0].default_value=(.05,.08,.10,1);bg.inputs[1].default_value=.45
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.01));floor=bpy.context.object
m=bpy.data.materials.new('Studio matte teal');m.use_nodes=True;p=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED');p.inputs['Base Color'].default_value=(.025,.06,.075,1);p.inputs['Roughness'].default_value=.7;floor.data.materials.append(m)
for x in [-8,0,8]:
 for y,z,power,size,color in [(-4,7,1000,6,(1,.88,.74)),(3,6,1300,5,(.70,.9,1))]:
  d=bpy.data.lights.new('Gallery softbox','AREA');d.energy=power;d.size=size;d.color=color;o=bpy.data.objects.new('Gallery softbox',d);scene.collection.objects.link(o);o.location=(x,y,z);o.rotation_euler=(Vector((x,0,1.5))-o.location).to_track_quat('-Z','Y').to_euler()
camdata=bpy.data.cameras.new('Roster Camera');camera=bpy.data.objects.new('Roster Camera',camdata);scene.collection.objects.link(camera);scene.camera=camera
camera.location=(0,-24,7.7);camera.rotation_euler=(Vector((0,0,1.35))-camera.location).to_track_quat('-Z','Y').to_euler();camdata.type='ORTHO';camdata.ortho_scale=23
scene.render.resolution_x=1700;scene.render.resolution_y=480;scene.render.resolution_percentage=100
scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True
scene.render.image_settings.file_format='PNG'
for form in ['yokai','human']:
 for f,roots in rows.items():
  for root in roots:visible(root,f==form)
 for ob in scene.objects:
  if ob.type=='FONT':ob.hide_render=ob.get('form')!=form
 scene.render.filepath=OUT+'/'+form+'-roster.png';bpy.ops.render.render(write_still=True)
for form,roots in rows.items():
 for root in roots:
  visible(root,True)
  if form=='human':root.location.y+=5.2
for ob in scene.objects:
 if ob.type=='FONT':
  ob.hide_render=False
  if ob.get('form')=='human':ob.location.y+=5.2
camera.location=(0,-24,16);camera.rotation_euler=(Vector((0,2.5,1.0))-camera.location).to_track_quat('-Z','Y').to_euler();camdata.ortho_scale=25
scene.render.resolution_y=1000
bpy.ops.wm.save_as_mainfile(filepath=OUT+'/eve-roster-v02.blend')
print('Gallery and both roster renders saved')
