// R10 game feel: camera trauma shake, screen flash, HUD pulse. All transient, all visual-only.
// Shake offsets the camera only for the duration of pipeline.render() and restores it right after,
// so camera follow/orbit code in game.js never sees the offset (no drift, no gameplay effect).
import * as THREE from 'three';

const reduced=()=>typeof matchMedia!=='undefined'&&matchMedia('(prefers-reduced-motion: reduce)').matches;

export function createFeel({pipeline}){
  let trauma=0,t=0,flashA=0,flashColor='#fff1d6';
  const camera=pipeline?.camera,saved=new THREE.Vector3();let savedRoll=0;
  // screen flash overlay (DOM, pointer-events none, above the canvas and below the HUD)
  let flashEl=null;
  if(typeof document!=='undefined'){
    flashEl=document.createElement('div');flashEl.id='fx-flash';flashEl.setAttribute('aria-hidden','true');
    Object.assign(flashEl.style,{position:'fixed',inset:'0',pointerEvents:'none',zIndex:'4',opacity:'0',mixBlendMode:'screen',background:'#fff'});
    document.body.append(flashEl);
  }
  if(pipeline&&camera&&!pipeline.__fxWrapped){
    const render=pipeline.render.bind(pipeline);pipeline.__fxWrapped=true;
    pipeline.render=usePost=>{
      const s=trauma*trauma;
      if(s<=1e-4){render(usePost);return;}
      saved.copy(camera.position);savedRoll=camera.rotation.z;
      const k=reduced()?.25:1;
      // smooth layered sines, not random jitter (random per frame buzzes)
      camera.position.x+=(Math.sin(t*23)+.5*Math.sin(t*37.3))*.12*s*k;
      camera.position.y+=(Math.sin(t*29+1.3)+.5*Math.sin(t*17.9))*.09*s*k;
      camera.rotation.z+=Math.sin(t*19+.7)*.012*s*k;
      render(usePost);
      camera.position.copy(saved);camera.rotation.z=savedRoll;
    };
  }
  return {
    get trauma(){return trauma;},
    /** Add camera trauma 0..1 (hits add up; decays ~1.6/s). */
    shake(amount){trauma=Math.min(1,trauma+amount);},
    /** Brief full-screen flash. intensity 0..1 (kept low: it is a glow, not a strobe). */
    flash(color='#fff1d6',intensity=.25){
      if(reduced())intensity*=.3;
      if(intensity>flashA){flashA=Math.min(.6,intensity);flashColor=color;if(flashEl)flashEl.style.background=`radial-gradient(ellipse at 50% 45%,${color},transparent 75%)`;}
      pipeline?.flash?.(color,intensity);
    },
    /** Squash-pop a HUD element (e.g. the spirit meter when a potion is drunk). */
    pulse(selector,color='#ffffff'){
      if(typeof document==='undefined'||reduced())return;const el=document.querySelector(selector);if(!el?.animate)return;
      el.animate([{transform:'scale(1)',filter:'brightness(1)'},{transform:'scale(1.08,1.25)',filter:`brightness(1.6) drop-shadow(0 0 6px ${color})`,offset:.3},{transform:'scale(1)',filter:'brightness(1)'}],{duration:420,easing:'cubic-bezier(.2,.9,.3,1.3)'});
    },
    update(dt){
      t+=dt;trauma=Math.max(0,trauma-dt*1.6);
      flashA=Math.max(0,flashA-dt*3.2);if(flashEl)flashEl.style.opacity=flashA.toFixed(3);
    },
    clear(){trauma=0;flashA=0;if(flashEl)flashEl.style.opacity='0';}
  };
}
