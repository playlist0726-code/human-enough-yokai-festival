"""Original procedural 3D motion studies based on the approved yokai art direction.
These are editable geometric rigs, not an automatic reconstruction of the image sheets.
Run inside Blender. +X is the character's left, -Y is forward, Z is up.
"""
import bpy, math
from mathutils import Vector
from math import sin, cos, pi

COLORS={'cream':'F5E5BF','skin':'61C9C1','leaf':'8DAD43','shell':'587D65','orange':'F68A43','navy':'29446C','blue':'29BAF0','purple':'AA7ED1','tan':'B7855D','brown':'744D3B','pink':'E988A6','sage':'97B596','red':'AE4663','yellow':'EDBD54','indigo':'3C4564','mauve':'967B99','dark':'292736','white':'FFF7E3'}
MATS={}
def mat(color):
    code=COLORS.get(color,color)
    if code in MATS:return MATS[code]
    srgb=tuple(int(code[i:i+2],16)/255 for i in (0,2,4))
    rgb=tuple(c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4 for c in srgb)
    m=bpy.data.materials.new(code);m.diffuse_color=(*rgb,1);m.use_nodes=True
    bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*rgb,1);bs.inputs['Roughness'].default_value=.75
    MATS[code]=m;return m
def empty(name,loc=(0,0,0),parent=None):
    o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.parent=parent;o.location=loc;return o
def finish(o,name,color,parent):
    o.name=name;o.data.materials.append(mat(color));o.parent=parent
    if o.type=='MESH':
        for p in o.data.polygons:p.use_smooth=True
    return o
def ball(name,loc,scale,color,parent=None,seg=24):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg,ring_count=16,location=loc)
    o=finish(bpy.context.object,name,color,parent);o.scale=scale;return o
def cone(name,loc,r1,r2,depth,color,parent=None,vertices=40):
    bpy.ops.mesh.primitive_cone_add(vertices=vertices,radius1=r1,radius2=r2,depth=depth,location=loc)
    o=finish(bpy.context.object,name,color,parent)
    b=o.modifiers.new('soft edges','BEVEL');b.width=.055;b.segments=3
    return o
def tube(name,points,radius,color,parent=None):
    c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.resolution_u=12;c.bevel_depth=radius;c.bevel_resolution=3
    p=c.splines.new('POLY');p.points.add(len(points)-1)
    for a,v in zip(p.points,points):a.co=(*v,1)
    o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);o.parent=parent;o.data.materials.append(mat(color));return o
def smooth_tube(name,points,radius,color,parent=None):
    c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.resolution_u=16;c.bevel_depth=radius;c.bevel_resolution=4
    p=c.splines.new('BEZIER');p.bezier_points.add(len(points)-1)
    for a,v in zip(p.bezier_points,points):a.co=v;a.handle_left_type='AUTO';a.handle_right_type='AUTO'
    o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);o.parent=parent;o.data.materials.append(mat(color));return o
def arc(name,center,radius,a0,a1,color,parent=None,thick=.015,plane='XZ'):
    ps=[]
    for i in range(25):
        a=a0+(a1-a0)*i/24
        ps.append((center[0]+radius*cos(a),center[1],center[2]+radius*sin(a)) if plane=='XZ' else (center[0]+radius*cos(a),center[1]+radius*sin(a),center[2]))
    return tube(name,ps,thick,color,parent)
def eye(name,parent,loc,r=.15,half=False):
    g=empty(name,loc,parent)
    white=ball(name+'_sclera',(0,0,0),(r,r*.32,r*1.15),'cream',g)
    pupil=ball(name+'_pupil',(.012,-r*.31,.006),(r*.42,r*.2,r*.52),'dark',g)
    ball(name+'_glint',(-r*.06,-r*.5,r*.2),(r*.12,r*.08,r*.12),'white',g)
    lid=ball(name+'_lid',(0,-.005,r*.58),(r*1.01,r*.34,r*.55), 'skin',g) if half else None
    if not half:
        lid=ball(name+'_lid',(0,-.005,r*.78),(r*1.01,r*.34,r*.18),'skin',g);lid.hide_render=True
    return {'group':g,'pupil':pupil,'lid':lid,'white':white,'r':r,'half':half}
