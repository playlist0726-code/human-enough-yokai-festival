// R10 particle pools: one instanced billboard draw call per pool, CPU-simulated typed arrays.
// Two kinds share this code:
//   'smoke' : alpha-blended toon flipbook (smoke-atlas). Tone is gradient-mapped from a per-particle
//             shade colour to a light colour, so one atlas makes lavender smoke, brown dust, grey seals.
//   'glow'  : additive sprites (glow-atlas: dot, sparkle, heart, ring). Colours above 1 feed the bloom.
// Particles never touch game state; effects in fx/recipes.mjs emit into a pool.
import * as THREE from 'three';

const loader=typeof document!=='undefined'?new THREE.TextureLoader():null;
const textures=new Map();
export function fxTexture(url){
  if(textures.has(url))return textures.get(url);
  const tex=loader?loader.load(url):new THREE.Texture();tex.colorSpace=THREE.NoColorSpace;tex.generateMipmaps=true;tex.minFilter=THREE.LinearMipmapLinearFilter;
  textures.set(url,tex);return tex;
}

export const GLOW={dot:0,sparkle:1,heart:2,ring:3};

const vertexShader=`
attribute vec3 aOffset;attribute vec4 aColor;attribute vec3 aShade;attribute vec4 aParams;
uniform vec2 uGrid;
varying vec2 vUv;varying vec2 vUv2;varying float vMix;varying vec4 vColor;varying vec3 vShade;
void main(){
  float size=aParams.x,rot=aParams.y,frame=aParams.z;
  vec2 c=position.xy;float cs=cos(rot),sn=sin(rot);c=vec2(c.x*cs-c.y*sn,c.x*sn+c.y*cs)*size;
  vec3 right=vec3(viewMatrix[0][0],viewMatrix[1][0],viewMatrix[2][0]);
  vec3 up=vec3(viewMatrix[0][1],viewMatrix[1][1],viewMatrix[2][1]);
  vec3 world=aOffset+right*c.x+up*c.y;
  // flipbook frame blending: sample this frame and the next, cross-fade by the fraction (smooth at any fps)
  float f=floor(frame),n=min(f+1.,uGrid.x*uGrid.y-1.);vMix=frame-f;
  vec2 cell=vec2(mod(f,uGrid.x),uGrid.y-1.-floor(f/uGrid.x)),cell2=vec2(mod(n,uGrid.x),uGrid.y-1.-floor(n/uGrid.x));
  vUv=(cell+uv)/uGrid;vUv2=(cell2+uv)/uGrid;vColor=aColor;vShade=aShade;
  gl_Position=projectionMatrix*viewMatrix*vec4(world,1.);
}`;
const smokeFragment=`
uniform sampler2D uMap;varying vec2 vUv;varying vec2 vUv2;varying float vMix;varying vec4 vColor;varying vec3 vShade;
void main(){vec4 t=mix(texture2D(uMap,vUv),texture2D(uMap,vUv2),vMix);float a=t.a*vColor.a;if(a<.01)discard;
  gl_FragColor=vec4(mix(vShade,vColor.rgb,t.r),a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
const glowFragment=`
uniform sampler2D uMap;varying vec2 vUv;varying vec2 vUv2;varying float vMix;varying vec4 vColor;varying vec3 vShade;
void main(){vec4 t=mix(texture2D(uMap,vUv),texture2D(uMap,vUv2),vMix);float a=t.a*vColor.a;if(a<.004)discard;
  gl_FragColor=vec4(vColor.rgb,a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

/**
 * @param {{scene:THREE.Object3D, kind:'smoke'|'glow', capacity:number, map:THREE.Texture, grid:[number,number], renderOrder?:number}} o
 */
export function createPool({scene,kind,capacity,map,grid,renderOrder=10}){
  const quad=new THREE.PlaneGeometry(1,1),geo=new THREE.InstancedBufferGeometry();
  geo.index=quad.index;geo.setAttribute('position',quad.getAttribute('position'));geo.setAttribute('uv',quad.getAttribute('uv'));
  const offset=new Float32Array(capacity*3),color=new Float32Array(capacity*4),shade=new Float32Array(capacity*3),params=new Float32Array(capacity*4);
  const attr=(a,n)=>{const b=new THREE.InstancedBufferAttribute(a,n);b.setUsage(THREE.DynamicDrawUsage);return b;};
  const aOffset=attr(offset,3),aColor=attr(color,4),aShade=attr(shade,3),aParams=attr(params,4);
  geo.setAttribute('aOffset',aOffset);geo.setAttribute('aColor',aColor);geo.setAttribute('aShade',aShade);geo.setAttribute('aParams',aParams);
  geo.instanceCount=0;
  const material=new THREE.ShaderMaterial({vertexShader,fragmentShader:kind==='smoke'?smokeFragment:glowFragment,transparent:true,depthWrite:false,
    blending:kind==='glow'?THREE.AdditiveBlending:THREE.NormalBlending,uniforms:{uMap:{value:map},uGrid:{value:new THREE.Vector2(...grid)}}});
  const mesh=new THREE.Mesh(geo,material);mesh.frustumCulled=false;mesh.visible=false;mesh.renderOrder=renderOrder;mesh.name=`fx-${kind}`;scene.add(mesh);
  // simulation state (structure of arrays)
  const N=capacity,F=Float32Array;
  const s={x:new F(N),y:new F(N),z:new F(N),vx:new F(N),vy:new F(N),vz:new F(N),age:new F(N),life:new F(N),s0:new F(N),s1:new F(N),
    rot:new F(N),spin:new F(N),grav:new F(N),drag:new F(N),a0:new F(N),a1:new F(N),fade:new F(N),r:new F(N),g:new F(N),b:new F(N),
    sr:new F(N),sg:new F(N),sb:new F(N),frame:new F(N),anim:new Uint8Array(N),
    // swirl: polar motion around (cx,cz) with angular speed w and radial speed vr
    sw:new Uint8Array(N),cx:new F(N),cz:new F(N),ang:new F(N),rad:new F(N),w:new F(N),vr:new F(N)};
  let count=0;const tmpA=new THREE.Color(),tmpB=new THREE.Color();
  const frames=grid[0]*grid[1];
  function emit(p){
    if(count>=N)return false;const i=count++;
    s.x[i]=p.x;s.y[i]=p.y;s.z[i]=p.z;s.vx[i]=p.vx||0;s.vy[i]=p.vy||0;s.vz[i]=p.vz||0;s.age[i]=-(p.delay||0);s.life[i]=p.life||1;
    s.s0[i]=p.size??.3;s.s1[i]=p.sizeEnd??s.s0[i];s.rot[i]=p.rot??Math.random()*6.283;s.spin[i]=p.spin||0;s.grav[i]=p.gravity||0;s.drag[i]=p.drag||0;
    s.a0[i]=p.alpha??1;s.a1[i]=p.alphaEnd??0;s.fade[i]=p.fadeIn??.08;
    tmpA.set(p.color??'#ffffff');if(p.intensity)tmpA.multiplyScalar(p.intensity);tmpB.set(p.shade??p.color??'#888888');
    s.r[i]=tmpA.r;s.g[i]=tmpA.g;s.b[i]=tmpA.b;s.sr[i]=tmpB.r;s.sg[i]=tmpB.g;s.sb[i]=tmpB.b;
    s.anim[i]=p.frame===undefined?1:0;s.frame[i]=p.frame??0;
    s.sw[i]=p.swirl?1:0;if(p.swirl){s.cx[i]=p.swirl.cx;s.cz[i]=p.swirl.cz;s.ang[i]=p.swirl.angle;s.rad[i]=p.swirl.radius;s.w[i]=p.swirl.w;s.vr[i]=p.swirl.vr||0;}
    return true;
  }
  function kill(i){const j=--count;if(i===j)return;for(const k in s)s[k][i]=s[k][j];}
  function update(dt){
    for(let i=count-1;i>=0;i--){
      s.age[i]+=dt;if(s.age[i]>=s.life[i]){kill(i);continue;}
      if(s.age[i]<0)continue;
      if(s.sw[i]){s.ang[i]+=s.w[i]*dt;s.rad[i]=Math.max(0,s.rad[i]+s.vr[i]*dt);s.x[i]=s.cx[i]+Math.cos(s.ang[i])*s.rad[i];s.z[i]=s.cz[i]+Math.sin(s.ang[i])*s.rad[i];s.y[i]+=s.vy[i]*dt;s.vy[i]-=s.grav[i]*dt;}
      else{const d=Math.max(0,1-s.drag[i]*dt);s.vx[i]*=d;s.vy[i]=s.vy[i]*d-s.grav[i]*dt;s.vz[i]*=d;s.x[i]+=s.vx[i]*dt;s.y[i]+=s.vy[i]*dt;s.z[i]+=s.vz[i]*dt;}
      s.rot[i]+=s.spin[i]*dt;
    }
    for(let i=0;i<count;i++){
      const t=Math.max(0,s.age[i])/s.life[i],e=1-(1-t)*(1-t),live=s.age[i]>=0;
      offset[i*3]=s.x[i];offset[i*3+1]=s.y[i];offset[i*3+2]=s.z[i];
      const fadeIn=s.fade[i]>0?Math.min(1,s.age[i]/(s.fade[i]*s.life[i])):1;
      color[i*4]=s.r[i];color[i*4+1]=s.g[i];color[i*4+2]=s.b[i];color[i*4+3]=live?(s.a0[i]+(s.a1[i]-s.a0[i])*t)*fadeIn:0;
      shade[i*3]=s.sr[i];shade[i*3+1]=s.sg[i];shade[i*3+2]=s.sb[i];
      params[i*4]=live?s.s0[i]+(s.s1[i]-s.s0[i])*e:0;params[i*4+1]=s.rot[i];params[i*4+2]=s.anim[i]?Math.min(frames-1,t*frames):s.frame[i];
    }
    geo.instanceCount=count;mesh.visible=count>0;
    if(count){aOffset.needsUpdate=aColor.needsUpdate=aShade.needsUpdate=aParams.needsUpdate=true;}
  }
  function clear(){count=0;geo.instanceCount=0;mesh.visible=false;}
  function dispose(){scene.remove(mesh);geo.dispose();material.dispose();quad.dispose();}
  return {mesh,emit,update,clear,dispose,get count(){return count;},capacity,kind};
}
