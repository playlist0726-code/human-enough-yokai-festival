// Render pipeline: renderer, sky colour, fog, environment map, lighting rig and post chain.
// game.js only calls create / applyProfile / resize / update / render, so the look can change
// here (R02) without touching game logic.
import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {createLighting} from './lighting.mjs';
import {createPost} from './post.mjs';

export const ATMOSPHERE={background:'#151c34',fog:{color:'#26374f',density:.0065},environmentIntensity:.30,exposure:1.05};

export class WebGLUnavailableError extends Error{}

export function createRenderer(canvas){
  try{return new THREE.WebGLRenderer({canvas,antialias:true,alpha:false});}
  catch(error){throw new WebGLUnavailableError('WebGL unavailable',{cause:error});}
}

/**
 * Builds the whole festival render pipeline.
 * @returns {{renderer,lighting,post,applyProfile(q),resize(w,h),update(frame),render(usePost),flash(color,intensity)}}
 */
export function createRenderPipeline({canvas,scene,camera,width=innerWidth,height=innerHeight}){
  scene.background=new THREE.Color(ATMOSPHERE.background);
  scene.fog=new THREE.FogExp2(ATMOSPHERE.fog.color,ATMOSPHERE.fog.density);
  const renderer=createRenderer(canvas);
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=ATMOSPHERE.exposure;
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  // game.js resets info right before the frame it measures (draw calls include every post pass).
  renderer.info.autoReset=false;
  const lighting=createLighting(scene);lighting.addHemisphere();
  const pmrem=new THREE.PMREMGenerator(renderer),roomEnvironment=new RoomEnvironment();
  scene.environment=pmrem.fromScene(roomEnvironment,.04).texture;scene.environmentIntensity=ATMOSPHERE.environmentIntensity;roomEnvironment.dispose();pmrem.dispose();
  lighting.addDirectional();
  const post=createPost(renderer,scene,camera,{width,height});
  return {
    renderer,lighting,post,scene,camera,
    /** Apply a PROFILES entry from visual-quality.mjs. */
    applyProfile(q){
      const ratio=Math.min(devicePixelRatio,q.ratio);
      renderer.setPixelRatio(ratio);post.applyProfile(q,ratio);renderer.shadowMap.enabled=q.shadows;lighting.applyProfile(q);
    },
    resize(w=innerWidth,h=innerHeight){renderer.setSize(w,h);post.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();},
    /** Per-frame look update. frame = {dt, elapsed, focus: Vector3|null, threat: Vector3|null}. */
    update(frame){lighting.update(frame);},
    /** Draw the festival. Callers reset renderer.info first when they want per-frame stats. */
    render(usePost){if(usePost)post.render();else renderer.render(scene,camera);},
    /**
     * Sky/ground colour flash for fireworks and big moments (R10 calls it, R02 implements it).
     * Currently a no-op so callers can wire it up early.
     */
    flash(color,intensity=1){}
  };
}