def mouth(name,parent,loc,size=(.18,.02,.10),tongue=False):
    o=ball(name,loc,size,'dark',parent)
    if tongue:ball(name+'_tongue',(loc[0],loc[1]-size[1]-.015,loc[2]-size[2]*.36),(size[0]*.66,.03,size[2]*.40),'pink',parent)
    return o
def potion(parent,color,loc=(.57,-.36,.9)):
    g=empty('personal_potion',loc,parent)
    ball('potion_glass',(0,0,0),(.14,.14,.17),color,g)
    cone('potion_neck',(0,0,.18),.054,.054,.11,'blue' if color=='blue' else color,g)
    cone('orange_stopper',(0,0,.245),.063,.063,.06,'orange',g)
    arc('bottle_tie',(0,0,.17),.063,0,2*pi,'navy',g,.012,'XY')
    ball('bottle_glint',(-.045,-.128,.05),(.028,.015,.05),'white',g)
    return g
def motif(parent,kind,color,radius=.49,zmin=.56,zmax=1.12):
    for row,z in enumerate((zmin,(zmin+zmax)/2,zmax)):
        for k in range(7):
            a=-pi+.2+k*(2*pi/7)+(row%2)*.15
            x=radius*sin(a);y=-radius*cos(a)
            if kind=='wave':
                for rr in (.05,.085,.12):
                    pts=[(x+rr*cos(q),y-.018,z+rr*sin(q)) for q in [pi*i/16 for i in range(17)]]
                    tube('wave_print',pts,.008,color,parent)
            elif kind=='star':
                pts=[]
                for j in range(11):
                    b=pi/2+2*pi*j/10;r=.075 if j%2==0 else .032
                    pts.append((x+r*cos(b),y-.018,z+r*sin(b)))
                tube('star_print',pts,.011,color,parent)
            elif kind=='moon':arc('moon_print',(x,y-.018,z),.06,.3,pi*1.6,color,parent,.016)
            elif kind=='flower':
                for j in range(6):
                    b=2*pi*j/6;ball('flower_print',(x+.047*cos(b),y-.018,z+.047*sin(b)),(.022,.014,.026),color,parent,12)
            elif kind=='checks':
                if (row+k)%2==0:ball('cream_check',(x,y-.02,z),(.075,.016,.064),color,parent,12)
def garment(rig,color='orange',obi='navy',kind='wave',radius=.51):
    t=rig['torso'];body=cone('yukata_body',(0,0,.93),radius+.10,radius-.09,.92,color,t);body.scale.y=.77
    belt=cone('obi',(0,-.005,1.02),radius+.013,radius+.013,.18,obi,t);belt.scale.y=.80
    tube('collar_left',[(-.28,-.34,1.4),(0,-.43,1.12),(.17,-.4,1.3)],.043,'cream',t)
    ball('back_bow_l',(-.10,.43,1.02),(.14,.05,.08),obi,t)
    ball('back_bow_r',(.10,.43,1.02),(.14,.05,.08),obi,t)
    motif(t,kind,'cream',radius*.90,.54,.77)
    for side in ('l','r'):
        arm=rig['arm_'+side]
        ball('festival_sleeve',(0,0,-.14),(.22,.23,.24),color,arm)
    rig['coat']=body
def standard(id,skin,coat,obi,kind,pcolor,single=False):
    root=empty(id+'_root');torso=empty('torso',parent=root)
    r={'id':id,'root':root,'torso':torso,'eyes':[],'extras':{},'skin':skin}
    ball('body',(0,0,.93),(.47,.36,.57),skin,torso)
    head=empty('head',(0,0,1.87),torso);r['head']=head
    for suffix,sign in [('l',1),('r',-1)]:
        a=empty('arm_'+suffix,(sign*.57,0,1.35),torso);r['arm_'+suffix]=a
        a.rotation_euler.y=sign*.27
        ball('hand_'+suffix,(0,-.03,-.34),(.17,.15,.18),skin,a)
        if not single:
            leg=empty('leg_'+suffix,(sign*.24,0,.50),root);r['leg_'+suffix]=leg
            ball('leg_'+suffix,(0,0,-.20),(.13,.13,.24),skin,leg)
            foot=ball('foot_'+suffix,(0,-.12,-.34),(.18,.26,.12),skin,leg)
            ball('sandal_'+suffix,(0,-.12,-.43),(.20,.29,.06),'brown',leg)
            tube('sandal_strap', [(-.14,-.09,-.31),(0,-.25,-.25),(.14,-.09,-.31)],.035,'navy',leg)
    garment(r,coat,obi,kind)
    r['potion']=potion(torso,pcolor)
    return r
