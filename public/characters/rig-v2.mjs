// Character runtime v2: plays ASSET_CONTRACT v1 GLBs (one skinned mesh, humanoid bones,
// named clips, sockets) with an AnimationMixer.
//
// Characters opt in through public/characters/defs/<id>.json listed in defs/index.json.
// Everyone else keeps the legacy rigid rig. `?rig=legacy` forces the legacy rig for all.
// Owned by R01, then by R03 (character runtime).
import * as THREE from 'three';
import {disguiseState} from '../../shared/disguise.mjs';

export const REQUIRED_BONES=['Hips','Spine','Neck','Head','LeftArm','LeftForeArm','LeftHand','RightArm','RightForeArm','RightHand','LeftUpLeg','LeftLeg','LeftFoot','RightUpLeg','RightLeg','RightFoot'];
export const SOCKETS=['socket_hand_R','socket_hip_L','socket_head_top','socket_reveal'];
export const PLAYER_CLIPS=['idle','walk','run','jump_start','jump_air','land','drink_potion','charm_cast','charm_hold','cover_ward','reveal_panic','hit','sealed','victory'];
export const LOOPING=new Set(['idle','walk','run','jump_air','charm_hold','sealed','victory','charmed_walk','wait','cheer','talk','keeper_work']);
export const UPPER_BODY_CLIPS=new Set(['drink_potion','charm_cast','charm_hold','cover_ward']);
// Tracks on these bones are stripped from upper-body clips so they layer over walking legs.
export const LOWER_BODY_BONE=/^(Hips|LeftUpLeg|LeftLeg|LeftFoot|LeftToeBase|RightUpLeg|RightLeg|RightFoot|RightToeBase)$/;
// When a clip is missing, try these in order before giving up (upper-body clips simply do not play).
export const CLIP_FALLBACK={run:['walk','idle'],walk:['idle'],jump_start:['jump_air','idle'],jump_air:['idle'],land:['idle'],hit:['idle'],sealed:['idle'],victory:['idle'],reveal_panic:['idle'],charm_hold:['charm_cast']};
// Higher priority base clips may interrupt a running one-shot; lower ones wait for it to finish.
export const PRIORITY={idle:0,walk:1,run:1,land:3,jump_start:4,jump_air:4,reveal_panic:5,hit:6,sealed:7,victory:8};
export const DEFAULTS={
  height:{yokai:2.85,human:2.55},
  // walkSpeed/runSpeed: world units per second at which the clip's feet do not slide (timeScale 1).
  gait:{walkSpeed:3.6,runSpeed:4.86,runThreshold:4.2,idleBelow:.15,minScale:.6,maxScale:1.8},
  crossfade:.2,
  revealPanic:1.1
};

/** 'legacy' when the URL forces the old rig, otherwise 'auto'. */
export function rigMode(search=globalThis.location?.search||''){return new URLSearchParams(search).get('rig')==='legacy'?'legacy':'auto';}

/** Returns a list of problems; an empty list means the def can be used. */
export function validateDef(def){
  const errors=[];
  if(!def||typeof def!=='object')return ['def must be an object'];
  if(!/^[a-z][a-z0-9_]*$/.test(def.id||''))errors.push('id must be lower snake case');
  if(def.version!==2)errors.push('version must be 2');
  const forms=def.forms||{};
  if(!forms.yokai&&!forms.human)errors.push('forms needs a yokai and/or human GLB path');
  for(const [form,url] of Object.entries(forms))if(!['yokai','human'].includes(form)||typeof url!=='string'||!url.endsWith('.glb'))errors.push(`forms.${form} must be a .glb path`);
  if(def.reveal!==undefined&&(typeof def.reveal!=='string'||!def.reveal.endsWith('.glb')))errors.push('reveal must be a .glb path');
  for(const [key,value] of Object.entries(def.gait||{}))if(!(key in DEFAULTS.gait)||typeof value!=='number'||!(value>=0))errors.push(`gait.${key} is not a known positive number`);
  for(const [key,value] of Object.entries(def.clips||{}))if(typeof value!=='string')errors.push(`clips.${key} must name a clip`);
  return errors;
}

/** Fill defaults. `clips` maps contract names to the names inside the GLB (identity by default). */
export function normalizeDef(def){
  return {...def,height:{...DEFAULTS.height,...def.height},gait:{...DEFAULTS.gait,...def.gait},clips:{...def.clips},crossfade:def.crossfade??DEFAULTS.crossfade};
}

