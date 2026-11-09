// Post-processing chain for the festival scene.
// Order: scene -> SSAO -> bloom -> grade (vignette) -> SMAA -> output (tone map + sRGB).
// Owned by the render room (R02 after R01). Keep every pass toggle profile-driven.
import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {SSAOPass} from 'three/addons/postprocessing/SSAOPass.js';
import {SMAAPass} from 'three/addons/postprocessing/SMAAPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';

export const GRADE_SHADER={
  uniforms:{tDiffuse:{value:null}},
  vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:'uniform sampler2D tDiffuse;varying vec2 vUv;void main(){vec4 c=texture2D(tDiffuse,vUv);float edge=dot(vUv-.5,vUv-.5);c.rgb*=1.-smoothstep(.1,.5,edge)*.13;gl_FragColor=c;}'
};

export function createPost(renderer,scene,camera,{width=innerWidth,height=innerHeight}={}){
  const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));
  const ao=new SSAOPass(scene,camera,width,height,16);ao.kernelRadius=.65;ao.minDistance=.002;ao.maxDistance=.06;composer.addPass(ao);
  const bloom=new UnrealBloomPass(new THREE.Vector2(width,height),.28,.45,1.25);composer.addPass(bloom);
  const grade=new ShaderPass(GRADE_SHADER);composer.addPass(grade);
  const smaa=new SMAAPass();composer.addPass(smaa);
  const output=new OutputPass();composer.addPass(output);
  return {
    composer,ao,bloom,grade,smaa,output,
    /** Apply a PROFILES entry (see visual-quality.mjs) at the given pixel ratio. */
    applyProfile(q,pixelRatio){composer.setPixelRatio(pixelRatio);ao.enabled=q.ao;bloom.strength=q.bloom;},
    setSize(w,h){composer.setSize(w,h);},
    render(){composer.render();}
  };
}