def cheek(parent,x,y,z):ball('cheek',(x,y,z),(.10,.04,.07),'pink',parent)
def mizu():
    r=standard('mizu','skin','orange','navy','wave','blue');h=r['head'];t=r['torso']
    ball('kappa_head',(0,0,.08),(.67,.49,.65),'skin',h)
    e=eye('single_eye',h,(0,-.465,.17),.36);r['eyes'].append(e)
    cheek(h,-.40,-.39,-.13);cheek(h,.40,-.39,-.13)
    tube('shy_mouth',[(-.10,-.455,-.27),(-.015,-.49,-.25),(.07,-.47,-.28)],.017,'dark',h)
    shell=ball('turtle_shell',(0,.41,1.18),(.53,.26,.65),'shell',t);r['extras']['shell']=shell
    # Soft segment lines, on the visible rear surface, stay on the same single shell.
    for z in (.90,1.15,1.4):tube('shell_segment',[(-.38,.56,z),(0,.66,z+.04),(.38,.56,z)],.012,'leaf',t)
    for x in (-.19,.19):tube('shell_segment',[(x,.60,.72),(x,.66,1.6)],.012,'leaf',t)
    dish=empty('dish',(0,0,.66),h);r['extras']['dish']=dish
    ball('green_dish',(0,0,0),(.53,.44,.10),'leaf',dish)
    ball('dish_water',(0,0,.112),(.42,.34,.021),'blue',dish)
    for k in range(10):
        a=2*pi*k/10;leaf=ball('dish_leaf',(cos(a)*.47,sin(a)*.38,.07),(.14,.10,.075),'leaf',dish);leaf.rotation_euler.z=a
    for sign in (-1,1):
        ball('side_leaf',(sign*.49,0,.47),(.13,.18,.28),'leaf',h)
        ball('water_drop',(sign*.43,-.24,.43),(.035,.027,.085),'blue',h)
    r['drink_target']=(0,-.52,1.65);return r
def pon():
    r=standard('pon','tan','red','yellow','checks','orange');h=r['head'];t=r['torso']
    # Head above giant belly mouth: no head-mouth is ever created.
    h.location.z=1.92;ball('tanuki_head',(0,0,0),(.57,.43,.36),'tan',h)
    for sign in (-1,1):
        ball('round_ear',(sign*.43,0,.29),(.14,.10,.18),'brown',h)
        e=eye('tiny_eye',h,(sign*.20,-.41,.04),.047);r['eyes'].append(e)
    ball('belly_mouth_rim',(0,-.35,1.21),(.49,.17,.42),'tan',t)
    bm=mouth('BELLY_MOUTH',t,(0,-.52,1.19),(.40,.08,.32),True);r['extras']['belly_mouth']=bm
    tail=empty('striped_tail',(0,.40,.78),t);r['extras']['tail']=tail
    o=ball('one_big_tail',(0,.27,.71),(.46,.32,.91),'tan',tail);o.rotation_euler.x=-.18
    for j in range(5):
        z=.11+j*.28;factor=math.sqrt(max(.05,1-((z-.71)/.91)**2))
        stripe=ball('tail_stripe',(0,.27,z),(.461*factor,.325*factor,.065),'brown',tail);stripe.rotation_euler.x=-.18
    r['drink_target']=(0,-.65,1.22);return r
def foxear(parent,x,z,fold=False):
    o=cone('asymmetric_ear',(x,0,z),.20,.018,.64 if not fold else .44,'orange',parent,3);o.scale.y=.55;o.rotation_euler.y=(-.27 if x<0 else .15)
    q=cone('ear_inner',(x,-.07,z+.012),.12,.008,.44 if not fold else .25,'pink',parent,3);q.scale.y=.20
    if fold:ball('folded_ear_tip',(x-.08,0,z+.20),(.14,.10,.075),'cream',parent)
