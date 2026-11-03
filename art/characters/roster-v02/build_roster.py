"""Original EVE character roster. Blender authoring, not image billboards.
Run setup(), then build(key, form) through Blender MCP. Existing scenes survive.
"""
import bpy, math, os, json, contextlib
from mathutils import Vector
from math import sin,cos,pi
import numpy as np
BASE='/Users/gimjunsu/eve-games/yokai-festival'
OUT=BASE+'/art/characters/roster-v02'
PUBLIC=BASE+'/public/assets/models'
os.makedirs(OUT,exist_ok=True);os.makedirs(PUBLIC,exist_ok=True)
IDS=['mizu','pon','kon','sumi','nemu','akari','kasa']
STYLES=[
 ('#efcdb2','#253e40','#ff984b','waves','#294979','short'),
 ('#e1b392','#684437','#b74161','check','#ecb336','short'),
 ('#f4d4bc','#dcc394','#354a81','stars','#db613d','bob'),
 ('#c7977a','#302c3f','#a0b489','flowers','#d45939','short'),
 ('#f2c6b5','#948297','#a6b796','moon','#ac2c6c','bob'),
 ('#efc19a','#714332','#2d486e','flowers','#e46436','bun'),
 ('#e9bdc8','#6d537f','#e7a73b','flowers','#556884','long')]
GUESTS=[('#f1c7ad','#302733','#dc8194','flowers','#552e58','bob'),('#d6a480','#2c303c','#487d9f','waves','#d5aa59','short'),('#efcdb2','#d4d0c1','#56656f','waves','#ac825a','elder'),('#c98c6b','#423532','#878fb0','stars','#c57259','short'),('#e7b795','#593d38','#9ca981','flowers','#995d74','bun'),('#f4d4bc','#242936','#ddab69','flowers','#365d79','long'),('#ba856a','#352c31','#6f9e9d','waves','#eaab61','short'),('#dfad8e','#80584b','#b88bc4','moon','#724971','bun'),('#f3c7b1','#34252e','#ed9db1','flowers','#65859c','bob')]
MATS={};built={};parts=[];roles={};coll=None;key=''

def lin(v):return v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4
def rgb(h):return tuple(lin(int(h[i:i+2],16)/255) for i in [1,3,5])
def mat(name,color,rough=.45,metal=0,emit=0):
 if name in MATS:return MATS[name]
 m=bpy.data.materials.new('EVE '+name);m.use_nodes=True
 p=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
 p.inputs['Base Color'].default_value=(*rgb(color),1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
 if emit:p.inputs['Emission Color'].default_value=(*rgb(color),1);p.inputs['Emission Strength'].default_value=emit
 m.diffuse_color=(*rgb(color),1);MATS[name]=m;return m

def cloth(color,pattern):
 name='Cotton '+color+' '+pattern
 if name in MATS:return MATS[name]
 m=mat(name,color,.7);n=256;yy,xx=np.mgrid[0:n,0:n]/n;mask=np.zeros((n,n))
 if pattern=='waves':
  for row in range(-1,5):
   cy=row*.32
   for col in range(-1,5):
    cx=col*.48+(row%2)*.24;r=np.sqrt((xx-cx)**2+(yy-cy)**2)
    for radius in [.09,.145,.2]:mask=np.maximum(mask,((abs(r-radius)<.009)&(yy>=cy)&(yy<cy+.23)).astype(float))
 elif pattern=='check':mask=((np.floor(xx*6)+np.floor(yy*6))%2==0).astype(float)
 elif pattern in ['stars','flowers','moon']:
  for i in range(4):
   for j in range(4):
    dx=xx-(i+.5)/4;dy=yy-(j+.5)/4;r=np.sqrt(dx*dx+dy*dy);a=np.arctan2(dy,dx)
    if pattern=='stars':q=r<(.035+.016*np.cos(a*5))
    elif pattern=='flowers':q=r<(.029+.013*np.cos(a*5))
    else:q=(r<.046)&(((dx-.025)**2+(dy+.015)**2)>.0015)
    mask=np.maximum(mask,q.astype(float))
 col=np.array([int(color[i:i+2],16)/255 for i in [1,3,5]]);cream=np.array([1,.86,.62])
 rgba=np.concatenate([col[None,None,:]*(1-mask[...,None])+cream[None,None,:]*mask[...,None],np.ones((n,n,1))],2).astype(np.float32)
 im=bpy.data.images.new(name,width=n,height=n);im.pixels.foreach_set(rgba.ravel());im.pack()
 tex=m.node_tree.nodes.new('ShaderNodeTexImage');tex.image=im
 p=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED');m.node_tree.links.new(tex.outputs['Color'],p.inputs['Base Color'])
 return m

def reg(o,name,m=None,role='body'):
 o.name=key+'__'+name
 for c in list(o.users_collection):c.objects.unlink(o)
 coll.objects.link(o)
 if m:o.data.materials.append(m)
 if o.type=='MESH':
  for p in o.data.polygons:p.use_smooth=True
 parts.append(o);roles[o.name]=role;return o
def ell(name,pos,scale,m,role='body',seg=32):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=seg,ring_count=20,location=pos);o=bpy.context.object;o.scale=scale
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 return reg(o,name,m,role)
def mesh(name,v,f,m,role='body',uv=None):
 me=bpy.data.meshes.new(name);me.from_pydata(v,[],f);me.update();o=bpy.data.objects.new(name,me);coll.objects.link(o);reg(o,name,m,role)
 if uv:
  layer=me.uv_layers.new(name='UVMap')
  for poly in me.polygons:
   for li in poly.loop_indices:layer.data[li].uv=uv[me.loops[li].vertex_index]
 return o
