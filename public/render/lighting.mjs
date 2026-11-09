// Scene lighting rig: sky/ground hemisphere, shadow-casting moon, warm fill and cool rim.
// Lantern point lights belong to festival.mjs; this module only owns the global rig.
import * as THREE from 'three';

export const LIGHTING={
  hemisphere:{sky:'#afc9f4',ground:'#4c6853',intensity:.65},
  moon:{color:'#adc6f3',intensity:1.1,offset:{x:-12,y:28,z:8}},
  warmFill:{color:'#ffcf95',intensity:.65,position:[12,8,15],threatDarken:.86},
  rim:{color:'#b4c4ff',intensity:.65,position:[0,12,-25]}
};

export function createLighting(scene){
  const L=LIGHTING;
  const hemisphere=new THREE.HemisphereLight(L.hemisphere.sky,L.hemisphere.ground,L.hemisphere.intensity);
  const moon=new THREE.DirectionalLight(L.moon.color,L.moon.intensity);moon.position.set(-15,28,8);moon.castShadow=true;
  moon.shadow.mapSize.set(2048,2048);moon.shadow.normalBias=.035;moon.shadow.bias=-.0003;
  moon.shadow.camera.top=16;moon.shadow.camera.bottom=-16;moon.shadow.camera.left=-16;moon.shadow.camera.right=16;moon.shadow.camera.far=75;moon.shadow.radius=3;
  const warmFill=new THREE.DirectionalLight(L.warmFill.color,L.warmFill.intensity);warmFill.position.set(...L.warmFill.position);
  const rim=new THREE.DirectionalLight(L.rim.color,L.rim.intensity);rim.position.set(...L.rim.position);
  return {
    hemisphere,moon,warmFill,rim,
    /** Add the rig to the scene. Split from creation so callers keep the original light order. */
    addHemisphere(){scene.add(hemisphere);},
    addDirectional(){scene.add(moon);scene.add(warmFill);scene.add(rim);},
    /** Shadow resolution follows the quality profile; the old map is released so it is rebuilt at the new size. */
    applyProfile(q){moon.shadow.mapSize.set(q.shadow,q.shadow);if(moon.shadow.map){moon.shadow.map.dispose();moon.shadow.map=null;}},
    /**
     * Per-frame update. `focus` is the local player's position (or null),
     * `threat` is truthy while the Demon King is on screen.
     */
    update({focus=null,threat=null}={}){
      const darken=threat?L.warmFill.threatDarken:1;warmFill.intensity=THREE.MathUtils.lerp(warmFill.intensity,L.warmFill.intensity*darken,.03);
      moon.position.x=(focus?.x||0)+L.moon.offset.x;moon.position.z=(focus?.z||0)+L.moon.offset.z;moon.target.position.copy(focus||new THREE.Vector3());moon.target.updateMatrixWorld();
    }
  };
}
