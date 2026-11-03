import bpy, sys, math, json, os, time
from pathlib import Path
from mathutils import Vector
from math import sin, cos, pi
HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(HERE))
import eve_rigs as R

PROJECT=HERE.parent
ART=PROJECT.parent/'art'
FPS=24
ACTIONS=[('idle',2.4,True),('walk_front',1.2,True),('walk_back',1.2,True),('walk_left',1.2,True),('walk_right',1.2,True),('drink',2.4,False),('charm_start',1.2,False),('charm_loop',2.0,True),('cover',2.0,False),('reveal',1.6,False),('panic',1.0,False),('arrive',1.8,False),('success',1.8,False)]
def smooth(a,b,x):
    q=max(0,min(1,(x-a)/(b-a)));return q*q*(3-2*q)
def envelope(x,a=.12,b=.35,c=.70,d=.98):return smooth(a,b,x)*(1-smooth(c,d,x))
def clear():
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    R.MATS.clear()
def setup(size=384,engine='BLENDER_WORKBENCH'):
    s=bpy.context.scene;s.render.engine='CYCLES' if engine=='CYCLES_GPU' else engine
    s.render.resolution_x=size;s.render.resolution_y=size;s.render.resolution_percentage=100
    s.render.fps=FPS;s.render.image_settings.file_format='PNG';s.render.image_settings.color_mode='RGBA';s.render.film_transparent=True
    s.view_settings.view_transform='Standard'
    if engine=='BLENDER_WORKBENCH':
        q=s.display.shading;q.light='STUDIO';q.studiolight_rotate_z=.3;q.color_type='MATERIAL';q.show_shadows=True;q.show_cavity=True;q.cavity_type='BOTH';q.curvature_ridge_factor=1.3;q.curvature_valley_factor=1.1;q.show_specular_highlight=True
        s.display.render_aa='8'
    else:
        s.cycles.samples=12;s.cycles.use_denoising=True;s.cycles.device='CPU'
        if engine=='CYCLES_GPU':
            prefs=bpy.context.preferences.addons['cycles'].preferences
            prefs.compute_device_type='METAL';prefs.get_devices()
            for dev in prefs.devices:dev.use=dev.type=='METAL'
            if any(dev.type=='METAL' for dev in prefs.devices):s.cycles.device='GPU'
        s.render.use_persistent_data=True
        s.world.color=(.65,.65,.65)
        for name,loc,power,size2 in [('key',(-3,-4,6),450,5),('fill',(4,-1,4),300,4),('rim',(0,4,5),350,3)]:
            bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.name=name;o.data.energy=power;o.data.shape='DISK';o.data.size=size2;o.rotation_euler=(Vector((0,0,1.5))-o.location).to_track_quat('-Z','Y').to_euler()
    bpy.ops.object.camera_add(location=(4,-6,5.66));cam=bpy.context.object;cam.name='FIXED_GAME_CAMERA';cam.rotation_euler=(Vector((0,0,1.50))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=3.8;s.camera=cam
    return s
def fx(r):
    colors={'mizu':'blue','pon':'yellow','kon':'purple','sumi':'blue','nemu':'cream','akari':'yellow','kasa':'leaf'}
    root=R.empty('FX_SEPARATE_GROUP',parent=r['root']);r['fx']=root;r['fx_nodes']=[]
    for i in range(3):
        ring=R.empty('ring_'+str(i),(0,-.04,.6+i*.22),root)
        R.arc('ability_ring',(0,0,0),.75,0,2*pi,colors[r['id']],ring,.018,'XY');r['fx_nodes'].append(ring)
    for i in range(7):
        a=2*pi*i/7;p=R.ball('magic_mote',(cos(a)*.68,sin(a)*.57,1.2+(i%3)*.26),(.035,.035,.055),colors[r['id']],root,12);r['fx_nodes'].append(p)
    root.scale=(0,0,0)
def cache(r):
    # Everything animated is an existing rigid pivot, never new anatomy.
    targets=[r[k] for k in ('root','torso','head','arm_l','arm_r','leg_l','leg_r','potion') if r.get(k)]
    for v in r['extras'].values():targets.extend(v if isinstance(v,list) else [v])
    targets.extend([e['group'] for e in r['eyes']]+[e['pupil'] for e in r['eyes']]+[e['lid'] for e in r['eyes']])
    targets.extend([r['fx']]+r['fx_nodes'])
    r['targets']=list(dict.fromkeys(targets))
    r['defaults']={o:(o.location.copy(),o.rotation_euler.copy(),o.scale.copy(),o.hide_render) for o in r['targets']}
def reset(r):
    for o,(l,q,s,h) in r['defaults'].items():o.location=l;o.rotation_euler=q;o.scale=s;o.hide_render=h
def pose(r,action,u):
    reset(r);root=r['root'];t=r['torso'];h=r['head'];ex=r['extras'];w=2*pi*u
    ease=sin(pi*u)**2
    ident=r['id']
    # Resting personality appears throughout, but one-shots return to the identical rest pose.
    activity=1 if action in ('idle','charm_loop') or action.startswith('walk') else ease
    t.location.z=.018*sin(w)*activity
    h.rotation_euler.z=.022*sin(w)*activity
    if ident=='sumi':
        ex['calm_head'].rotation_euler.z=.035*sin(w)*activity;ex['panic_head'].rotation_euler.z=-.075*sin(w+.5)*activity
    elif ident=='nemu':ex['tail'].rotation_euler.y=.045*sin(w)*activity
    elif ident=='akari':
        for i,o in enumerate(ex['lanterns']):o.rotation_euler.y=.045*sin(w+i*.5)*activity
    elif ident=='kon':
        ex['neck'].rotation_euler.y=.022*sin(w)*activity;h.location.x+=.04*sin(w)*activity
    elif ident=='kasa':h.rotation_euler.y=.025*sin(w)*activity
    if action.startswith('walk'):
        root.rotation_euler.z={'walk_front':.588,'walk_back':.588+pi,'walk_left':.588-pi/2,'walk_right':.588+pi/2}[action]
        if ident=='kasa':
            root.location.z=.18*(1-cos(w))/2;r['leg_l'].rotation_euler.x=.14*sin(w)
        else:
            for suffix,ph in [('l',0),('r',pi)]:
                leg=r['leg_'+suffix];leg.rotation_euler.x=.30*sin(w+ph)
                leg.location.z+=.065*max(0,sin(w+ph))
                r['arm_'+suffix].rotation_euler.x=-.25*sin(w+ph)
            t.location.z=.035*(1-cos(w*2))/2
        if 'tail' in ex:ex['tail'].rotation_euler.z=.12*sin(w)
        if ident=='kon':
            for key in ('tail_-1','tail_1'):ex[key].rotation_euler.z=.10*sin(w)
    elif action=='drink':
        p=r['potion'];a=envelope(u,.05,.30,.67,.96)
        rest=r['defaults'][p][0];target=Vector(r['drink_target']);p.location=rest.lerp(target,a);p.rotation_euler.x=-1.20*a
        r['arm_l'].rotation_euler.x=-.9*a;r['arm_l'].rotation_euler.y=-.45*a;h.rotation_euler.x=-.06*a
        if ident=='pon':ex['belly_mouth'].scale.z*=1+.10*sin(w*4)*a
    elif action in ('charm_start','charm_loop'):
        a=smooth(.05,.75,u) if action=='charm_start' else 1
        r['arm_l'].rotation_euler.x=-.45*a+.10*sin(w)*a;r['arm_r'].rotation_euler.x=-.45*a-.10*sin(w)*a
        h.rotation_euler.x=.06*a
        r['fx'].scale=(a,a,a)
        for i,o in enumerate(r['fx_nodes']):
            if i<3:
                q=1+.06*sin(w+i*2*pi/3);o.scale=(q,q,1);o.location.z+=.05*sin(w+i*2*pi/3)
            else:o.location.z+=.06*sin(w+i)
        if ident=='kon':ex['neck'].scale.z=1+.06*sin(w);h.location.z+=.10*sin(w)
        if ident=='nemu':ex['mask'].rotation_euler.y=.14*sin(w)
        if ident=='pon':ex['belly_mouth'].scale.z*=1+.16*sin(w)
    elif action=='cover':
        a=envelope(u,.05,.25,.70,.98);r['arm_l'].rotation_euler.y=-1.0*a;r['arm_r'].rotation_euler.y=1.0*a
        if ident=='mizu':root.rotation_euler.z=.85*a;h.rotation_euler.z=-.15*a
        elif ident=='pon':ex['tail'].rotation_euler.z=-.85*a;ex['tail'].rotation_euler.x=.3*a
        elif ident=='kon':ex['neck'].rotation_euler.y=.28*a;h.location.x+=.30*a
        elif ident=='sumi':r['arm_l'].rotation_euler.y=-1.35*a;r['arm_r'].rotation_euler.y=1.35*a
        elif ident=='nemu':ex['tail'].rotation_euler.y=.40*a
        elif ident=='akari':
            for i,o in enumerate(ex['lanterns']):o.location.x+=(i-1)*.18*a;o.rotation_euler.y=(i-1)*.15*a
        elif ident=='kasa':h.rotation_euler.x=.35*a
    elif action=='reveal':
        a=envelope(u,.02,.27,.75,.99)
        h.rotation_euler.z=.13*sin(w*3)*a
        if ident=='mizu':ex['dish'].rotation_euler.y=.15*sin(w*3)*a
        elif ident=='pon':ex['belly_mouth'].scale.z*=1+.45*a;ex['tail'].rotation_euler.z=.25*sin(w*2)*a
        elif ident=='kon':ex['neck'].scale.z=1+.22*a;h.location.z+=.45*a
        elif ident=='sumi':ex['panic_head'].rotation_euler.z=.3*a;ex['calm_head'].rotation_euler.z=-.18*a
        elif ident=='nemu':ex['tail'].rotation_euler.z=.28*sin(w*2)*a
        elif ident=='akari':
            for i,o in enumerate(ex['lanterns']):o.location.z+=(i-1)*.15*a;o.rotation_euler.y=.16*sin(w*2+i)*a
        elif ident=='kasa':ex['canopy'].rotation_euler.x=pi*a
        r['fx'].scale=(.4*a,.4*a,.4*a)
    elif action=='panic':
        a=envelope(u,.01,.15,.60,.98);t.location.z=.05*a;h.rotation_euler.z=.12*sin(w*4)*a
        r['arm_l'].rotation_euler.x=-.75*a;r['arm_r'].rotation_euler.x=-.75*a
        if ident=='kasa':root.location.z=.13*a;h.rotation_euler.y=.18*sin(w*2)*a
        if ident=='nemu':ex['mask'].rotation_euler.z=.22*sin(w*2)*a
        if ident=='sumi':ex['panic_head'].rotation_euler.x=-.20*a
    elif action=='arrive':
        # Portal is deliberately absent. Vertical landing onto the fixed foot-origin only.
        a=1-smooth(0,.35,u);root.location.z=.30*a
        t.rotation_euler.x=-.10*(1-smooth(.20,.65,u))*sin(pi*min(1,u/.65))
        r['arm_l'].rotation_euler.x=-.35*sin(pi*u);r['arm_r'].rotation_euler.x=-.35*sin(pi*u)
    elif action=='success':
        a=envelope(u,.02,.20,.76,.99);r['arm_l'].rotation_euler.y=-1.7*a;r['arm_r'].rotation_euler.y=1.7*a
        t.location.z=.08*sin(pi*u)*a;h.rotation_euler.z=.10*sin(w*2)*a
        if ident=='kasa':root.location.z=.12*(1-cos(w*2))/2*a
        if ident=='pon':ex['belly_mouth'].scale.z*=1+.2*a
    # Pupil acting belongs to the original face location; headless Nemu never gains a face.
    for i,e in enumerate(r['eyes']):
        e['pupil'].location.x+=e['r']*.12*sin(w+i*.5)*activity
        if action=='panic':e['pupil'].scale*=1-.25*envelope(u,.01,.15,.65,.98)
        elif action=='success':e['pupil'].scale.z*=1-.70*envelope(u,.02,.20,.76,.99)
    return r
def keyframe(r,f):
    for o in r['targets']:
        for attr in ('location','rotation_euler','scale'):o.keyframe_insert(data_path=attr,frame=f)
def render_one(id,mode,size,engine='BLENDER_WORKBENCH',force=False):
    clear();s=setup(size,engine);r=R.BUILDERS[id]();fx(r);cache(r)
    (ART/id).mkdir(parents=True,exist_ok=True)
    pose(r,'idle',0);s.render.filepath=str(ART/id/(id+'_base_3d_v01.png'));bpy.ops.render.render(write_still=True)
    if mode=='test':return
    if mode=='bases':
        bpy.ops.wm.save_as_mainfile(filepath=str(PROJECT/'models'/(id+'_motion_study_v01.blend')));return
    records=[];frame=1
    for name,duration,loop in ACTIONS:
        n=round(duration*FPS);start=frame
        for i in range(n):pose(r,name,i/(n-1));keyframe(r,frame);frame+=1
        end=frame-1;s.timeline_markers.new(name+'_START',frame=start);s.timeline_markers.new(name+'_END',frame=end)
        records.append({'character':id,'action':name,'duration':n/FPS,'loop':loop,'start':start,'end':end,'fps':FPS,'size':[size,size],'alpha':True,'file':id+'_'+name+'_v01.webm','type':'3D motion study / procedural rigid-part rig'})
    # Linear baked animation makes each sampled pose reproducible.
    for o in r['targets']:
        if o.animation_data and o.animation_data.action:
            try:
                for curve in o.animation_data.action.fcurves:
                    for k in curve.keyframe_points:k.interpolation='LINEAR'
            except AttributeError:pass
    s.frame_start=1;s.frame_end=frame-1;s.frame_set(1)
    bpy.ops.wm.save_as_mainfile(filepath=str(PROJECT/'models'/(id+'_motion_study_v01.blend')))
    for rec in records:
        out=PROJECT/'animations'/id/(id+'_'+rec['action']+'_v01');out.mkdir(parents=True,exist_ok=True)
        if not force and (out/'metadata.json').exists() and len(list(out.glob('frame_*.png')))==rec['end']-rec['start']+1:
            print('EVE_CLIP_REUSED '+id+' '+rec['action'],flush=True);continue
        s.frame_start=rec['start'];s.frame_end=rec['end'];s.render.filepath=str(out/'frame_')
        bpy.ops.render.render(animation=True)
        (out/'metadata.json').write_text(json.dumps(rec,ensure_ascii=False,indent=2))
        print('EVE_CLIP_COMPLETE '+id+' '+rec['action'],flush=True)
    (PROJECT/'animations'/id/'clips.json').write_text(json.dumps(records,ensure_ascii=False,indent=2))
if __name__=='__main__':
    args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
    mode=args[0] if args else 'bases';ids=args[1].split(',') if len(args)>1 else list(R.BUILDERS);size=int(args[2]) if len(args)>2 else 384
    engine=args[3] if len(args)>3 else 'BLENDER_WORKBENCH'
    force=len(args)>4 and args[4]=='force'
    for id in ids:render_one(id,mode,size,engine,force)
