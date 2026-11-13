// Lantern light (R02). Every lantern in the world registers an anchor here. The render
// pipeline turns the anchors into
//   1. a baked "light pool" map: warm irradiance painted on the ground plane (one texture,
//      sampled by every lit material through world-light.mjs, so pools cost no draw calls), and
//   2. a small pool of real PointLights that follow the anchors nearest the player
//      (count limited per quality profile) so characters and props get directional warm light.
// Environment code (festival.mjs, festival-scenery.mjs) only calls registerLantern().
import * as THREE from 'three';
import {groundHeight} from '../../shared/world.mjs';

/** World area covered by the light-pool map (x0, z0, width, depth) in metres. */
export const POOL_BOUNDS={x:-32,z:-50,w:64,d:78};
/** Ground height range encoded in the map's alpha channel. */
export const POOL_HEIGHT={min:-1,max:6};
const SIZE={w:256,h:312};
/** Irradiance stored in the map is divided by this (8-bit headroom for overlapping pools). */
export const POOL_SCALE=4;const SCALE=POOL_SCALE;

/** Lantern kinds: default colour, pool radius (m), pool strength, real-light intensity (cd). */
export const LANTERN_KINDS={
  paper:{color:'#ffa95e',radius:4.2,pool:1.35,light:3},
  stall:{color:'#ffa65a',radius:6,pool:1.4,light:6},
  stone:{color:'#ffae66',radius:6.4,pool:1.6,light:0},
  string:{color:'#ffb36a',radius:6,pool:.8,light:0},
  portal:{color:'#a879ff',radius:5.5,pool:.9,light:6},
  potion:{color:'#5fd0ff',radius:1.6,pool:.55,light:0}
};

const anchors=[];let version=0;
/**
 * Register one lantern. Coordinates are world space (y = lantern height).
 * @param {{x:number,y:number,z:number,kind?:keyof LANTERN_KINDS,color?:string,radius?:number,pool?:number,light?:number}} a
 */
export function registerLantern(a){
  const k=LANTERN_KINDS[a.kind]||LANTERN_KINDS.paper;
  anchors.push({x:a.x,y:a.y,z:a.z,kind:a.kind||'paper',color:new THREE.Color(a.color||k.color),radius:a.radius??k.radius,pool:a.pool??k.pool,light:a.light??k.light});
  version++;
}
export function lanternAnchors(){return anchors;}
export function clearLanterns(){anchors.length=0;version++;}

/** Paint the light-pool map. Returns a DataTexture (rgb = irradiance / SCALE, a = ground height). */
function paint(texture){
  const {w,h}=SIZE,data=texture.image.data,acc=new Float32Array(w*h*3);
  const sx=POOL_BOUNDS.w/w,sz=POOL_BOUNDS.d/h;
  for(const a of anchors){
    const ground=groundHeight(a.x,a.z),lift=Math.max(0,a.y-ground);
    // A lantern hung high spreads a wider, weaker pool.
    const r=a.radius*(1+Math.max(0,lift-2.2)*.12),strength=a.pool/(1+Math.max(0,lift-2.2)*.35);
    const i0=Math.max(0,Math.floor((a.x-r-POOL_BOUNDS.x)/sx)),i1=Math.min(w-1,Math.ceil((a.x+r-POOL_BOUNDS.x)/sx));
    const j0=Math.max(0,Math.floor((a.z-r-POOL_BOUNDS.z)/sz)),j1=Math.min(h-1,Math.ceil((a.z+r-POOL_BOUNDS.z)/sz));
    for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){
      const x=POOL_BOUNDS.x+(i+.5)*sx,z=POOL_BOUNDS.z+(j+.5)*sz,d=Math.hypot(x-a.x,z-a.z)/r;if(d>=1)continue;
      // Soft core plus long tail, like light falling off a paper shade.
      const f=strength*(Math.pow(1-d,2.2)*.75+Math.exp(-d*d*9)*.55),at=(j*w+i)*3;
      acc[at]+=a.color.r*f;acc[at+1]+=a.color.g*f;acc[at+2]+=a.color.b*f;
    }
  }
  for(let j=0;j<h;j++)for(let i=0;i<w;i++){
    const at=(j*w+i),x=POOL_BOUNDS.x+(i+.5)*sx,z=POOL_BOUNDS.z+(j+.5)*sz;
    for(let c=0;c<3;c++)data[at*4+c]=Math.min(255,Math.round(255*acc[at*3+c]/SCALE));
    data[at*4+3]=Math.round(255*THREE.MathUtils.clamp((groundHeight(x,z)-POOL_HEIGHT.min)/(POOL_HEIGHT.max-POOL_HEIGHT.min),0,1));
  }
  texture.needsUpdate=true;
}

