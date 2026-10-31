import * as THREE from 'three';
import {OBSTACLES,groundHeight} from '../shared/world.mjs';

export const CAMERA_LIMITS={minPitch:-1.28,maxPitch:1.32,minDistance:2.8,maxDistance:22};
export class FestivalCamera {
  constructor(camera){this.camera=camera;this.yaw=.2;this.pitch=.49;this.distance=9.5;this.smoothYaw=.2;this.smoothPitch=.49;this.target=new THREE.Vector3();this.ray=new THREE.Ray();this.hit=new THREE.Vector3();this.box=new THREE.Box3();this.ready=false;this.obstructed=false;this.focusLift=0;}
  drag(dx,dy){this.yaw-=dx*.006;this.pitch=THREE.MathUtils.clamp(this.pitch+dy*.006,CAMERA_LIMITS.minPitch,CAMERA_LIMITS.maxPitch);}
  zoom(delta){this.distance=THREE.MathUtils.clamp(this.distance*Math.exp(delta*.001),CAMERA_LIMITS.minDistance,CAMERA_LIMITS.maxDistance);}
  reset(wide=false){this.pitch=wide?.62:.49;this.distance=wide?17:9.5;}
  update(position,dt){
    const a=1-Math.exp(-Math.min(dt,.1)*14);this.smoothYaw=THREE.MathUtils.lerp(this.smoothYaw,this.yaw,a);this.smoothPitch=THREE.MathUtils.lerp(this.smoothPitch,this.pitch,a);
    this.target.copy(position);this.target.y+=1.65+this.focusLift;
    const pitch=this.smoothPitch,yaw=this.smoothYaw,elevation=Math.max(.08,pitch),desired=new THREE.Vector3(this.target.x+Math.sin(yaw)*Math.cos(elevation)*this.distance,this.target.y+Math.sin(elevation)*this.distance,this.target.z+Math.cos(yaw)*Math.cos(elevation)*this.distance);
    const direction=desired.clone().sub(this.target),distance=direction.length();this.ray.set(this.target,direction.normalize());let allowed=distance;this.obstructed=false;
    const overhead=[...[[11.5,7.3],[-22,6.2]].map(([z,w])=>({x:0,z,w:w*1.22,d:.5,base:3.3,height:1.2})),...[14,-7].map(z=>({x:0,z,w:8.2,d:2.6,base:4.5,height:.4}))];
    for(const o of [...OBSTACLES,...overhead]){const y=groundHeight(o.x,o.z)+(o.base||0);this.box.min.set(o.x-o.w/2-.22,y-.1,o.z-o.d/2-.22);this.box.max.set(o.x+o.w/2+.22,y+(o.height||3.6),o.z+o.d/2+.22);if(this.box.containsPoint(this.target))continue;const hit=this.ray.intersectBox(this.box,this.hit);if(hit){const d=hit.distanceTo(this.target)-.35;if(d>0&&d<allowed){allowed=d;this.obstructed=true;}}}
    // Hills also block the camera. The subject remains above the surface.
    for(let i=1;i<=24;i++){const d=allowed*i/24,p=this.ray.at(d,new THREE.Vector3());if(p.y<groundHeight(p.x,p.z)+.35){allowed=Math.max(.65,d-.35);this.obstructed=true;break;}}
    this.ray.at(allowed,desired);desired.y=Math.max(desired.y,groundHeight(desired.x,desired.z)+.35);
    this.camera.position.copy(desired);
    this.camera.lookAt(desired.x-Math.sin(yaw)*Math.cos(pitch)*10,desired.y-Math.sin(pitch)*10,desired.z-Math.cos(yaw)*Math.cos(pitch)*10);this.ready=true;
    return {yaw:this.smoothYaw,pitch:this.smoothPitch,distance:allowed,obstructed:this.obstructed,sky:pitch<-.3};
  }
}
