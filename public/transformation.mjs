import * as THREE from 'three';
import {DISGUISE} from '../shared/disguise.mjs';
export function createTransformation(renderer){
  const scene=new THREE.Scene();scene.background=new THREE.Color('#101b2b');scene.fog=new THREE.FogExp2('#101b2b',.045);
  const camera=new THREE.PerspectiveCamera(38,1,.1,80);scene.add(new THREE.HemisphereLight('#b4dcf1','#625f61',1.5));
  const key=new THREE.DirectionalLight('#ffddb0',3);key.position.set(-3,6,5);scene.add(key);const rim=new THREE.DirectionalLight('#b68cef',2);rim.position.set(2,4,-4);scene.add(rim);
  const floor=new THREE.Mesh(new THREE.CircleGeometry(35,64),new THREE.MeshStandardMaterial({color:'#233f43',roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.07;scene.add(floor);
  const moon=new THREE.Mesh(new THREE.SphereGeometry(1.2,24,16),new THREE.MeshBasicMaterial({color:'#ffe0a3'}));moon.position.set(-7,8,-18);scene.add(moon);
  const positions=new Float32Array(150*3);for(let i=0;i<150;i++){positions[i*3]=Math.sin(i*93)*25;positions[i*3+1]=2+(i%11);positions[i*3+2]=-10-Math.abs(Math.sin(i*3))*16;}const stars=new THREE.BufferGeometry();stars.setAttribute('position',new THREE.BufferAttribute(positions,3));scene.add(new THREE.Points(stars,new THREE.PointsMaterial({color:'#ffe1a2',size:.055,transparent:true,opacity:.65})));
  const smoke=new THREE.InstancedMesh(new THREE.SphereGeometry(1,10,8),new THREE.MeshStandardMaterial({color:'#c9b6f0',roughness:1,transparent:true,opacity:.83,depthWrite:false}),4*32);smoke.frustumCulled=false;scene.add(smoke);
  const sparks=new THREE.InstancedMesh(new THREE.OctahedronGeometry(.07),new THREE.MeshBasicMaterial({color:'#ffe3a0'}),4*18);sparks.frustumCulled=false;scene.add(sparks);
  const dummy=new THREE.Object3D(),rings=[],pedestals=[],crew=[];let originals=new Map();
  const overlay=document.querySelector('#transformation'),title=document.querySelector('#transformation-title'),caption=document.querySelector('#transformation-caption'),fill=document.querySelector('#transformation-progress');
  function clear(){for(const {node,parent}of originals.values())parent?.add(node);originals.clear();crew.length=0;for(const n of [...rings,...pedestals]){scene.remove(n);n.geometry.dispose();n.material.dispose();}rings.length=pedestals.length=0;overlay.classList.add('hidden');}
  function start(nodes){
    clear();nodes.forEach((n,i)=>{originals.set(n.p.id,{node:n.group,parent:n.group.parent});scene.add(n.group);crew.push(n);const x=(i-(nodes.length-1)/2)*2.5;
      const base=new THREE.Mesh(new THREE.CylinderGeometry(1.05,1.2,.13,40),new THREE.MeshStandardMaterial({color:'#487078',metalness:.2,roughness:.7}));base.position.set(x,-.08,0);scene.add(base);pedestals.push(base);
      const ring=new THREE.Mesh(new THREE.TorusGeometry(.95,.025,8,64),new THREE.MeshBasicMaterial({color:'#dfbf82'}));ring.rotation.x=-Math.PI/2;ring.position.set(x,.02,0);scene.add(ring);rings.push(ring);
    });overlay.classList.remove('hidden');
  }
  function render(progress,time){
    const burst=Math.max(0,1-Math.abs(progress-.51)/.23),count=crew.length;let sc=0,sp=0;
    crew.forEach((n,i)=>{const x=(i-(count-1)/2)*2.5;n.group.position.set(x,0,0);n.label.visible=false;n.aura.visible=false;
      rings[i].position.y=.03+Math.sin(progress*Math.PI)*1.1;rings[i].scale.setScalar(1+burst*.25);rings[i].rotation.z=time*.9;
      for(let k=0;k<32;k++){const a=k*2.39996+time*1.5,r=(.3+k%4*.19)*(1+burst*.8);dummy.position.set(x+Math.sin(a)*r,.3+(k%9)*.25+Math.sin(a*2)*.12,Math.cos(a)*r);dummy.scale.setScalar(Math.max(.001,burst*(.2+k%3*.09)));dummy.rotation.set(0,a,0);dummy.updateMatrix();smoke.setMatrixAt(sc++,dummy.matrix);}
      for(let k=0;k<18;k++){const a=k*2.39996+time;dummy.position.set(x+Math.cos(a)*(1+burst*.6),.3+(k%7)*.4,Math.sin(a)*(1+burst*.6));dummy.scale.setScalar(.4+Math.sin(progress*Math.PI)*.8);dummy.rotation.set(a,time,0);dummy.updateMatrix();sparks.setMatrixAt(sp++,dummy.matrix);}
    });smoke.count=sc;smoke.instanceMatrix.needsUpdate=true;sparks.count=sp;sparks.instanceMatrix.needsUpdate=true;
    camera.aspect=innerWidth/innerHeight;const width=Math.max(3,(count-1)*2.5+2.7),distance=Math.max(6.4,width/(2*Math.tan(38*Math.PI/360)*camera.aspect));camera.position.set(Math.sin(time*.2)*.3,2.6,distance);camera.lookAt(0,1.5,0);camera.updateProjectionMatrix();
    title.textContent=progress<.4?'Borrow a human face':progress<.7?'One little trick…':'Human enough. For now.';caption.textContent=progress<.7?'Hide your true shape before the festival gates open.':'Stay close. Every 15 seconds, your disguise may slip.';
    fill.style.width=`${progress*100}%`;overlay.style.setProperty('--flash',String(Math.max(0,1-Math.abs(progress-.51)/.035)*.65));
    renderer.render(scene,camera);
  }
  return {start,clear,render,duration:DISGUISE.intro,scene};
}