def curve(name,pts,r,m,role='body',closed=False):
 cu=bpy.data.curves.new(name,'CURVE');cu.dimensions='3D';cu.bevel_depth=r;cu.bevel_resolution=2;cu.resolution_u=10
 sp=cu.splines.new('BEZIER');sp.bezier_points.add(len(pts)-1)
 for p,co in zip(sp.bezier_points,pts):p.co=co;p.handle_left_type='AUTO';p.handle_right_type='AUTO'
 sp.use_cyclic_u=closed;o=bpy.data.objects.new(name,cu);coll.objects.link(o);return reg(o,name,m,role)
def ring(name,pos,r,minor,m,role='body',rot=(0,0,0),scale=(1,1,1)):
 bpy.ops.mesh.primitive_torus_add(major_segments=40,minor_segments=8,major_radius=r,minor_radius=minor,location=pos,rotation=rot)
 o=bpy.context.object;o.scale=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);return reg(o,name,m,role)
def cyl(name,pos,r,depth,m,role='body',scale=(1,1,1)):
 bpy.ops.mesh.primitive_cylinder_add(vertices=32,radius=r,depth=depth,location=pos);o=bpy.context.object;o.scale=scale
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);be=o.modifiers.new('Rounded edges','BEVEL');be.width=.024;be.segments=2
 return reg(o,name,m,role)
def headshape(name,pos,scale,m,role='head'):
 v=[];f=[];S=48;L=28
 for j in range(L+1):
  lat=pi*j/L;z=cos(lat);width=sin(lat)*(1+.14*math.exp(-((z+.43)/.32)**2))
  for i in range(S):
   a=2*pi*i/S;v.append((pos[0]+scale[0]*width*cos(a),pos[1]+scale[1]*sin(lat)*sin(a),pos[2]+scale[2]*z))
 for j in range(L):
  for i in range(S):a=j*S+i;b=j*S+(i+1)%S;f.append((a,b,b+S,a+S))
 return mesh(name,v,f,m,role)
def ribbon(name,pts,width,m,role='body'):
 v=[]
 for x,y,z in pts:v.extend([(x-width/2,y,z),(x+width/2,y,z)])
 f=[(i*2,i*2+1,i*2+3,i*2+2) for i in range(len(pts)-1)]
 o=mesh(name,v,f,m,role);so=o.modifiers.new('Soft cotton edge','SOLIDIFY');so.thickness=.018;su=o.modifiers.new('Collar softness','SUBSURF');su.levels=1;return o