def kon():
    r=standard('kon','cream','navy','orange','star','purple');h=r['head'];t=r['torso'];h.location=(.14,0,2.5)
    # One neck built as a single curved segment chain and animated without adding necks.
    neck=empty('long_neck',parent=t);r['extras']['neck']=neck
    smooth_tube('one_flexible_neck',[(0,0,1.4),(-.22,0,1.65),(-.26,0,1.96),(.14,0,2.25),(.14,0,2.53)],.135,'cream',neck)
    ball('fox_head',(0,0,0),(.45,.35,.32),'cream',h)
    foxear(h,.29,.43,False);foxear(h,-.29,.34,True)
    for sign in (-1,1):
        e=eye('fox_eye',h,(sign*.18,-.31,.03),.102);r['eyes'].append(e)
    ball('fox_nose',(0,-.40,-.06),(.042,.034,.03),'dark',h)
    tube('fox_smile',[(-.055,-.36,-.13),(0,-.4,-.15),(.055,-.36,-.13)],.01,'dark',h)
    for sign in (-1,1):
        tail=empty('tail_'+str(sign),(sign*.31,.29,.55),t);r['extras']['tail_'+str(sign)]=tail
        ball('fluffy_tail',(sign*.12,.19,.30),(.24,.25,.50),'cream',tail)
        ball('lavender_tip',(sign*.17,.20,.66),(.19,.22,.22),'purple',tail)
    r['drink_target']=(.14,-.38,2.38);return r
def crowhead(parent,name,loc,calm):
    g=empty(name,loc,parent);ball(name+'_head',(0,0,0),(.30,.28,.34),'indigo',g)
    beak=ball(name+'_beak',(0,-.32,-.065),(.14,.23,.085),'brown',g)
    es=[]
    for sign in (-1,1):
        e=eye(name+'_eye',g,(sign*.15,-.235,.06),.094,calm);e['lid'].data.materials.clear();e['lid'].data.materials.append(mat('indigo'));es.append(e)
    for k in range(3):ball('head_tuft',((k-1)*.08,.02,.32),(.07,.09,.12),'indigo',g)
    return g,es
def sumi():
    r=standard('sumi','indigo','sage','orange','flower','blue');r['head'].location.z=1.98
    a,es=crowhead(r['head'],'calm_head',(-.31,-.06,-.10),True);b,es2=crowhead(r['head'],'panic_head',(.31,.06,.34),False)
    for x,z in ((-.31,1.66),(.31,1.90)):ball('crow_neck',(x,0,z),(.18,.18,.38),'indigo',r['torso'])
    r['eyes']=es+es2;r['extras'].update({'calm_head':a,'panic_head':b})
    for suffix in ('l','r'):
        ar=r['arm_'+suffix]
        for j in range(4):ball('wing_feather',((j-1.5)*.072,.035,-.29-j*.028),(.072,.11,.19),'indigo',ar)
    tail=empty('one_fan_tail',(0,.3,.67),r['torso']);r['extras']['tail']=tail
    for j in range(5):
        o=ball('tail_feather',((j-2)*.08,.20,.05),(.09,.23,.14),'indigo',tail);o.rotation_euler.z=(j-2)*.18
    r['drink_target']=(.31,-.44,1.99);return r
def nemu():
    r=standard('nemu','mauve','sage','red','moon','cream');h=r['head'];t=r['torso']
    ball('FACELESS_original_head',(0,0,0),(.46,.36,.35),'mauve',h)
    for sign in (-1,1):
        o=cone('original_head_ear',(sign*.30,0,.35),.16,.012,.33,'mauve',h,3);o.scale.y=.65
        q=cone('original_ear_inner',(sign*.30,-.05,.35),.095,.007,.23,'pink',h,3);q.scale.y=.20
    tail=empty('ONE_mask_tail',parent=t);r['extras']['tail']=tail
    smooth_tube('one_curled_tail',[(0,.30,.82),(.48,.27,1.1),(.66,.18,1.75),(.48,.10,2.43),(.05,0,2.58),(-.26,-.03,2.40)],.11,'mauve',tail)
    mask=empty('tail_tip_MASK',(-.26,-.03,2.40),tail);r['extras']['mask']=mask
    ball('cream_mask',(0,0,0),(.34,.16,.32),'cream',mask)
    for sign in (-1,1):
        e=eye('MASK_eye',mask,(sign*.145,-.15,.00),.08,True);e['lid'].data.materials.clear();e['lid'].data.materials.append(mat('cream'));r['eyes'].append(e)
        q=cone('mask_ear',(sign*.22,0,.31),.12,.01,.29,'cream',mask,3);q.scale.y=.5
    ball('mask_nose',(0,-.18,-.10),(.045,.025,.035),'pink',mask)
    tube('mask_mouth',[(-.06,-.17,-.16),(0,-.19,-.18),(.06,-.17,-.16)],.01,'brown',mask)
    r['drink_target']=(-.26,-.28,2.22);return r
