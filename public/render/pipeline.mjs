// Render pipeline: renderer, night sky, fog, environment map, lighting rig, lantern light,
// world light patch and post chain. game.js only calls create / applyProfile / resize /
// update / render / flash, so the look changes here (R02) without touching game logic.
// Plan and numbers: docs/production/LIGHTING.md.
import * as THREE from 'three';
import {createLighting} from './lighting.mjs';
import {createPost} from './post.mjs';
import {createSky} from './sky.mjs';
import {createLanternLight} from './lanterns.mjs';
import {createWorldLight} from './world-light.mjs';

export const ATMOSPHERE={background:'#0d1226',fog:{color:'#1a2547',density:.0105},environmentIntensity:.55,exposure:1.04};

export class WebGLUnavailableError extends Error{}

export function createRenderer(canvas){
  try{return new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});}
  catch(error){throw new WebGLUnavailableError('WebGL unavailable',{cause:error});}
}

/** Night environment for PBR reflections and ambient: deep-blue sky, warm lantern band low on the horizon. */
function nightEnvironment(renderer){
  const env=new THREE.Scene();
  const sky=new THREE.Mesh(new THREE.SphereGeometry(10,32,16),new THREE.ShaderMaterial({side:THREE.BackSide,
    vertexShader:'varying vec3 vP;void main(){vP=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'varying vec3 vP;void main(){float h=vP.y;vec3 c=mix(vec3(.10,.13,.24),vec3(.03,.045,.10),smoothstep(0.,.8,h));c=mix(c,vec3(.07,.05,.045),smoothstep(0.,-.4,h));float band=exp(-pow(h*7.,2.));c+=vec3(.55,.30,.12)*band*.55;gl_FragColor=vec4(c,1.);}'}));
  env.add(sky);
  // a few lantern blobs so glossy surfaces pick up warm highlights
  const lamp=new THREE.MeshBasicMaterial({color:new THREE.Color('#ffb066').multiplyScalar(5)});
  for(let i=0;i<9;i++){const a=i/9*Math.PI*2,m=new THREE.Mesh(new THREE.SphereGeometry(.35,12,8),lamp);m.position.set(Math.cos(a)*8,.4+Math.sin(i*2.1)*.6,Math.sin(a)*8);env.add(m);}
  const moon=new THREE.Mesh(new THREE.SphereGeometry(.6,12,8),new THREE.MeshBasicMaterial({color:new THREE.Color('#c8d4ff').multiplyScalar(3)}));moon.position.set(-4,7.5,-4.5);env.add(moon);
  const pmrem=new THREE.PMREMGenerator(renderer),texture=pmrem.fromScene(env,.04).texture;
  pmrem.dispose();env.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
  return texture;
}

/**
 * Builds the whole festival render pipeline.
 * @returns {{renderer,lighting,post,sky,lanterns,worldLight,applyProfile(q),resize(w,h),update(frame),render(usePost),flash(color,intensity)}}
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
  scene.environment=nightEnvironment(renderer);scene.environmentIntensity=ATMOSPHERE.environmentIntensity;
  lighting.addDirectional();
  const sky=createSky(scene,{moonDirection:lighting.moonDirection});
  const lanterns=createLanternLight(scene);
  const worldLight=createWorldLight(scene,lanterns);
  const post=createPost(renderer,scene,camera,{width,height});
  // firework flash: decays every frame, the strongest recent burst wins
  const flashColor=new THREE.Color(0,0,0),flashScratch=new THREE.Color();let flashLevel=0;
  function pushFlash(){
    flashScratch.copy(flashColor).multiplyScalar(flashLevel);
    lighting.setFlash(flashScratch);sky.setFlash(flashScratch.clone().multiplyScalar(.5));worldLight.setFlash(flashScratch.clone().multiplyScalar(.18));post.setFlash(flashScratch.clone().multiplyScalar(.35));
  }
  let profile=null;
  return {
    renderer,lighting,post,scene,camera,sky,lanterns,worldLight,
    /** Apply a PROFILES entry from visual-quality.mjs. */
    applyProfile(q){
      profile=q;const ratio=Math.min(devicePixelRatio,q.ratio);
      renderer.setPixelRatio(ratio);post.applyProfile(q,ratio);renderer.shadowMap.enabled=q.shadows;lighting.applyProfile(q);lanterns.applyProfile(q);worldLight.applyProfile(q);
      // without post (light profile) there is no grade pass: lift exposure a touch so the night still reads
      renderer.toneMappingExposure=ATMOSPHERE.exposure*(q.post?1:1.12);
    },
    resize(w=innerWidth,h=innerHeight){renderer.setSize(w,h);post.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();},
    /** Per-frame look update. frame = {dt, elapsed, focus: Vector3|null, threat: Vector3|null}. */
    update(frame){
      lighting.update(frame);lanterns.update(frame);worldLight.update(frame);sky.update({elapsed:frame.elapsed,camera});
      if(flashLevel>0){flashLevel=Math.max(0,flashLevel-(frame.dt||.016)*1.9);pushFlash();}
    },
    /** Draw the festival. Callers reset renderer.info first when they want per-frame stats. */
    render(usePost){if(usePost)post.render();else renderer.render(scene,camera);},
    /**
     * Sky/ground colour flash for fireworks and big moments (R10 calls it).
     * color: CSS colour or THREE.Color; intensity: 0..1.5 (1 = a normal firework burst).
     */
    flash(color,intensity=1){
      const c=color instanceof THREE.Color?color:new THREE.Color(color);
      if(intensity>=flashLevel*.6){flashColor.copy(c);}
      flashLevel=Math.min(1.5,Math.max(flashLevel,intensity));pushFlash();
    },
    get profile(){return profile;}
  };
}