def robe(m,belt,skin,single=False):
 rows=[(.48,.58,.35),(.54,.60,.36),(.78,.53,.33),(1.02,.46,.30),(1.25,.43,.29),(1.50,.47,.28),(1.62,.29,.22)]
 v=[];f=[];uv=[];S=48
 for j,(z,rx,ry) in enumerate(rows):
  for i in range(S+1):a=i*2*pi/S;fold=1+.013*cos(a*8);v.append((rx*cos(a)*fold,ry*sin(a)*fold,z));uv.append((i/S*1.5,j/6))
 for j in range(6):
  for i in range(S):a=j*(S+1)+i;f.append((a,a+1,a+S+2,a+S+1))
 o=mesh('tailored_yukata',v,f,m,uv=uv);so=o.modifiers.new('Cloth edge','SOLIDIFY');so.thickness=.025;su=o.modifiers.new('Draped fabric','SUBSURF');su.levels=1
 cyl('obi',(0,0,1.04),1,.20,belt,scale=(.48,.33,1))
 for s in [-1,1]:
  ell('obi_bow',(s*.16,.37,1.06),(.19,.075,.12),belt)
  ribbon('cross_collar',[(s*.22,-.17,1.62),(s*.15,-.29,1.48),(-s*.05,-.33,1.30),(-s*.16,-.32,1.22)],.10,mat('Collar','#ffe0a8',.67))
  role='arm_L' if s<0 else 'arm_R'
  # Curved hollow sleeve, with a defined lower drape.
  v=[];f=[];uv=[]
  for j in range(9):
   t=j/8
   for i in range(25):
    a=i*2*pi/24;r=.16+.10*t
    v.append((s*(.36+.24*t+.07*cos(a)),-.03-.10*t+r*sin(a),1.46-.28*t+r*cos(a)));uv.append((i/24,j/8))
  for j in range(8):
   for i in range(24):a=j*25+i;f.append((a,a+1,a+26,a+25))
  sl=mesh('sleeve',v,f,m,role,uv);so=sl.modifiers.new('Sleeve thickness','SOLIDIFY');so.thickness=.025;su=sl.modifiers.new('Cotton drape','SUBSURF');su.levels=1
  ell('hand',(s*.63,-.17,1.03),(.12,.13,.14),skin,role)
  ell('thumb',(s*.55,-.24,1.06),(.055,.065,.08),skin,role,24)
  if not single:foot(s*.27,'leg_L' if s<0 else 'leg_R',skin)
 if single:foot(0,'leg_L',skin)
def foot(x,role,skin):
 ell('ankle',(x,0,.45),(.115,.12,.19),skin,role)
 cyl('geta',(x,-.06,.10),1,.12,mat('Sandal wood','#906039',.48),role,scale=(.235,.30,1))
 ell('foot',(x,-.075,.235),(.18,.23,.115),skin,role)
 for j in [-1,0,1]:ell('toe',(x+j*.072,-.26,.225),(.05,.065,.052),skin,role,20)
 curve('sandal_strap',[(x-.15,-.02,.26),(x,-.19,.34),(x+.15,-.02,.26)],.032,mat('Leather','#644332',.6),role)
def eye(x,y,z,s=.18,role='head',sleepy=False):
 ell('eye_cream',(x,y,z),(s,s*.25,s*1.14),mat('Eye ivory','#fff0cf',.32),role)
 ell('eye_iris',(x+s*.08,y-s*.24,z+.015),(s*.54,s*.18,s*.76),mat('Iris','#302a32',.22),role)
 ell('eye_glint',(x-s*.14,y-s*.405,z+s*.40),(s*.17,s*.06,s*.20),mat('Eye glint','#fffdf2',.2),role,20)
 if sleepy:curve('sleepy_lid',[(x-s*.9,y-.02,z+s*.2),(x,y-s*.15,z+s*.25),(x+s*.9,y-.02,z+s*.13)],.025,mat('Lid','#ad8ba8',.5),role)
def smile(x,y,z,w=.1,role='head'):
 curve('smile',[(x-w,y,z),(x,y-.015,z-.035),(x+w,y,z)],.011,mat('Mouth ink','#633c47',.6),role)
def ears(pos,fur,inner,role='head',long=False):
 for s in [-1,1]:
  x,y,z=pos;h=.67 if long else .31
  v=[(x+s*.26,y,z),(x+s*.54,y,z),(x+s*.52,y+.02,z+h),(x+s*.39,y-.13,z+.08)]
  o=mesh('pointed_ear',v,[(0,1,2),(0,3,1),(0,2,3),(1,3,2)],fur,role);be=o.modifiers.new('Soft ear edges','BEVEL');be.width=.055;be.segments=3
  mesh('ear_inner',[(x+s*.32,y-.014,z+.07),(x+s*.48,y-.014,z+.07),(x+s*.49,y+.005,z+h-.12)],[(0,1,2)],inner,role)