def akari():
    r=standard('akari','yellow','navy','orange','flower','orange');t=r['torso'];r['head'].location.z=0
    # Remove ordinary skin body. Three lanterns are the body and head together.
    bpy.data.objects['body'].hide_render=True
    lanterns=[]
    for i,(z,rad) in enumerate(((1.1,.39),(1.80,.52),(2.54,.31))):
        g=empty('lantern_'+str(i+1),(0,-.20 if i==0 else 0,z),t);lanterns.append(g)
        ball('paper_lantern',(0,0,0),(rad,rad*.80,rad*.72),'yellow',g)
        for h in (-.55,-.25,.25,.55):arc('lantern_rib',(0,0,h*rad),rad*math.sqrt(1-h*h),0,2*pi,'orange',g,.009,'XY')
        cone('lantern_cap_top',(0,0,rad*.69),rad*.35,rad*.35,.06,'brown',g)
        cone('lantern_cap_bottom',(0,0,-rad*.69),rad*.35,rad*.35,.06,'brown',g)
        for sign in (-1,1):
            e=eye('lantern_eye',g,(sign*rad*.38,-rad*.72,rad*.08),rad*.12,i==0);e['lid'].data.materials.clear();e['lid'].data.materials.append(mat('yellow'));r['eyes'].append(e)
        if i==1:mouth('middle_lantern_mouth',g,(0,-rad*.80,-.09),(.23,.025,.13),True)
        else:tube('small_lantern_mouth',[(-.035,-rad*.80,-.09),(0,-rad*.82,-.10),(.035,-rad*.80,-.09)],.009,'brown',g)
    r['extras']['lanterns']=lanterns
    # Lower lantern remains visible above the open short jacket rather than being hidden by cloth.
    r['coat'].scale.z=.62;r['coat'].location.z=.77
    for z in (1.44,2.19):cone('flexible_connector',(0,0,z),.07,.07,.16,'brown',t)
    arc('top_brass_loop',(0,0,2.83),.09,0,2*pi,'brown',t,.017)
    r['drink_target']=(0,-.50,1.65);return r
def kasa():
    r=standard('kasa','purple','yellow','navy','star','leaf',single=True);h=r['head'];h.location.z=2.00
    # Single foot is never replaced with a biped rig.
    leg=empty('ONE_leg',(0,0,.82),r['root']);r['leg_l']=leg;r['leg_r']=None
    cone('single_leg',(0,0,-.20),.12,.12,.67,'pink',leg)
    for z in (-.42,-.23,-.04):arc('leg_stripe',(0,0,z),.123,0,2*pi,'purple',leg,.015,'XY')
    ball('one_geta',(0,-.12,-.71),(.38,.42,.075),'brown',leg)
    ball('one_big_foot',(0,-.17,-.59),(.33,.34,.15),'pink',leg)
    for x in (-.20,0,.20):ball('toe',(x,-.37,-.59),(.095,.14,.08),'pink',leg)
    canopy=empty('umbrella_canopy',parent=h);r['extras']['canopy']=canopy
    # Rounded cone canopy, one continuous surface with radial ribs.
    cone('ONE_purple_umbrella',(0,0,.22),.91,.055,.57,'purple',canopy)
    cone('umbrella_finial',(0,0,.58),.05,.05,.16,'brown',canopy)
    for j in range(12):
        a=2*pi*j/12;tube('umbrella_rib',[(.08*cos(a),.08*sin(a),.50),(.86*cos(a),.86*sin(a),-.06)],.012,'pink',canopy)
        ball('cream_tassel',(.84*cos(a),.84*sin(a),-.13),(.025,.025,.10),'cream',canopy)
    e=eye('ONE_umbrella_eye',canopy,(0,-.51,.25),.26);r['eyes'].append(e)
    tongue=ball('tongue',(0,-.58,-.06),(.10,.06,.18),'pink',canopy);r['extras']['tongue']=tongue
    r['drink_target']=(0,-.60,1.88);return r

BUILDERS={'mizu':mizu,'pon':pon,'kon':kon,'sumi':sumi,'nemu':nemu,'akari':akari,'kasa':kasa}
