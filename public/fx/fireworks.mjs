// REMASTER-HOOK r01: legacy firework bursts moved out of game.js unchanged. R10 owns public/fx/* and may replace this.
import * as THREE from 'three';

export const FIREWORK_INTERVAL=2.8;

export function createFireworks(scene,{onBurst}={}){
  const nodes=[];let next=1;
  function burst(time){
    const center=new THREE.Vector3(Math.sin(time*2)*19,12.5+Math.sin(time)*1.7,-44),positions=[],velocities=[];
    for(let i=0;i<170;i++){const a=i*2.39996,y=1-2*i/170,r=Math.sqrt(1-y*y);positions.push(center.x,center.y,center.z);velocities.push(Math.cos(a)*r*5,y*5,Math.sin(a)*r*5);}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    const hex=['#ffc67b','#dd9bff','#79e2d9','#ff87a6'][Math.floor(time)%4],color=new THREE.Color(hex).multiplyScalar(3);
    const node=new THREE.Points(geo,new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{color:{value:color},opacity:{value:1}},vertexShader:'void main(){vec4 p=modelViewMatrix*vec4(position,1.);gl_PointSize=clamp(220./-p.z,2.,9.);gl_Position=projectionMatrix*p;}',fragmentShader:'uniform vec3 color;uniform float opacity;void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;gl_FragColor=vec4(color,pow(1.-d,2.)*opacity);}'}));scene.add(node);nodes.push({node,velocities,age:0});
    onBurst?.({position:{x:center.x,y:center.y,z:center.z},color:hex});
  }
  return {
    nodes,
    update(elapsed,dt){
      if(elapsed>next){burst(elapsed);next=elapsed+FIREWORK_INTERVAL;}
      for(let i=nodes.length-1;i>=0;i--){const f=nodes[i];f.age+=dt;const a=f.node.geometry.attributes.position;for(let k=0;k<a.count;k++){a.setXYZ(k,a.getX(k)+f.velocities[k*3]*dt,a.getY(k)+(f.velocities[k*3+1]-f.age*1.6)*dt,a.getZ(k)+f.velocities[k*3+2]*dt);}a.needsUpdate=true;f.node.material.uniforms.opacity.value=Math.max(0,1-f.age/2.8);if(f.age>2.8){scene.remove(f.node);f.node.geometry.dispose();f.node.material.dispose();nodes.splice(i,1);}}
    }
  };
}