def tube_path(name,pts,r,m,role='body',sides=12):
 v=[];f=[];rings=32
 # Catmull-Rom interpolation for an organic, smooth neck/tail.
 points=[Vector(p) for p in pts]
 for j in range(rings+1):
  t=j/rings*(len(points)-1);i=min(len(points)-2,int(t));u=t-i;p0=points[max(0,i-1)];p1=points[i];p2=points[i+1];p3=points[min(len(points)-1,i+2)]
  center=.5*((2*p1)+(-p0+p2)*u+(2*p0-5*p1+4*p2-p3)*u*u+(-p0+3*p1-3*p2+p3)*u*u*u)
  tangent=(p2-p1).normalized();a=tangent.cross(Vector((0,1,0))).normalized();b=tangent.cross(a).normalized()
  for k in range(sides):ang=k*2*pi/sides;v.append(tuple(center+r*(a*cos(ang)+b*sin(ang))))
 for j in range(rings):
  for k in range(sides):a=j*sides+k;b=j*sides+(k+1)%sides;f.append((a,b,b+sides,a+sides))
 return mesh(name,v,f,m,role)
def potion(color='#2acfff'):
 m=mat('Potion '+color,color,.17,emit=.35)
 ell('potion_liquid',(.38,-.38,.88),(.125,.11,.16),m)
 cyl('potion_neck',(.38,-.38,1.025),.055,.08,m)
 ring('potion_lip',(.38,-.38,1.05),.06,.012,mat('Bottle rim','#a6ebff',.15))
 cyl('potion_cork',(.38,-.38,1.10),.05,.07,mat('Cork','#c38939',.65))
 curve('potion_glint',[(.33,-.475,.96),(.29,-.475,.89),(.30,-.475,.84)],.012,mat('Glass glint','#e9ffff',.15))
def human(style):
 skin,hair,color,pattern,belt,cut=style;sk=mat('Skin '+skin,skin,.5);ha=mat('Hair '+hair,hair,.48)
 robe(cloth(color,pattern),mat('Obi '+belt,belt,.65),sk)
 headshape('human_face',(0,0,2.12),(.59,.445,.60),sk)
 for s in [-1,1]:
  ell('ear',(s*.58,.005,2.10),(.095,.075,.145),sk,'head')
  eye(s*.20,-.418,2.17,.12)
  ell('blush',(s*.355,-.37,1.995),(.073,.017,.043),mat('Human blush','#e6a08f',.65),'head',24)
  curve('brow',[(s*.30,-.409,2.37),(s*.20,-.44,2.40),(s*.10,-.425,2.37)],.02,ha,'head')
 ell('nose',(0,-.455,2.06),(.065,.07,.075),sk,'head');smile(0,-.424,1.91,.085)
 # Continuous scalp cap with an irregular hairline; no stacked sphere bangs.
 v=[];f=[];S=48;L=16
 for j in range(L+1):
  for i in range(S):
   a=i*2*pi/S;front=max(0,-sin(a));end=1.90-front*.62+.06*sin(a*5)
   t=j/L*end;v.append((.615*sin(t)*cos(a),.46*sin(t)*sin(a)+.035,2.15+.61*cos(t)))
 for j in range(L):
  for i in range(S):a=j*S+i;b=j*S+(i+1)%S;f.append((a,b,b+S,a+S))
 mesh('sculpted_hair_cap',v,f,ha,'head')
 for j in range(5):
  x=-.40+j*.19
  bang=ell('swept_hair_lock',(x,-.325,2.51-.06*sin(j)),(.145,.13,.235),ha,'head',24);bang.rotation_euler[1]=-.25+j*.10
 if cut in ['bob','long']:
  for s in [-1,1]:ell('side_hair',(s*.50,.08,2.05 if cut=='bob' else 1.85),(.16,.31,.39 if cut=='bob' else .58),ha,'head')
 if cut=='bun':
  ell('hair_bun',(.08,.15,2.77),(.23,.23,.22),ha,'head')
  for a in range(5):ell('flower_pin',(.51+cos(a*2*pi/5)*.05,-.03,2.39+sin(a*2*pi/5)*.05),(.045,.025,.045),mat('Hair flower '+belt,belt,.55),'head',20)
 if cut=='elder':
  for s in [-1,1]:ring('spectacles',(s*.20,-.47,2.18),.145,.012,mat('Glasses','#655044',.3,.4),'head',rot=(pi/2,0,0),scale=(1,1,1))
  curve('spectacle_bridge',[(-.05,-.475,2.18),(0,-.49,2.20),(.05,-.475,2.18)],.009,mat('Glasses','#655044',.3,.4),'head')