/**
 * Lantern light system: owns the pool map and the real PointLight pool.
 * @param {THREE.Scene} scene
 */
export function createLanternLight(scene){
  const data=new Uint8Array(SIZE.w*SIZE.h*4);
  const map=new THREE.DataTexture(data,SIZE.w,SIZE.h,THREE.RGBAFormat,THREE.UnsignedByteType);
  map.magFilter=map.minFilter=THREE.LinearFilter;map.wrapS=map.wrapT=THREE.ClampToEdgeWrapping;map.colorSpace=THREE.NoColorSpace;map.needsUpdate=true;
  const uniforms={
    lanternMap:{value:map},
    lanternBounds:{value:new THREE.Vector4(POOL_BOUNDS.x,POOL_BOUNDS.z,POOL_BOUNDS.w,POOL_BOUNDS.d)},
    lanternHeight:{value:new THREE.Vector2(POOL_HEIGHT.min,POOL_HEIGHT.max-POOL_HEIGHT.min)},
    lanternGain:{value:1}
  };
  let painted=-1,lights=[],flicker=0,pickTimer=0;
  const scratch=new THREE.Vector3();
  function setCount(n){
    for(const l of lights)scene.remove(l.light);
    lights=Array.from({length:n},()=>{const light=new THREE.PointLight('#ffa65a',0,9,2);light.castShadow=false;scene.add(light);return {light,anchor:null,target:0};});
  }
  return {
    uniforms,map,
    get lights(){return lights.map(l=>l.light);},
    /** Real light count follows the quality profile (q.lanternLights). */
    applyProfile(q){if((q.lanternLights??0)!==lights.length)setCount(q.lanternLights??0);},
    /** Per frame: repaint the map when anchors changed, retarget real lights near the focus. */
    update({dt=.016,elapsed=0,focus=null}={}){
      if(painted!==version){paint(map);painted=version;}
      flicker=elapsed;
      uniforms.lanternGain.value=1+Math.sin(elapsed*2.3)*.015+Math.sin(elapsed*5.9)*.01;
      if(!lights.length)return;
      pickTimer-=dt;
      if(pickTimer<=0){
        pickTimer=.25;const f=focus||scratch.set(0,0,16);
        const candidates=anchors.filter(a=>a.light>0).map(a=>({a,d:Math.hypot(a.x-f.x,a.z-f.z)})).sort((p,q)=>p.d-q.d).slice(0,lights.length);
        const used=new Set(candidates.map(c=>c.a));
        // Keep lights on anchors that are still wanted; hand the rest to new anchors.
        for(const l of lights)if(l.anchor&&!used.has(l.anchor))l.anchor=null;else if(l.anchor)used.delete(l.anchor);
        const fresh=[...used];for(const l of lights)if(!l.anchor&&fresh.length){l.anchor=fresh.shift();l.light.intensity=0;}
      }
      for(const l of lights){
        const a=l.anchor;if(!a){l.light.intensity=Math.max(0,l.light.intensity-dt*20);continue;}
        l.light.position.set(a.x,a.y-.15,a.z);l.light.color.copy(a.color);l.light.distance=a.radius*2.4;
        const wobble=1+Math.sin(flicker*7.1+a.x*3)*.03+Math.sin(flicker*13.3+a.z)*.02;
        l.light.intensity=THREE.MathUtils.lerp(l.light.intensity,a.light*wobble,Math.min(1,dt*6));
      }
    }
  };
}