/** Loads defs/index.json and every listed def. Invalid or missing defs are skipped (that character stays legacy). */
export async function loadDefs({fetch=globalThis.fetch,base='/characters/defs/',mode=rigMode(),log=console}={}){
  const defs=new Map();
  if(mode==='legacy'||!fetch)return defs;
  let index;
  try{const r=await fetch(`${base}index.json`);if(!r.ok)return defs;index=await r.json();}catch{return defs;}
  await Promise.all((index.characters||[]).map(async id=>{
    try{
      const r=await fetch(`${base}${id}.json`);if(!r.ok)throw Error(`HTTP ${r.status}`);
      const def=await r.json(),errors=validateDef(def);
      if(def.id!==id)errors.push(`id ${def.id} does not match ${id}.json`);
      if(errors.length){log.warn?.(`rig-v2: ${id}.json ignored: ${errors.join('; ')}`);return;}
      defs.set(id,normalizeDef(def));
    }catch(error){log.warn?.(`rig-v2: ${id}.json could not load (${error.message}); using legacy rig`);}
  }));
  return defs;
}

/** GLTFLoader with Meshopt and KTX2 decoding. Decoders are imported lazily so non-v2 sessions pay nothing. */
export function createV2Loader(renderer,{transcoderPath='/addons/libs/basis/'}={}){
  const cache=new Map();let ready;
  async function loader(){
    ready||=Promise.all([
      import('three/addons/loaders/GLTFLoader.js'),import('three/addons/loaders/KTX2Loader.js'),import('three/addons/libs/meshopt_decoder.module.js')
    ]).then(([{GLTFLoader},{KTX2Loader},{MeshoptDecoder}])=>{
      const gltf=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
      if(renderer){const ktx2=new KTX2Loader().setTranscoderPath(transcoderPath).detectSupport(renderer);gltf.setKTX2Loader(ktx2);}
      return gltf;
    });
    return ready;
  }
  return {
    /** Resolves to the shared parsed glTF; use instantiate() for a per-actor copy. */
    load(url){if(!cache.has(url))cache.set(url,loader().then(l=>l.loadAsync(url)).catch(e=>{cache.delete(url);throw e;}));return cache.get(url);}
  };
}

/** Per-actor copy of a glTF (skeletons rebound, clips shared). */
export async function instantiate(gltf){
  const {clone}=await import('three/addons/utils/SkeletonUtils.js');
  return {scene:clone(gltf.scene),animations:gltf.animations};
}

export function findSocket(root,name){return root.getObjectByName(name)||null;}

/** Copy of a clip without Hips/leg tracks, so it can play on top of walking. */
export function upperBodyClip(clip){
  const tracks=clip.tracks.filter(t=>!LOWER_BODY_BONE.test(THREE.PropertyBinding.parseTrackName(t.name).nodeName));
  return new THREE.AnimationClip(`${clip.name}__upper`,clip.duration,tracks);
}

/** Resolve a contract clip name to an available one using CLIP_FALLBACK. */
export function resolveClip(name,available){
  if(!name)return null;
  if(available.has(name))return name;
  for(const alt of CLIP_FALLBACK[name]||[])if(available.has(alt))return alt;
  return null;
}

/**
 * Desired full-body clip for a player snapshot. ctx = {speed, tick, phase, gait, airborne, justLanded, revealAge, form}.
 * Pure: no mixer state, so it is easy to test against server snapshots.
 */
export function selectBaseClip(p,ctx){
  const g=ctx.gait||DEFAULTS.gait;
  if(ctx.phase==='won')return 'victory';
  if((p.health??1)<=0||p.action==='down')return 'sealed';
  if((p.hurtUntil||0)>(ctx.tick||0))return 'hit';
  if((p.height||0)>0)return (p.vy||0)>0?'jump_start':'jump_air';
  if(ctx.justLanded)return 'land';
  if(ctx.form==='human'&&ctx.revealAge!=null&&ctx.revealAge<DEFAULTS.revealPanic)return 'reveal_panic';
  const speed=ctx.speed||0;
  return speed>g.runThreshold?'run':speed>g.idleBelow?'walk':'idle';
}

/** Upper-body layer clip for the current action, or null. */
export function selectUpperClip(p){
  return p.action==='drink'?'drink_potion':p.action==='charm'?'charm_cast':p.action==='cover'?'cover_ward':null;
}

