"""Mizu: an editable Blender character study from the supplied e.v.e concept.

Run through the connected Blender MCP. Original scene remains intact.
Front is -Y; Z is up. Measurements are stylized Blender metres.
"""
import bpy, math, os
import numpy as np
from mathutils import Vector
from math import sin, cos, pi

OUT = '/Users/gimjunsu/eve-games/yokai-festival/art/characters/mizu-blender'
os.makedirs(OUT, exist_ok=True)
scene = bpy.data.scenes.new('EVE • MIZU Character Studio')
bpy.context.window.scene = scene
char = bpy.data.collections.new('MIZU • Character')
stage = bpy.data.collections.new('STUDIO • Presentation')
scene.collection.children.link(char)
scene.collection.children.link(stage)
parts = []
bone_parts = {}

def move(obj, collection):
    for c in list(obj.users_collection): c.objects.unlink(obj)
    collection.objects.link(obj)

def register(obj, name, mat=None, bone=None):
    obj.name = name
    move(obj, char)
    if mat: obj.data.materials.append(mat)
    if obj.type == 'MESH':
        for p in obj.data.polygons: p.use_smooth = True
    parts.append(obj)
    if bone: bone_parts[obj.name] = bone
    return obj

def material(name, color, rough=.45, metallic=0, coat=0, sss=0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    p.inputs['Base Color'].default_value = (*color, 1)
    p.inputs['Roughness'].default_value = rough
    p.inputs['Metallic'].default_value = metallic
    p.inputs['Coat Weight'].default_value = coat
    p.inputs['Subsurface Weight'].default_value = sss
    m.diffuse_color = (*color, 1)
    return m

skin = material('Mizu • jade mochi skin', (.055,.64,.51), .42, coat=.12, sss=.07)
pink = material('Mizu • peach blush', (.96,.44,.40), .60, sss=.08)
cream = material('Mizu • warm ivory eye', (1,.84,.48), .27, coat=.15)
ink = material('Mizu • ink outlines', (.012,.055,.047), .50)
pupil = material('Mizu • espresso iris', (.022,.018,.013), .18, coat=.5)
white = material('Mizu • eye glints', (1,.98,.90), .14)
leafmat = material('Mizu • spring leaf', (.29,.49,.035), .39, coat=.12)
leaflight = material('Mizu • leaf veins', (.47,.64,.08), .43)
shellmat = material('Mizu • shell grooves', (.045,.13,.085), .55)
scutemat = material('Mizu • shell scutes', (.14,.28,.17), .43, coat=.1)
obi = material('Mizu • indigo obi', (.025,.075,.18), .65)
obiedge = material('Mizu • woven obi edge', (.07,.16,.28), .58)
clothlining = material('Mizu • orange sleeve lining', (.69,.16,.035), .67)
collarmat = material('Mizu • cream collar', (1,.76,.42), .65)
wood = material('Mizu • honey geta wood', (.27,.105,.035), .39)
strap = material('Mizu • leather sandal straps', (.12,.055,.022), .55)
cork = material('Mizu • potion cork', (.66,.31,.07), .65)
gold = material('Mizu • amber binding', (.8,.36,.055), .3, metallic=.3)
blue = material('Mizu • enchanted water', (.008,.46,.8), .17, coat=.5)
bp=next(n for n in blue.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
bp.inputs['Emission Color'].default_value=(.005,.24,.65,1)
bp.inputs['Emission Strength'].default_value=.32
glass=material('Mizu • blue glass bottle', (.26,.76,.95), .09, coat=.5)
gp=next(n for n in glass.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
gp.inputs['Transmission Weight'].default_value=.85
gp.inputs['IOR'].default_value=1.45
glow=material('Mizu • water glints', (.55,.94,1), .16)
wp=next(n for n in glow.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
wp.inputs['Emission Color'].default_value=(.18,.8,1,1)
wp.inputs['Emission Strength'].default_value=1.8

# Authored seigaiha tile, packed into the .blend and embedded in GLB.
N=512
yy,xx=np.mgrid[0:N,0:N]/N
dist=np.full((N,N),10.)
for row in range(-1,5):
    cy=row*.32
    for col in range(-1,5):
        cx=col*.48+(row%2)*.24
        r=np.sqrt((xx-cx)**2+(yy-cy)**2)
        upper=(yy>=cy)&(yy<=cy+.23)&(abs(xx-cx)<=.235)
        for radius in [.09,.145,.20]:
            d=np.abs(r-radius)
            dist=np.where(upper,np.minimum(dist,d),dist)
mask=np.clip((.009-dist)*250+.5,0,1)[...,None]
orange=np.array([.98,.37,.075]); ivory=np.array([1.,.81,.46])
rgb=orange*(1-mask)+ivory*mask
rgba=np.concatenate([rgb,np.ones((N,N,1))],axis=2).astype(np.float32)
tex=bpy.data.images.new('Mizu • hand-designed seigaiha',width=N,height=N)
tex.pixels.foreach_set(rgba.ravel()); tex.pack()
cloth=material('Mizu • seigaiha festival cotton',(.98,.37,.075),.73)
nodes=cloth.node_tree.nodes; links=cloth.node_tree.links
cp=next(n for n in nodes if n.type=='BSDF_PRINCIPLED')
it=nodes.new('ShaderNodeTexImage'); it.image=tex
links.new(it.outputs['Color'],cp.inputs['Base Color'])
noise=nodes.new('ShaderNodeTexNoise'); noise.inputs['Scale'].default_value=180
bump=nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value=.10; bump.inputs['Distance'].default_value=.012
links.new(noise.outputs['Fac'],bump.inputs['Height']); links.new(bump.outputs['Normal'],cp.inputs['Normal'])

def mesh(name, verts, faces, mat, bone=None, uvs=None):
    me=bpy.data.meshes.new(name); me.from_pydata(verts,[],faces); me.update()
    ob=bpy.data.objects.new(name,me); char.objects.link(ob)
    register(ob,name,mat,bone)
    if uvs:
        layer=me.uv_layers.new(name='UVMap')
        for poly in me.polygons:
            for li in poly.loop_indices:
                layer.data[li].uv=uvs[me.loops[li].vertex_index]
    return ob

def ell(name,loc,scale,mat,bone=None,segments=48,rings=32):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,location=loc)
    ob=bpy.context.object; ob.scale=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    return register(ob,name,mat,bone)

def curve(name,coords,radius,mat,bone=None,closed=False):
    cu=bpy.data.curves.new(name,'CURVE'); cu.dimensions='3D'; cu.resolution_u=16
    cu.bevel_depth=radius; cu.bevel_resolution=3
    sp=cu.splines.new('BEZIER'); sp.bezier_points.add(len(coords)-1)
    for p,co in zip(sp.bezier_points,coords):
        p.co=co; p.handle_left_type='AUTO'; p.handle_right_type='AUTO'
    sp.use_cyclic_u=closed
    ob=bpy.data.objects.new(name,cu); char.objects.link(ob)
    return register(ob,name,mat,bone)

def torus(name,loc,major,minor,mat,bone=None,rotation=(0,0,0),scale=(1,1,1)):
    bpy.ops.mesh.primitive_torus_add(major_segments=64,minor_segments=12,location=loc,major_radius=major,minor_radius=minor,rotation=rotation)
    ob=bpy.context.object; ob.scale=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    return register(ob,name,mat,bone)

def cylinder(name,loc,radius,depth,mat,bone=None):
    bpy.ops.mesh.primitive_cylinder_add(vertices=48,radius=radius,depth=depth,location=loc)
    ob=bpy.context.object
    be=ob.modifiers.new('Soft crafted edges','BEVEL'); be.width=.025; be.segments=3
    return register(ob,name,mat,bone)

def loft(name,rows,mat,bone=None,n=64):
    vs=[];uv=[];fs=[]
    for j,(z,rx,ry) in enumerate(rows):
        for i in range(n+1):
            t=2*pi*i/n
            # Soft asymmetrical folds, stronger below the belt.
            f=1+.013*cos(7*t+j*.18)+.009*sin(11*t)
            vs.append((rx*cos(t)*f,ry*sin(t)*f,z))
            uv.append((i/n*2.1,j/(len(rows)-1)*1.1))
    for j in range(len(rows)-1):
        for i in range(n):
            a=j*(n+1)+i;fs.append((a,a+1,a+n+2,a+n+1))
    ob=mesh(name,vs,fs,mat,bone,uv)
    so=ob.modifiers.new('Cotton thickness','SOLIDIFY');so.thickness=.025
    su=ob.modifiers.new('Soft tailored surface','SUBSURF');su.levels=1
    return ob

# The head is a custom cheek-shaped mesh, rather than a sphere assembly.
vs=[];fs=[]
L=40; S=80
for j in range(L+1):
    lat=pi*j/L; z=cos(lat)
    width=sin(lat)*(1+.19*math.exp(-((z+.45)/.36)**2))
    for i in range(S):
        a=2*pi*i/S
        x=.81*width*cos(a)
        y=.57*sin(lat)*sin(a)
        # Face becomes gently flatter and fuller at the cheeks.
        if y<0: y*=1+.11*math.exp(-((z+.35)/.48)**2)
        vs.append((x,y,2.35+.69*z))
for j in range(L):
    for i in range(S):
        a=j*S+i;b=j*S+(i+1)%S
        fs.append((a,b,b+S,a+S))
head=mesh('Mizu.Head • sculpted cheek silhouette',vs,fs,skin,'head')
su=head.modifiers.new('Silhouette polish','SUBSURF');su.levels=1
ell('Mizu.Neck',(0,0,1.66),(.24,.23,.22),skin,'body')

# Single eye: dark recessed rim, a warm convex eyeball and offset gaze.
ell('Mizu.Eye rim',(0,-.535,2.43),(.511,.135,.543),ink,'head')
ell('Mizu.Eye ivory',(0,-.568,2.44),(.487,.145,.519),cream,'head')
ell('Mizu.Eye pupil',(.115,-.706,2.53),(.235,.072,.282),pupil,'head')
ell('Mizu.Eye large glint',(.045,-.776,2.665),(.062,.018,.074),white,'head',32,20)
ell('Mizu.Eye small glint',(.20,-.77,2.44),(.024,.012,.03),white,'head',24,16)
for side in [-1,1]:
    cheek=ell('Mizu.Blush.'+str(side),(side*.565,-.48,2.12),(.145,.027,.105),pink,'head')
    cheek.rotation_euler[2]=side*.28
curve('Mizu.Small worried mouth',[(-.095,-.593,1.985),(-.025,-.617,2.015),(.045,-.615,1.993),(.087,-.596,2.008)],.012,ink,'head')

# Hollow crown bowl, visible water surface, and radiating sculpted leaves.
torus('Mizu.Crown living rim',(0,0,3.01),.415,.062,leafmat,'head',scale=(1,1,.65))
water=ell('Mizu.Crown water',(0,0,3.025),(.405,.405,.028),blue,'head')
for r in [.14,.28,.39]:
    torus('Mizu.Water ripple %.2f'%r,(0,0,3.052),r,.008,glow,'head',scale=(1,.96,1))
for k in range(12):
    a=2*pi*k/12
    length=.48 if sin(a)>-.4 else .40
    width=.145
    vs=[];fs=[]
    for j in range(13):
        t=j/12; rr=.36+t*length
        zz=3.04-.24*t*t+.055*sin(pi*t)
        for q in range(9):
            s=(q/8*2-1)
            w=width*sin(pi*t)**.65*s
            vs.append((rr*cos(a)-w*sin(a),rr*sin(a)+w*cos(a),zz+.045*(1-s*s)*sin(pi*t)))
    for j in range(12):
        for q in range(8):
            o=j*9+q;fs.append((o,o+1,o+10,o+9))
    ob=mesh('Mizu.Crown leaf %02d'%k,vs,fs,leafmat,'head')
    so=ob.modifiers.new('Leaf thickness','SOLIDIFY');so.thickness=.025
    su=ob.modifiers.new('Leaf softness','SUBSURF');su.levels=1
    pts=[]
    for t in [.10,.35,.6,.85]:
        rr=.36+t*length
        pts.append((rr*cos(a),rr*sin(a),3.04-.24*t*t+.10*sin(pi*t)))
    curve('Mizu.Leaf vein %02d'%k,pts,.007,leaflight,'head')
for a in [pi*1.2,pi*1.65,pi*.08]:
    x=.66*cos(a);y=.60*sin(a)
    drop=ell('Mizu.Crown water drop',(x,y,2.82),(.037,.037,.09),blue,'head',32,20)
    drop.rotation_euler[1]=-.2*cos(a)
    ell('Mizu.Drop glint',(x-.009,y-.031,2.84),(.008,.009,.026),glow,'head',20,12)

# Rounded shell with separate fitted hexagonal scutes.
ell('Mizu.Shell foundation',(0,.37,1.40),(.64,.32,.76),shellmat,'body')
def shell_surface(x,z,offset=0):
    rr=max(.035,1-(x/.64)**2-((z-1.4)/.76)**2)
    return .37+.32*math.sqrt(rr)+offset
torus('Mizu.Shell outer piping',(0,.39,1.4),.62,.04,scutemat,'body',rotation=(pi/2,0,0),scale=(1,1.18,1))
for row in range(-2,3):
    for col in range(-2,3):
        x=col*.245+(row%2)*.1225; z=1.4+row*.215
        if (x/.55)**2+((z-1.4)/.66)**2>.92: continue
        verts=[(x,shell_surface(x,z,.035),z)]
        for i in range(6):
            a=pi/3*i
            xx=x+.133*cos(a);zz=z+.133*sin(a)
            verts.append((xx,shell_surface(xx,zz,.017),zz))
        faces=[(0,i+1,(i+1)%6+1) for i in range(6)]
        ob=mesh('Mizu.Shell hex %d %d'%(row,col),verts,faces,scutemat,'body')
        so=ob.modifiers.new('Scute depth','SOLIDIFY');so.thickness=.025
        be=ob.modifiers.new('Scute bevel','BEVEL');be.width=.022;be.segments=3

# Tailored robe: flared hem and overlapping collar, with UV-mapped cotton.
loft('Mizu.Yukata tailored body',[(.49,.57,.34),(.54,.59,.355),(.73,.52,.33),(1.02,.45,.31),(1.27,.43,.30),(1.50,.45,.29),(1.65,.30,.23)],cloth,'body')
for side in [-1,1]:
    curve('Mizu.Crossed ivory collar '+str(side),[(side*.24,-.19,1.65),(side*.17,-.31,1.50),(-side*.06,-.34,1.32),(-side*.18,-.32,1.22)],.047,collarmat,'body')
loft('Mizu.Obi broad wrap',[(.94,.466,.328),(.97,.475,.34),(1.10,.47,.335),(1.14,.45,.32)],obi,'body')
for z in [.98,1.105]:
    curve('Mizu.Obi woven seam',[(.474*cos(i*2*pi/48),.34*sin(i*2*pi/48),z) for i in range(48)],.009,obiedge,'body',True)
for side in [-1,1]:
    bow=ell('Mizu.Obi bow '+str(side),(side*.16,.50,1.06),(.21,.075,.13),obi,'body')
    bow.rotation_euler[1]=side*.28
ell('Mizu.Obi bow knot',(0,.56,1.06),(.085,.075,.10),obiedge,'body')

# Bell sleeves constructed along curved paths, with a real open cuff.
for side,suffix in [(-1,'L'),(1,'R')]:
    vs=[];fs=[];uv=[]
    for j in range(13):
        t=j/12
        cx=side*(.30+.34*t);cy=-.015-.27*t;cz=1.46-.17*t
        radius=.16+.13*t
        for i in range(33):
            a=2*pi*i/32
            vs.append((cx+side*.12*cos(a),cy+radius*sin(a),cz+radius*cos(a)))
            uv.append((i/32,j/12))
    for j in range(12):
        for i in range(32):
            a=j*33+i;fs.append((a,a+1,a+34,a+33))
    sleeve=mesh('Mizu.Sleeve.'+suffix,vs,fs,cloth,'arm.'+suffix,uv)
    sleeve.data.materials.append(clothlining)
    so=sleeve.modifiers.new('Sleeve lining thickness','SOLIDIFY');so.thickness=.035;so.material_offset=1
    su=sleeve.modifiers.new('Draped sleeve','SUBSURF');su.levels=1
    curve('Mizu.Cuff seam.'+suffix,[(side*(.64+.12*cos(a)),-.285+.29*sin(a),1.29+.29*cos(a)) for a in [i*2*pi/48 for i in range(48)]],.015,collarmat,'arm.'+suffix,True)
    hand=ell('Mizu.Hand.'+suffix,(side*.46,-.49,1.50),(.18,.15,.18),skin,'arm.'+suffix)
    thumb=ell('Mizu.Thumb.'+suffix,(side*.33,-.58,1.51),(.085,.085,.105),skin,'arm.'+suffix,32,20)
    curve('Mizu.Hand crease.'+suffix,[(side*.47,-.632,1.54),(side*.50,-.64,1.50),(side*.49,-.628,1.46)],.005,ink,'arm.'+suffix)

# Feet with independent toes, solid wooden soles, and raised sandal straps.
for side,suffix in [(-1,'L'),(1,'R')]:
    ell('Mizu.Leg.'+suffix,(side*.29,0,.47),(.13,.13,.20),skin,'leg.'+suffix)
    ell('Mizu.Foot.'+suffix,(side*.29,-.075,.245),(.20,.26,.13),skin,'leg.'+suffix)
    sole=cylinder('Mizu.Geta sole.'+suffix,(side*.29,-.07,.10),1,.12,wood,'leg.'+suffix)
    sole.scale=(.245,.32,1)
    for k in [-1,0,1]:
        ell('Mizu.Toe.'+suffix+str(k),(side*.29+k*.082,-.27,.245),(.057,.082,.065),skin,'leg.'+suffix,24,16)
    curve('Mizu.Sandal strap.'+suffix,[(side*.29-.175,-.05,.27),(side*.29-.09,-.15,.35),(side*.29,-.20,.33),(side*.29+.09,-.15,.35),(side*.29+.175,-.05,.27)],.036,strap,'leg.'+suffix)
    curve('Mizu.Sandal toe divider.'+suffix,[(side*.29,-.2,.33),(side*.29,-.245,.245)],.026,strap,'leg.'+suffix)

# Potion: separate glass envelope, liquid, stopper, cord and reflections.
ell('Mizu.Potion glass',(.38,-.415,.86),(.15,.125,.185),glass,'body')
ell('Mizu.Potion blue liquid',(.38,-.415,.835),(.131,.106,.147),blue,'body')
cylinder('Mizu.Potion neck',(.38,-.415,1.025),.063,.12,glass,'body')
torus('Mizu.Potion bottle lip',(.38,-.415,1.07),.066,.013,glass,'body')
cylinder('Mizu.Potion cork',(.38,-.415,1.115),.059,.085,cork,'body')
torus('Mizu.Potion binding',(.38,-.415,1.044),.070,.014,gold,'body')
curve('Mizu.Potion cord',[(.35,-.43,1.04),(.49,-.42,1.07),(.52,-.40,1.01),(.50,-.40,.94)],.014,obi,'body')
ell('Mizu.Potion cord bead',(.50,-.40,.94),(.025,.025,.032),obi,'body',24,16)
curve('Mizu.Potion reflection',[(.31,-.511,.95),(.28,-.519,.89),(.29,-.515,.82)],.012,white,'body')

# A compact, editable rigid-part rig for the first motion study.
# Sculpted cloth/face skin weighting is deliberately a later production pass.
armdata=bpy.data.armatures.new('Mizu • articulation skeleton')
rig=bpy.data.objects.new('Mizu.Rig',armdata);char.objects.link(rig)
bpy.context.view_layer.objects.active=rig; rig.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')
def bone(name,head,tail,parent=None):
    b=armdata.edit_bones.new(name);b.head=head;b.tail=tail
    if parent:b.parent=armdata.edit_bones[parent]
bone('root',(0,0,0),(0,0,.3))
bone('body',(0,0,.82),(0,0,1.6),'root')
bone('head',(0,0,1.7),(0,0,2.6),'body')
for side,suffix in [(-1,'L'),(1,'R')]:
    bone('arm.'+suffix,(side*.33,0,1.50),(side*.62,-.28,1.3),'body')
    bone('leg.'+suffix,(side*.29,0,.65),(side*.29,0,.18),'root')
bpy.ops.object.mode_set(mode='OBJECT')
for ob in parts:
    bname=bone_parts.get(ob.name,'body')
    # Keep the authored world pose while attaching to each bone.
    world=ob.matrix_world.copy()
    ob.parent=rig;ob.parent_type='BONE';ob.parent_bone=bname
    ob.matrix_world=world
rig.show_in_front=True

scene.render.fps=30
scene.frame_start=1;scene.frame_end=120
for pb in rig.pose.bones:pb.rotation_mode='XYZ'
for f in range(1,122,4):
    t=(f-1)/120*2*pi
    body=rig.pose.bones['body'];headbone=rig.pose.bones['head']
    body.location=(0,.018*sin(t),0)
    body.rotation_euler=(.012*sin(t),.018*sin(t),.009*cos(t))
    headbone.rotation_euler=(.02*sin(t+.4),.025*sin(t*.999),.025*sin(t))
    for pb in [body,headbone]:
        pb.keyframe_insert('location',frame=f);pb.keyframe_insert('rotation_euler',frame=f)
    for side,suffix in [(-1,'L'),(1,'R')]:
        pb=rig.pose.bones['arm.'+suffix]
        pb.rotation_euler=(.035*sin(t+side*.7),0,side*.035*sin(t))
        pb.keyframe_insert('rotation_euler',frame=f)
rig.animation_data.action.name='Mizu • shy breathing idle'
scene.frame_set(1)

# Studio, separate from the exportable character.
def studio_obj(ob,name,mat=None):
    ob.name=name;move(ob,stage)
    if mat:ob.data.materials.append(mat)
    return ob
floor=material('Studio • warm midnight',(.018,.041,.064),.75)
pedmat=material('Studio • teal stone',(.035,.13,.15),.44)
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.15));studio_obj(bpy.context.object,'Studio seamless floor',floor)
bpy.ops.mesh.primitive_cylinder_add(vertices=128,radius=1.25,depth=.13,location=(0,0,-.075))
ped=studio_obj(bpy.context.object,'Mizu display plinth',pedmat)
be=ped.modifiers.new('Rounded pedestal edge','BEVEL');be.width=.05;be.segments=4
for p in ped.data.polygons:p.use_smooth=True

def point_at(ob,xyz):ob.rotation_euler=(Vector(xyz)-ob.location).to_track_quat('-Z','Y').to_euler()
def area(name,loc,power,size,color):
    ld=bpy.data.lights.new(name,'AREA');ld.energy=power;ld.shape='DISK';ld.size=size;ld.color=color
    ob=bpy.data.objects.new(name,ld);stage.objects.link(ob);ob.location=loc;point_at(ob,(0,0,1.65))
area('Studio key • soft warm',(-3.5,-4.5,6),650,4.0,(1,.83,.65))
area('Studio fill • sky',(4,-2.5,3.5),450,3.0,(.60,.84,1))
area('Studio rim • mint',(2,3.5,5.5),850,3.0,(.67,1,.79))
area('Studio face bounce',(-.3,-4,1.4),80,2.0,(1,.94,.84))
world=bpy.data.worlds.new('Mizu studio world');world.use_nodes=True
bg=next(n for n in world.node_tree.nodes if n.type=='BACKGROUND');bg.inputs[0].default_value=(.05,.09,.14,1);bg.inputs[1].default_value=.35
scene.world=world
camdata=bpy.data.cameras.new('Mizu Portrait');cam=bpy.data.objects.new('Mizu Portrait',camdata);stage.objects.link(cam)
cam.location=(4.2,-8.2,4.0);point_at(cam,(0,0,1.5));camdata.type='ORTHO';camdata.ortho_scale=4.25;scene.camera=cam
scene.render.resolution_x=1200;scene.render.resolution_y=1200;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.render.filepath=OUT+'/mizu-portrait.png'
try:scene.render.engine='CYCLES';scene.cycles.samples=48;scene.cycles.use_denoising=True
except (TypeError,AttributeError):pass
try:scene.view_settings.view_transform='AgX'
except (TypeError,ValueError):pass

# Select rig only, open in a useful material preview for the user.
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);bpy.context.view_layer.objects.active=rig
for screen in bpy.data.screens:
    for a in screen.areas:
        if a.type=='VIEW_3D':
            a.spaces.active.region_3d.view_perspective='CAMERA'
            a.spaces.active.shading.type='MATERIAL'
            a.spaces.active.overlay.show_overlays=False

scene['Design']='Mizu, original e.v.e games one-eyed kappa. Based on supplied concept.'
scene['Stage']='Editable 3D character study; rigid-part idle rig, not final deforming production rig.'
bpy.ops.wm.save_as_mainfile(filepath=OUT+'/mizu-character-v01.blend')
print({'scene':scene.name,'character_objects':len(parts),'mesh_faces':sum(len(o.data.polygons) for o in parts if o.type=='MESH'),'saved':bpy.data.filepath})
