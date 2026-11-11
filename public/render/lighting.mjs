// Scene lighting rig (R02 night look, see docs/production/LIGHTING.md).
//   moon       cool, weak, wide key from behind-left of the uphill view; the only shadow caster
//   hemisphere deep-blue sky / warm-brown ground ambient (most of the screen lives here)
//   bounce     very low warm fill standing in for the sum of all festival lanterns
//   rim        cool back light that outlines silhouettes against the lane
//   flash      hemisphere that only lights up while fireworks burst (render.flash)
// Lantern point lights and light pools live in lanterns.mjs.
import * as THREE from 'three';

export const LIGHTING={
  hemisphere:{sky:'#4560a8',ground:'#4a3326',intensity:1.45},
  moon:{color:'#8fa8ff',intensity:1.05,direction:[-.42,.78,-.46],distance:34},
  warmFill:{color:'#ff9a52',intensity:.3,position:[6,5,14],threatDarken:.6},
  rim:{color:'#7f95ff',intensity:.55,position:[4,9,-22]},
  flash:{ground:'#120d10',max:1.35}
};

export function createLighting(scene){
  const L=LIGHTING;
  const moonDirection=new THREE.Vector3(...L.moon.direction).normalize();
  const hemisphere=new THREE.HemisphereLight(L.hemisphere.sky,L.hemisphere.ground,L.hemisphere.intensity);
  const moon=new THREE.DirectionalLight(L.moon.color,L.moon.intensity);moon.castShadow=true;moon.name='moon';
  moon.shadow.mapSize.set(2048,2048);moon.shadow.normalBias=.035;moon.shadow.bias=-.0004;
  moon.shadow.camera.top=17;moon.shadow.camera.bottom=-17;moon.shadow.camera.left=-17;moon.shadow.camera.right=17;moon.shadow.camera.near=1;moon.shadow.camera.far=80;moon.shadow.radius=4;moon.shadow.blurSamples=12;
  moon.position.copy(moonDirection).multiplyScalar(L.moon.distance);
  const warmFill=new THREE.DirectionalLight(L.warmFill.color,L.warmFill.intensity);warmFill.position.set(...L.warmFill.position);
  const rim=new THREE.DirectionalLight(L.rim.color,L.rim.intensity);rim.position.set(...L.rim.position);
  const flash=new THREE.HemisphereLight('#ffffff',L.flash.ground,0);flash.name='firework-flash';
  return {
    hemisphere,moon,warmFill,rim,flash,moonDirection,
    /** Add the rig to the scene. Split from creation so callers keep the original light order. */
    addHemisphere(){scene.add(hemisphere);scene.add(flash);},
    addDirectional(){scene.add(moon);scene.add(moon.target);scene.add(warmFill);scene.add(rim);},
    /** Shadow resolution follows the quality profile; the old map is released so it is rebuilt at the new size. */
    applyProfile(q){moon.shadow.mapSize.set(q.shadow,q.shadow);moon.shadow.radius=q.shadow>=2048?4:2.5;if(moon.shadow.map){moon.shadow.map.dispose();moon.shadow.map=null;}},
    /** Firework flash: color (THREE.Color, already scaled by strength). */
    setFlash(color){const k=Math.max(color.r,color.g,color.b);flash.intensity=Math.min(L.flash.max,k*1.4);if(k>0)flash.color.copy(color).multiplyScalar(1/k);},
    /**
     * Per-frame update. `focus` is the local player's position (or null),
     * `threat` is truthy while the Demon King is on screen.
     */
    update({focus=null,threat=null}={}){
      const darken=threat?L.warmFill.threatDarken:1;warmFill.intensity=THREE.MathUtils.lerp(warmFill.intensity,L.warmFill.intensity*darken,.03);
      const fx=focus?.x||0,fz=focus?.z||0,fy=focus?.y||0;
      // shadow camera follows the player; snap to texels so shadows do not shimmer while walking
      const step=34/moon.shadow.mapSize.x,sx=Math.round(fx/step)*step,sz=Math.round(fz/step)*step;
      moon.target.position.set(sx,fy,sz);moon.position.set(sx,fy,sz).addScaledVector(moonDirection,L.moon.distance);moon.target.updateMatrixWorld();
    }
  };
}