/** Playback speed that keeps feet planted for the current ground speed. */
export function locomotionScale(clip,speed,gait=DEFAULTS.gait){
  const ref=clip==='run'?gait.runSpeed:clip==='walk'?gait.walkSpeed:0;
  if(!ref)return 1;
  return THREE.MathUtils.clamp(speed/ref,gait.minScale,gait.maxScale);
}

/** Mixer wrapper: crossfaded base layer + optional upper-body layer. */
export function createClipPlayer(root,animations,{clipNames={},fade=DEFAULTS.crossfade}={}){
  const mixer=new THREE.AnimationMixer(root),byName=new Map(animations.map(c=>[c.name,c]));
  const clips=new Map();
  for(const name of new Set([...PLAYER_CLIPS,...LOOPING])){const clip=byName.get(clipNames[name]||name);if(clip)clips.set(name,clip);}
  const available=new Set(clips.keys()),actions=new Map(),upperActions=new Map();
  function action(name,upper=false){
    const map=upper?upperActions:actions;
    if(!map.has(name)){
      const a=mixer.clipAction(upper?upperBodyClip(clips.get(name)):clips.get(name));
      if(!LOOPING.has(name)){a.setLoop(THREE.LoopOnce,1);a.clampWhenFinished=true;}
      map.set(name,a);
    }
    return map.get(name);
  }
  const state={base:null,upper:null};
  const finished=name=>{const a=name&&actions.get(name);return !a||!LOOPING.has(name)&&(!a.isRunning()||a.time>=a.getClip().duration-1e-3);};
  return {
    mixer,available,state,
    has:name=>available.has(name),
    finished,
    /** Crossfade the base layer. Returns the clip actually playing. */
    play(name,{restart=false}={}){
      const resolved=resolveClip(name,available);if(!resolved)return state.base;
      if(resolved===state.base&&!restart)return resolved;
      const next=action(resolved);next.reset();next.enabled=true;next.setEffectiveWeight(1);next.play();
      const prev=state.base&&actions.get(state.base);
      if(prev&&prev!==next)prev.crossFadeTo(next,fade,false);else if(!prev)next.fadeIn(Math.min(fade,.05));
      state.base=resolved;return resolved;
    },
    /** Start/stop the upper-body layer. */
    upper(name){
      const resolved=name&&available.has(name)?name:null;
      if(resolved===state.upper)return resolved;
      if(state.upper)upperActions.get(state.upper).fadeOut(fade);
      if(resolved){const a=action(resolved,true);a.reset();a.enabled=true;a.setEffectiveWeight(1);a.fadeIn(fade).play();}
      state.upper=resolved;return resolved;
    },
    timeScale(scale){const a=state.base&&actions.get(state.base);if(a)a.timeScale=scale;},
    update(dt){mixer.update(dt);}
  };
}

/** Meshes carrying the contract face morphs (face_blink, optional face_shock). */
export function faceMorphs(object){
  const out=[];
  object.traverse(n=>{const d=n.morphTargetDictionary;if(n.isMesh&&d&&('face_blink' in d||'face_shock' in d))out.push({mesh:n,blink:d.face_blink,shock:d.face_shock});});
  return out;
}

/**
 * Face weights for this frame. Pure apart from the state object it advances.
 * Blinks every 2.2-5 s (0.16 s long, double-blink sometimes); eyes widen in reveal_panic/hit, droop when sealed.
 */
export function faceWeights(state,dt,clip){
  state.t=(state.t||0)+dt;
  if(state.next==null)state.next=state.t+1.5+((state.seed||0)%1)*2;
  if(state.t>=state.next){state.blinkAt=state.t;const r=Math.abs(Math.sin(state.t*12.9898+(state.seed||0))*43758.5453)%1;state.next=state.t+2.2+r*2.8;if(r<.18)state.double=state.t+.28;}
  const pulse=at=>{if(at==null)return 0;const x=(state.t-at)/.16;return x<0||x>1?0:Math.sin(Math.PI*x);};
  const shockTarget=clip==='reveal_panic'||clip==='hit'?1:0;
  state.shock=THREE.MathUtils.lerp(state.shock||0,shockTarget,1-Math.exp(-dt*(shockTarget?30:8)));
  const blink=clip==='sealed'?.7:Math.max(pulse(state.blinkAt),pulse(state.double))*(1-state.shock);
  return {blink,shock:state.shock};
}

