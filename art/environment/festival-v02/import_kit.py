import bpy
from mathutils import Vector
OUT='/Users/gimjunsu/eve-games/yokai-festival/art/environment/festival-v02/'
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=OUT+'festival-scenery-kit.glb')
scene=bpy.context.scene;scene.name='EVE • Mountain Festival Scenery Kit v02'
scene['Notes']='Static scenery geometry from the actual game. Animated night sky, lake shader, fireworks, stalls and gameplay live in the game source.'
world=bpy.data.worlds.new('Festival evening');world.use_nodes=True;scene.world=world
bg=next(n for n in world.node_tree.nodes if n.type=='BACKGROUND');bg.inputs[0].default_value=(.09,.13,.24,1);bg.inputs[1].default_value=.5
sun=bpy.data.lights.new('Moon','SUN');sun.energy=1.2;ob=bpy.data.objects.new('Moon',sun);scene.collection.objects.link(ob);ob.rotation_euler=(.6,-.3,-.5)
camera_data=bpy.data.cameras.new('Festival Overview');cam=bpy.data.objects.new('Festival Overview',camera_data);scene.collection.objects.link(cam);scene.camera=cam
cam.location=(42,-53,47);cam.rotation_euler=(Vector((0,8,2))-cam.location).to_track_quat('-Z','Y').to_euler();camera_data.type='ORTHO';camera_data.ortho_scale=90
scene.render.resolution_x=1400;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
for screen in bpy.data.screens:
 for area in screen.areas:
  if area.type=='VIEW_3D':area.spaces.active.region_3d.view_perspective='CAMERA';area.spaces.active.shading.type='MATERIAL'
bpy.ops.wm.save_as_mainfile(filepath=OUT+'festival-scenery-kit.blend')