def yokai(id):
 i=IDS.index(id);style=STYLES[i];sk=mat('Jade','#65d8c2',.42);iv=mat('Fur cream','#ffe7bd',.6)
 if id=='mizu':
  # The first authored Blender character is imported, retaining its editability.
  src=BASE+'/art/characters/mizu-blender/mizu-character-v01.blend'
  if os.path.realpath(bpy.data.filepath)==os.path.realpath(src):
   import shutil
   copied=OUT+'/mizu-source.blend';shutil.copyfile(src,copied);src=copied
  with bpy.data.libraries.load(src,link=False) as (data,to):to.collections=['MIZU • Character']
  c=to.collections[0]
  for o in list(c.objects):
   c.objects.unlink(o);coll.objects.link(o)
  return 'imported'
 robe(cloth(style[2],style[3]),mat('Obi '+style[4],style[4],.65),sk if id=='kasa' else iv,single=id=='kasa')
 if id=='pon':
  fur=mat('Pon honey fur','#c68d5e',.67);dark=mat('Pon dark fur','#75513f',.62)
  headshape('tanuki_head',(0,-.015,2.15),(.72,.49,.60),fur)
  for s in [-1,1]:
   ell('round_ear',(s*.51,.0,2.67),(.18,.10,.19),dark,'head');ell('ear_peach',(s*.51,-.08,2.67),(.10,.035,.11),mat('Ear peach','#d79380',.7),'head')
   ell('dot_eye',(s*.23,-.471,2.35),(.055,.035,.055),mat('Iris','#302a32',.22),'head')
  # Large belly-mouth silhouette, a defining feature of the supplied Pon.
  ell('belly_muzzle',(0,-.34,1.83),(.61,.28,.50),iv,'head')
  ell('hungry_mouth',(0,-.573,1.82),(.46,.09,.365),mat('Mouth cavity','#431d24',.7),'head')
  ell('tongue',(0,-.66,1.66),(.29,.06,.15),mat('Tongue','#ec8f9c',.48),'head')
  curve('tongue_crease',[(0,-.722,1.64),(0,-.72,1.71)],.006,mat('Tongue crease','#c9657a',.6),'head')
  tail=ell('striped_tail',(0,.52,1.51),(.73,.43,.94),fur,'tail');tail.rotation_euler[1]=.27
  for z in [.91,1.29,1.68,2.06]:
   ring('tail_stripe',(0,.57,z),.45,.10,dark,'tail',scale=(1.38,.85,1))
 elif id=='kon':
  # S-shaped neck, retained as a separate articulated part.
  tube_path('long_fox_neck',[(0,0,1.58),(-.26,0,1.97),(.20,0,2.34),(.04,0,2.67)],.17,iv,'neck')
  headshape('fox_head',(.04,-.015,2.80),(.55,.36,.39),iv)
  ears((.04,0,3.04),iv,mat('Fox ear','#f3a89a',.6),long=True)
  for s in [-1,1]:
   eye(.04+s*.22,-.337,2.85,.12,sleepy=s<0)
   ell('fox_cheek',(.04+s*.36,-.15,2.63),(.22,.20,.10),iv,'head')
  ell('fox_nose',(.04,-.394,2.67),(.05,.04,.032),mat('Nose','#785040',.45),'head');smile(.04,-.35,2.59,.1)
  for s in [-1,1]:
   tube_path('fox_tail',[(s*.20,.28,.84),(s*.53,.54,1.0),(s*.73,.48,1.45),(s*.69,.35,1.72)],.19,iv,'tail')
   ell('lavender_tail_tip',(s*.69,.35,1.69),(.20,.18,.28),mat('Fox magic','#c7a4ee',.45,emit=.12),'tail')
 elif id=='sumi':
  feather=mat('Crow feather','#4b4769',.55);beak=mat('Crow beak','#8f7660',.5)
  for s,role in [(-1,'head'),(1,'extra_head')]:
   z=2.26 if s<0 else 2.68
   tube_path('crow_neck',[(s*.25,0,1.52),(s*.42,0,z-.28)],.22,feather,role)
   ell('crow_head',(s*.38,-.02,z),(.37,.34,.40),feather,role)
   for x in [-.115,.115]:eye(s*.38+x,-.333,z+.06,.105,role,sleepy=s<0)
   v=[(s*.38-.20,-.27,z-.10),(s*.38+.20,-.27,z-.10),(s*.38,-.85,z-.17),(s*.38,-.35,z+.07)]
   o=mesh('hook_beak',v,[(0,1,2),(0,3,1),(0,2,3),(1,3,2)],beak,role);be=o.modifiers.new('Soft beak','BEVEL');be.width=.10;be.segments=3
   for j in range(4):ell('head_feather',(s*.38+(j-1.5)*.11,0,z+.35),(.10,.15,.20),feather,role,24)
  for s,role in [(-1,'arm_L'),(1,'arm_R')]:
   for j in range(6):
    o=ell('wing_feather',(s*(.53+j*.065),.01,1.28-j*.075),(.09,.10,.24),feather,role,24);o.rotation_euler[1]=s*.28
  for j in range(4):ell('crow_tail',((j-1.5)*.10,.51,.8),(.095,.32,.10),feather,'tail',24)
 elif id=='nemu':
  fur=mat('Nemu plum','#b18d9f',.65)
  headshape('faceless_cat_head',(0,-.02,2.13),(.65,.43,.48),fur)
  ears((0,-.05,2.43),fur,mat('Cat ear','#e79aa8',.6))
  tube_path('face_tail',[(0,.3,.75),(.62,.37,1.2),(.76,.26,2.0),(.60,.10,2.8),(.40,-.01,2.97)],.14,fur,'tail')
  headshape('tail_face',(.40,-.03,2.97),(.36,.25,.32),iv,'mask')
  ears((.40,-.03,3.15),iv,mat('Cat ear','#e79aa8',.6),'mask')
  for s in [-1,1]:eye(.40+s*.14,-.265,2.99,.09,'mask',True)
  ell('tail_face_nose',(.40,-.29,2.90),(.03,.022,.021),mat('Nose pink','#d88291',.6),'mask',20);smile(.40,-.27,2.84,.07,'mask')
 elif id=='akari':
  amber=mat('Lantern amber','#ffc86e',.5,emit=.25);metal=mat('Lantern metal','#6a4931',.37,.30)
  for j,(z,r) in enumerate([(1.40,.43),(2.05,.52),(2.71,.40)]):
   role=['body','lantern_mid','head'][j]
   ell('lantern_body',(0,0,z),(r,r*.7,.30),amber,role)
   for dz in [-.29,.29]:cyl('lantern_cap',(0,0,z+dz),r*.47,.07,metal,role)
   for k in range(-3,4):
    h=k*.072;rad=r*math.sqrt(max(.05,1-(h/.31)**2))
    ring('paper_rib',(0,0,z+h),rad,.008,mat('Lantern rib','#d79c50',.6),role,scale=(1,.70,1))
   for s in [-1,1]:eye(s*r*.36,-r*.685,z+.05,.075,role,sleepy=j==0)
   if j==1:
    ell('yawning_mouth',(0,-r*.71,z-.10),(.22,.035,.12),mat('Mouth cavity','#431d24',.7),role)
    ell('yawning_tongue',(0,-r*.75,z-.15),(.12,.025,.05),mat('Tongue','#ec8f9c',.48),role)
   else:smile(0,-r*.72,z-.10,.08,role)
  ring('hanging_loop',(0,0,3.14),.10,.027,metal,'head',rot=(pi/2,0,0))
 elif id=='kasa':
  purple=mat('Kasa lavender','#a580c8',.52);ribs=mat('Umbrella wood','#b48b53',.6)
  v=[];f=[];S=64;R=12
  for j in range(R+1):
   t=j/R
   for i in range(S+1):
    a=2*pi*i/S;r=.025+.94*t;z=2.95-.76*t+.04*cos(a*8)*t**4
    v.append((r*cos(a),r*sin(a),z))
  for j in range(R):
   for i in range(S):a=j*(S+1)+i;f.append((a,a+1,a+S+2,a+S+1))
  o=mesh('umbrella_canopy',v,f,purple,'umbrella');so=o.modifiers.new('Canopy thickness','SOLIDIFY');so.thickness=.035
  for k in range(8):
   a=k*2*pi/8;curve('umbrella_rib',[(.05*cos(a),.05*sin(a),2.93),(.50*cos(a),.50*sin(a),2.53),(.96*cos(a),.96*sin(a),2.18)],.015,ribs,'umbrella')
   ell('canopy_tassel',(.96*cos(a),.96*sin(a),2.09),(.045,.045,.12),mat('Tassel','#ffe4ab',.65),'umbrella',20)
  cyl('umbrella_handle',(0,0,1.96),.045,1.7,ribs)
  eye(0,-.53,2.54,.23,'umbrella')
  ell('umbrella_tongue',(0,-.50,2.16),(.11,.06,.19),mat('Tongue','#ec8f9c',.48),'umbrella')
  cyl('umbrella_finial',(0,0,2.99),.055,.13,ribs,'umbrella')
 potion('#bb77ed' if id=='kon' else '#a4e85c' if id=='kasa' else '#ffbb4a' if id in ['pon','akari'] else '#2acfff')