function applyFace(morphs,w){for(const m of morphs){const inf=m.mesh.morphTargetInfluences;if(m.blink!=null)inf[m.blink]=w.blink;if(m.shock!=null)inf[m.shock]=w.shock;}}

function normalizeForm(object,height){
  object.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(object),size=box.getSize(new THREE.Vector3());
  const scale=size.y>0?height/size.y:1,holder=new THREE.Group();
  object.scale.multiplyScalar(scale);object.position.y-=box.min.y*scale;holder.add(object);
  object.traverse(n=>{if(n.isMesh){n.castShadow=true;n.receiveShadow=true;}});
  return holder;
}

/**
 * Build a v2 rig from already-instantiated glTFs: assets = {yokai?:{scene,animations}, human?:{...}, reveal?:{scene}}.
 * The returned object mirrors the legacy rig fields used by probes (root, legs, arms, waist, speed, gaitPhase).
 */
export function createV2Rig(def,assets){
  def=normalizeDef(def);
  const root=new THREE.Group();root.name=`v2-player-${def.id}`;
  root.userData.volumetric=true;root.userData.motionVersion='rig-v2';root.userData.modelStatus='v2';
  const forms={};
  for(const form of ['yokai','human']){
    const asset=assets[form];if(!asset)continue;
    const holder=normalizeForm(asset.scene,def.height[form]);holder.name=`v2-${def.id}-${form}`;root.add(holder);
    forms[form]={holder,model:asset.scene,player:createClipPlayer(asset.scene,asset.animations||[],{clipNames:def.clips,fade:def.crossfade}),asset:def.forms[form],face:faceMorphs(asset.scene),faceState:{seed:form==='human'?.37:.71}};
  }
  const formNames=Object.keys(forms);
  if(!formNames.length)throw Error(`v2 rig ${def.id} has no forms`);
  let reveal=null;
  if(assets.reveal&&forms.human){
    const socket=findSocket(forms.human.model,'socket_reveal');
    if(socket){reveal=assets.reveal.scene;reveal.name=`v2-${def.id}-reveal`;socket.add(reveal);reveal.visible=false;}
  }
  const waist=new THREE.Object3D();
  const rig={
    kind:'v2',def,root,forms,character:def.id,appearance:formNames.includes('human')?'human':formNames[0],
    legs:[],arms:[],waist,speed:0,gaitPhase:0,revealBlend:0,clip:{base:null,upper:null},
    lastPosition:null,wasAirborne:false,landUntil:0,revealStartedAt:null,time:0,
    get active(){return forms[rig.appearance]||forms[formNames[0]];},
    socket(name,form=rig.appearance){return forms[form]?findSocket(forms[form].model,name):null;},
    /** Parent an object to a socket (default: the visible form). Returns false if the socket is missing. */
    attach(name,object,form){const s=rig.socket(name,form);if(!s)return false;s.add(object);return true;},
    update(p,dt,time,tick,position,options={}){updateV2Rig(rig,p,dt,time,tick,position,options);},
    dispose(){for(const f of Object.values(forms))f.player.mixer.stopAllAction();}
  };
  for(const form of formNames)forms[form].holder.visible=form===rig.appearance;
  return rig;
}

