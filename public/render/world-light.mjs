// World light patch (R02). Adds three things to every lit material in the festival scene
// without touching the code that created it:
//   - lantern light pools from the baked map in lanterns.mjs (warm irradiance by world XZ,
//     fading with height above the ground the map recorded),
//   - valley mist: extra blue fog that thickens below the summit and with distance,
//   - character rim light: a cool moon-side fresnel rim on characters only, so they separate
//     from the dark background (ART_BIBLE 2 and 4).
// Materials are found by scanning the scene a few times per second; new materials (v2 model
// swaps, fx) are picked up on the next scan. Each material compiles once with the patch.
import * as THREE from 'three';
import {POOL_SCALE} from './lanterns.mjs';

export const WORLD_LIGHT={
  pool:1.0,
  /** emissive surfaces (lantern paper, potions, signs) glow above the bloom threshold at night */
  emissiveBoost:1.7,
  mist:{color:'#26375f',base:1.0,falloff:.32,density:.010,max:.55},
  rim:{color:'#a9bcff',strength:.55,power:2.6,warm:'#ffb36b',warmStrength:.18}
};

const LIT=new Set(['MeshStandardMaterial','MeshPhysicalMaterial','MeshLambertMaterial','MeshPhongMaterial','MeshToonMaterial']);
const CHARACTER_MARK=o=>o.userData&&(o.userData.motionVersion||o.userData.modelAsset||o.userData.volumetric||o.userData.character);

const VERT_DECL='varying vec3 vWorldLightPos;\n';
const VERT_BODY=`
  { vec4 wl=vec4(transformed,1.0);
  #ifdef USE_BATCHING
    wl=batchingMatrix*wl;
  #endif
  #ifdef USE_INSTANCING
    wl=instanceMatrix*wl;
  #endif
    vWorldLightPos=(modelMatrix*wl).xyz; }
`;
const FRAG_DECL=`varying vec3 vWorldLightPos;
uniform sampler2D lanternMap;uniform vec4 lanternBounds;uniform vec2 lanternHeight;uniform float lanternGain;uniform float lanternPool;
uniform vec3 mistColor;uniform vec4 mistParams;
uniform float emissiveBoost;uniform vec3 rimColor;uniform vec3 rimWarm;uniform vec4 rimParams;uniform vec3 flashColor;
`;
const FRAG_LIGHT=`
  {
    vec3 wN=inverseTransformDirection(normal,viewMatrix);
    vec2 luv=(vWorldLightPos.xz-lanternBounds.xy)/lanternBounds.zw;
    vec4 lm=texture2D(lanternMap,luv);
    float ground=lanternHeight.x+lm.a*lanternHeight.y;
    float above=vWorldLightPos.y-ground;
    float hfade=smoothstep(-.6,.05,above)*(1.0-smoothstep(2.2,5.5,above));
    float facing=.62+.38*max(wN.y,0.0);
    float inside=step(0.0,luv.x)*step(luv.x,1.0)*step(0.0,luv.y)*step(luv.y,1.0);
    vec3 pool=lm.rgb*${POOL_SCALE.toFixed(1)}*lanternGain*lanternPool*hfade*facing*inside;
    reflectedLight.indirectDiffuse+=pool*BRDF_Lambert(material.diffuseColor)*3.14159;
    reflectedLight.indirectDiffuse+=flashColor*(.45+.55*max(wN.y,0.0))*BRDF_Lambert(material.diffuseColor)*3.14159;
  #ifdef WORLD_RIM
    vec3 vdir=normalize(vViewPosition);
    float fr=pow(1.0-clamp(dot(normal,vdir),0.0,1.0),rimParams.y);
    totalEmissiveRadiance+=rimColor*fr*rimParams.x*(.55+.45*clamp(wN.y+.4,0.0,1.0));
    totalEmissiveRadiance+=rimWarm*fr*rimParams.z*dot(pool,vec3(.33));
  #endif
  }
`;
const FRAG_FOG=`
#ifdef USE_FOG
  {
    float h=max(0.0,mistParams.x-vWorldLightPos.y);
    float mist=(1.0-exp(-vFogDepth*mistParams.z*(1.0+h*mistParams.y)))*mistParams.w;
    gl_FragColor.rgb=mix(gl_FragColor.rgb,mistColor,clamp(mist,0.0,1.0));
  }
#endif
`;