def setup():
 global scene,studio,world,portrait_camera
 scene=bpy.data.scenes.new('EVE • Full Character Roster v02');bpy.context.window.scene=scene
 scene.render.fps=30;scene.frame_start=1;scene.frame_end=120
 studio=bpy.data.collections.new('EVE • Asset Studio')
 world=bpy.data.worlds.new('EVE • soft blue studio');world.use_nodes=True
 bg=next(n for n in world.node_tree.nodes if n.type=='BACKGROUND');bg.inputs[0].default_value=(.07,.10,.15,1);bg.inputs[1].default_value=.45
 for name,loc,power,size,color in [('Key',(-3,-4,6),700,4,(1,.84,.69)),('Fill',(4,-2,4),450,3,(.65,.84,1)),('Rim',(2,3,5),850,3,(.8,1,.86))]:
  ld=bpy.data.lights.new('EVE '+name,'AREA');ld.energy=power;ld.size=size;ld.color=color
  ob=bpy.data.objects.new('EVE '+name,ld);studio.objects.link(ob);ob.location=loc;ob.rotation_euler=(Vector((0,0,1.6))-ob.location).to_track_quat('-Z','Y').to_euler()
 cd=bpy.data.cameras.new('EVE Asset Portrait');portrait_camera=bpy.data.objects.new('EVE Asset Portrait',cd);studio.objects.link(portrait_camera)
 portrait_camera.location=(3,-8,3.6);portrait_camera.rotation_euler=(Vector((0,0,1.7))-portrait_camera.location).to_track_quat('-Z','Y').to_euler();cd.type='ORTHO';cd.ortho_scale=4.5
 print('New roster scene ready; previous scene preserved')

