// Post-processing chain for the festival scene (R02).
// Order: scene -> SSAO (high) -> bloom (lanterns, potions, fireworks only: high threshold)
//        -> output (ACES tone map + sRGB) -> grade (3D LUT + vignette + flash) -> SMAA.
// The grade runs on display-referred colour so the LUT can be authored like a photo grade.
// Every pass toggle is profile-driven (visual-quality.mjs).
import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {SSAOPass} from 'three/addons/postprocessing/SSAOPass.js';
import {SMAAPass} from 'three/addons/postprocessing/SMAAPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';

/** Night festival grade (display space). Tweak here, the LUT is rebuilt from it. */
export const GRADE={
  lutSize:32,
  shadowTint:[.62,.74,1.18],   // multiplied into the darks: blue shadows
  shadowAmount:.36,
  highlightTint:[1.10,.96,.78], // warm highlights
  highlightAmount:.34,
  greenToTeal:.45,             // night grass: pull pure greens toward blue-green
  saturation:1.06,
  contrast:.10,pivot:.36,
  blackLift:.012,
  vignette:.30
};

const smooth=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);};
/** The grade as a function of a display-space colour (0..1). Exported for tests and the LUT preview tool. */
export function gradeColor(r,g,b,G=GRADE){
  // night grass: greens lose saturation and lean teal
  const gx=Math.max(0,g-Math.max(r,b));g-=gx*G.greenToTeal*.55;b+=gx*G.greenToTeal*.35;
  let L=.2126*r+.7152*g+.0722*b;
  const ws=1-smooth(0,.5,L),wh=smooth(.42,1,L);
  r=r*(1+(G.shadowTint[0]-1)*ws*G.shadowAmount);g=g*(1+(G.shadowTint[1]-1)*ws*G.shadowAmount);b=b*(1+(G.shadowTint[2]-1)*ws*G.shadowAmount);
  r=r*(1+(G.highlightTint[0]-1)*wh*G.highlightAmount);g=g*(1+(G.highlightTint[1]-1)*wh*G.highlightAmount);b=b*(1+(G.highlightTint[2]-1)*wh*G.highlightAmount);
  L=.2126*r+.7152*g+.0722*b;
  r=L+(r-L)*G.saturation;g=L+(g-L)*G.saturation;b=L+(b-L)*G.saturation;
  const c=x=>{x=G.pivot+(x-G.pivot)*(1+G.contrast);return Math.min(1,Math.max(0,G.blackLift+x*(1-G.blackLift)));};
  return [c(r),c(g),c(b)];
}
export function buildGradeLUT(G=GRADE){
  const n=G.lutSize,data=new Uint8Array(n*n*n*4);
  for(let bz=0;bz<n;bz++)for(let gy=0;gy<n;gy++)for(let rx=0;rx<n;rx++){
    const [r,g,b]=gradeColor(rx/(n-1),gy/(n-1),bz/(n-1),G),at=((bz*n+gy)*n+rx)*4;
    data[at]=Math.round(r*255);data[at+1]=Math.round(g*255);data[at+2]=Math.round(b*255);data[at+3]=255;
  }
  const t=new THREE.Data3DTexture(data,n,n,n);t.format=THREE.RGBAFormat;t.type=THREE.UnsignedByteType;
  t.minFilter=t.magFilter=THREE.LinearFilter;t.wrapS=t.wrapT=t.wrapR=THREE.ClampToEdgeWrapping;t.unpackAlignment=1;t.needsUpdate=true;return t;
}

export const GRADE_SHADER={
  uniforms:{tDiffuse:{value:null},lut:{value:null},lutSize:{value:32},lutAmount:{value:1},vignette:{value:GRADE.vignette},flash:{value:new THREE.Color(0,0,0)}},
  vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:`precision highp sampler3D;uniform sampler2D tDiffuse;uniform sampler3D lut;uniform float lutSize,lutAmount,vignette;uniform vec3 flash;varying vec2 vUv;
  void main(){vec4 c=texture2D(tDiffuse,vUv);vec3 x=clamp(c.rgb,0.,1.);
    vec3 uvw=x*((lutSize-1.)/lutSize)+.5/lutSize;vec3 g=texture(lut,uvw).rgb;c.rgb=mix(x,g,lutAmount);
    vec2 d=vUv-.5;d.x*=1.25;float e=dot(d,d);c.rgb*=1.-smoothstep(.06,.62,e)*vignette;
    c.rgb+=flash*(.06+.1*(1.-vUv.y));
    gl_FragColor=c;}`
};

export function createPost(renderer,scene,camera,{width=innerWidth,height=innerHeight}={}){
  const composer=new EffectComposer(renderer,new THREE.WebGLRenderTarget(width,height,{type:THREE.HalfFloatType}));composer.addPass(new RenderPass(scene,camera));
  const ao=new SSAOPass(scene,camera,width,height,16);ao.kernelRadius=.65;ao.minDistance=.002;ao.maxDistance=.06;composer.addPass(ao);
  const bloom=new UnrealBloomPass(new THREE.Vector2(width,height),.5,.55,.72);composer.addPass(bloom);
  const output=new OutputPass();composer.addPass(output);
  const grade=new ShaderPass(GRADE_SHADER);grade.uniforms.lut.value=buildGradeLUT();grade.uniforms.lutSize.value=GRADE.lutSize;composer.addPass(grade);
  const smaa=new SMAAPass();composer.addPass(smaa);
  return {
    composer,ao,bloom,grade,smaa,output,
    /** Apply a PROFILES entry (see visual-quality.mjs) at the given pixel ratio. */
    applyProfile(q,pixelRatio){
      composer.setPixelRatio(pixelRatio);ao.enabled=q.ao;
      bloom.enabled=q.bloom>0;bloom.strength=q.bloom;bloom.threshold=q.bloomThreshold??.72;bloom.radius=q.bloomRadius??.55;
      grade.uniforms.lutAmount.value=q.grade??1;grade.uniforms.vignette.value=GRADE.vignette*(q.vignette??1);
      smaa.enabled=q.smaa!==false;
    },
    setFlash(color){grade.uniforms.flash.value.copy(color);},
    setSize(w,h){composer.setSize(w,h);},
    render(){composer.render();}
  };
}