// A NaN from a degenerate normal is invisible as one pixel but bloom smears it into a black
// rectangle. Drop non-finite colours before they reach the HDR buffer.
const FRAG_SANITIZE=`
  if(any(isnan(gl_FragColor))||any(isinf(gl_FragColor)))gl_FragColor=vec4(0.0,0.0,0.0,1.0);
`;

/**
 * @param {THREE.Scene} scene
 * @param {{uniforms: object}} lanterns  lanterns.mjs light system (shared map uniforms)
 */
export function createWorldLight(scene,lanterns){
  const W=WORLD_LIGHT;
  const shared={
    ...lanterns.uniforms,
    lanternPool:{value:W.pool},
    emissiveBoost:{value:W.emissiveBoost},
    mistColor:{value:new THREE.Color(W.mist.color)},
    mistParams:{value:new THREE.Vector4(W.mist.base,W.mist.falloff,W.mist.density,W.mist.max)},
    rimColor:{value:new THREE.Color(W.rim.color)},
    rimWarm:{value:new THREE.Color(W.rim.warm)},
    rimParams:{value:new THREE.Vector4(W.rim.strength,W.rim.power,W.rim.warmStrength,0)},
    flashColor:{value:new THREE.Color(0,0,0)}
  };
  const patched=new WeakSet(),rimClones=new Map(),seen=new WeakSet();
  let timer=0,enabled=true;

  function patch(material,rim){
    if(!material||patched.has(material)||!LIT.has(material.type))return material;
    const previous=material.onBeforeCompile,previousKey=material.customProgramCacheKey;
    material.onBeforeCompile=(shader,renderer)=>{
      previous?.call(material,shader,renderer);
      Object.assign(shader.uniforms,shared);
      if(rim)shader.defines={...(shader.defines||{}),WORLD_RIM:''};
      shader.vertexShader=VERT_DECL+shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>'+VERT_BODY);
      shader.fragmentShader=FRAG_DECL+shader.fragmentShader
        .replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\n  totalEmissiveRadiance*=emissiveBoost;')
        .replace('#include <lights_fragment_end>','#include <lights_fragment_end>'+FRAG_LIGHT)
        .replace('#include <fog_fragment>','#include <fog_fragment>'+FRAG_FOG)
        .replace('#include <dithering_fragment>','#include <dithering_fragment>'+FRAG_SANITIZE);
    };
    material.customProgramCacheKey=()=>(previousKey?previousKey.call(material):'')+(rim?'|wl-rim':'|wl');
    material.needsUpdate=true;patched.add(material);return material;
  }
  function rimMaterial(material){
    if(!material||!LIT.has(material.type))return material;
    if(rimClones.has(material))return rimClones.get(material);
    if(material.userData.worldRim){return material;}
    const clone=material.clone();clone.userData.worldRim=true;
    // keep later opacity/colour edits on the original visible on the clone
    patch(clone,true);rimClones.set(material,clone);return clone;
  }
  function isCharacterRoot(o){
    if(CHARACTER_MARK(o))return true;
    for(const c of o.children)if(CHARACTER_MARK(c))return true;
    return false;
  }
  function scan(){
    for(const top of scene.children){
      const character=isCharacterRoot(top);
      top.traverse(o=>{
        if(!o.isMesh&&!o.isSkinnedMesh&&!o.isInstancedMesh)return;
        if(o.isPoints||o.isSprite)return;
        const fix=m=>character?rimMaterial(m):patch(m,false);
        if(seen.has(o)&&!character)return;
        if(Array.isArray(o.material))o.material=o.material.map(fix);else o.material=fix(o.material);
        if(!character)seen.add(o);
      });
    }
  }
  return {
    uniforms:shared,
    /** Patch now (call once after the world is built to avoid a pop on the first frames). */
    scan,
    applyProfile(q){shared.rimParams.value.x=W.rim.strength*(q.rim??1);},
    update({dt=.016}={}){if(!enabled)return;timer-=dt;if(timer<=0){timer=.5;scan();}},
    setFlash(color){shared.flashColor.value.copy(color);},
    set enabled(v){enabled=v;}
  };
}