def build(id,form='yokai'):
 global parts,roles,coll,key
 parts=[];roles={};key=id+'_'+form
 coll=bpy.data.collections.new(key);scene.collection.children.link(coll)
 result=None
 if form=='human':human(STYLES[IDS.index(id)])
 elif form=='guest':human(GUESTS[int(id.split('-')[-1])])
 else:result=yokai(id)
 if result=='imported':
  rig=next(o for o in coll.objects if o.type=='ARMATURE');parts=[o for o in coll.objects if o!=rig and not o.hide_render]
  for o in list(coll.objects):
   if o.hide_render:coll.objects.unlink(o)
  rig.animation_data_clear()
  for o in parts:
   if o.type=='MESH' and o.data.shape_keys:o.data.shape_keys.animation_data_clear()
  rig.name=key+'__rig'
  for b in rig.data.bones:b.name=key+'__'+b.name.replace('.','_')
 else:
  data=bpy.data.armatures.new(key+' rig');rig=bpy.data.objects.new(key+'__rig',data);coll.objects.link(rig)
  bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
  def bone(name,h,t,parent=None):
   b=data.edit_bones.new(key+'__'+name);b.head=h;b.tail=t
   if parent:b.parent=data.edit_bones[key+'__'+parent]
  bone('root',(0,0,0),(0,0,.3));bone('body',(0,0,.8),(0,0,1.6),'root')
  bone('head',(0,0,1.7),(0,0,2.5),'body')
  bone('arm_L',(-.36,0,1.5),(-.6,0,1.1),'body');bone('arm_R',(.36,0,1.5),(.6,0,1.1),'body')
  bone('leg_L',(-.27 if id!='kasa' or form!='yokai' else 0,0,.65),(-.27 if id!='kasa' or form!='yokai' else 0,0,.2),'root')
  bone('leg_R',(.27,0,.65),(.27,0,.2),'root')
  bone('tail',(0,.27,.9),(0,.45,1.5),'body');bone('neck',(0,0,1.6),(0,0,2.6),'body')
  bone('extra_head',(.38,0,2.4),(.38,0,2.9),'body');bone('mask',(.40,0,2.7),(.40,0,3.2),'tail')
  bone('lantern_mid',(0,0,1.8),(0,0,2.3),'body');bone('umbrella',(0,0,2.4),(0,0,2.9),'body')
  if id=='kon' and form=='yokai':data.edit_bones[key+'__head'].parent=data.edit_bones[key+'__neck']
  bpy.ops.object.mode_set(mode='OBJECT');bpy.context.view_layer.update()
  for ob in parts:
   wmat=ob.matrix_world.copy();ob.parent=rig;ob.parent_type='BONE';ob.parent_bone=key+'__'+roles[ob.name];ob.matrix_world=wmat
 rig['character']=id;rig['form']=form;rig['assetVersion']='blender-roster-v02'
 for o in coll.objects:o.select_set(False)
 built[key]=(coll,rig)
 # Individual native files contain the collection, editable materials and skeleton.
 native=OUT+'/'+key;os.makedirs(native,exist_ok=True)
 native_scene=bpy.data.scenes.new(key+' • Character Studio');native_scene.collection.children.link(coll);native_scene.collection.children.link(studio);native_scene.world=world;native_scene.camera=portrait_camera
 native_scene.render.resolution_x=900;native_scene.render.resolution_y=900;native_scene.render.resolution_percentage=100
 try:native_scene.render.engine='CYCLES';native_scene.cycles.samples=32;native_scene.cycles.use_denoising=True
 except (TypeError,AttributeError):pass
 previous_scene=bpy.context.window.scene;bpy.context.window.scene=native_scene
 bpy.ops.wm.save_as_mainfile(filepath=native+'/'+key+'.blend')
 bpy.context.window.scene=previous_scene
 bpy.ops.object.select_all(action='DESELECT')
 for o in coll.objects:o.select_set(True)
 bpy.context.view_layer.objects.active=rig
 with open(OUT+'/export.log','a') as log,contextlib.redirect_stdout(log):
  bpy.ops.export_scene.gltf(filepath=PUBLIC+'/'+key+'.glb',use_selection=True,export_format='GLB',export_animations=False,export_extras=True,export_yup=True,export_apply=False)
 # Archive a copy alongside the native source.
 import shutil
 shutil.copyfile(PUBLIC+'/'+key+'.glb',native+'/'+key+'.glb')
 for o in coll.objects:o.select_set(False)
 coll.hide_viewport=True;coll.hide_render=True
 print(key,os.path.getsize(PUBLIC+'/'+key+'.glb'),'bytes',len(coll.objects),'parts')

def gallery():
 global scene
 for i,(name,(c,rig)) in enumerate(built.items()):
  c.hide_viewport=False;c.hide_render=False
  if '_guest' in name:row=2;col=int(name.split('_')[0].split('-')[-1]);rig.location=(col*3.3-13.2,10,0)
  else:
   id,form=name.split('_');col=IDS.index(id);row=0 if form=='yokai' else 1;rig.location=(col*3.3-9.9,row*5,0)
 bpy.ops.wm.save_as_mainfile(filepath=OUT+'/eve-roster-v02.blend')
 manifest={'version':'blender-roster-v02','models':[{'key':k,'url':'/assets/models/'+k+'.glb','source':k+'/'+k+'.blend'} for k in built]}
 open(OUT+'/manifest.json','w').write(json.dumps(manifest,indent=2));open(PUBLIC+'/manifest.json','w').write(json.dumps(manifest,indent=2))
 print('Roster saved',len(built),'models')