function updateV2Rig(r,p,dt,time,tick,position,options){
  const root=r.root;r.time+=dt;
  const delta=Math.atan2(Math.sin((p.facing||0)-root.rotation.y),Math.cos((p.facing||0)-root.rotation.y));root.rotation.y+=delta*(1-Math.exp(-dt*12));
  root.position.y=THREE.MathUtils.lerp(root.position.y,p.height||0,1-Math.exp(-dt*23));
  // form: same rules as the legacy disguise rig
  const progress=options.progress??1,transform=options.form==='transform';
  let form=options.form==='yokai'||transform&&progress<.51?'yokai':'human';
  if(!r.forms[form])form=r.forms.human?'human':'yokai';
  if(form!==r.appearance){r.appearance=form;for(const [name,f] of Object.entries(r.forms))f.holder.visible=name===form;}
  const morph=transform?Math.sin(Math.PI*THREE.MathUtils.clamp((progress-.25)/.5,0,1)):0;
  if(r.forms.yokai)r.forms.yokai.holder.scale.setScalar(1-morph*.18);
  if(r.forms.human)r.forms.human.holder.scale.setScalar(1-morph*.13);
  // ground speed from the rendered position, smoothed
  if(position&&dt>0){
    if(r.lastPosition){const raw=Math.hypot(position.x-r.lastPosition.x,position.z-r.lastPosition.z)/dt;r.speed=THREE.MathUtils.lerp(r.speed,raw,1-Math.exp(-dt*10));}
    r.lastPosition={x:position.x,z:position.z};
  }
  const airborne=(p.height||0)>0;
  if(r.wasAirborne&&!airborne)r.landUntil=r.time+.3;
  r.wasAirborne=airborne;
  const revealed=form==='human'&&(options.revealed??disguiseState(p,tick).revealed);
  if(revealed&&r.revealStartedAt==null)r.revealStartedAt=r.time;else if(!revealed)r.revealStartedAt=null;
  const f=r.forms[form],player=f.player,gait=r.def.gait;
  let base=selectBaseClip(p,{speed:r.speed,tick,phase:options.phase,gait,justLanded:r.time<r.landUntil,revealAge:r.revealStartedAt==null?null:r.time-r.revealStartedAt,form});
  if(base==='jump_start'&&player.state.base==='jump_start'&&player.finished('jump_start'))base='jump_air';
  const current=player.state.base;
  const holdOneShot=current&&!LOOPING.has(current)&&!player.finished(current)&&(PRIORITY[base]??0)<=(PRIORITY[current]??0)&&base!==current;
  if(!holdOneShot)player.play(base,{restart:base==='jump_start'&&!r.clip.wasJumping});
  r.clip.wasJumping=airborne;
  player.timeScale(locomotionScale(player.state.base,r.speed,gait));
  player.upper(selectUpperClip(p));
  player.update(dt);
  if(!player.has('sealed'))root.rotation.z=THREE.MathUtils.lerp(root.rotation.z,p.health===0?.65:0,1-Math.exp(-dt*8));
  r.gaitPhase=player.state.base==='walk'||player.state.base==='run'?(r.gaitPhase+dt*r.speed)%(Math.PI*2):r.gaitPhase;
  if(f.face.length){const w=faceWeights(f.faceState,dt,player.state.base);applyFace(f.face,w);r.face=w;}
  r.clip.base=player.state.base;r.clip.upper=player.state.upper;
  if(r.forms.human){
    r.revealBlend=THREE.MathUtils.lerp(r.revealBlend,revealed?1:0,1-Math.exp(-dt*22));
    const part=r.forms.human.model.getObjectByName(`v2-${r.def.id}-reveal`);
    if(part){part.visible=r.revealBlend>.015;part.scale.setScalar(Math.max(.001,r.revealBlend));}
  }
  root.userData.appearance=form;root.userData.revealed=revealed;root.userData.modelAsset=f.asset;root.userData.clip=r.clip.base;
}

/** Load and build a v2 rig for a def. Rejects if any form fails to load. */
export async function loadV2Rig(def,loader){
  def=normalizeDef(def);
  const jobs=Object.entries(def.forms).map(async([form,url])=>[form,await instantiate(await loader.load(url))]);
  if(def.reveal)jobs.push(loader.load(def.reveal).then(instantiate).then(a=>['reveal',a]));
  return createV2Rig(def,Object.fromEntries(await Promise.all(jobs)));
}

/**
 * Chooses the rig per character. create() always returns the legacy rig immediately (so the
 * game never waits on a download); upgrade() resolves to a v2 rig when the character has a def,
 * or to null (missing def, ?rig=legacy, or any load error -> keep the legacy rig).
 */
export function createRigFactory({defs=new Map(),loader=null,mode=rigMode(),createLegacy,animateLegacy,log=console}){
  const usesV2=character=>mode!=='legacy'&&!!loader&&defs.has(character);
  return {
    mode,defs,usesV2,
    create(character){return createLegacy(character);},
    upgrade(character){
      if(!usesV2(character))return Promise.resolve(null);
      return loadV2Rig(defs.get(character),loader).catch(error=>{log.warn?.(`rig-v2: ${character} fell back to the legacy rig (${error?.message||error})`);return null;});
    },
    animate(rig,p,dt,time,tick,position,options){if(rig.kind==='v2')rig.update(p,dt,time,tick,position,options);else animateLegacy(rig,p,dt,time,tick,position,options);}
  };
}
