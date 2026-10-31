import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createAvatar,animateAvatar} from '../public/avatar.mjs';
import {createVisitor,animateVisitor} from '../public/visitors.mjs';
const ids=['mizu','pon','kon','sumi','nemu','akari','kasa'];
const idle={action:'idle',facing:0,dx:0,dz:0,cover:0};
function frame(r,p,t,at={x:0,z:0},dt=1/60){animateAvatar(r,p,dt,t,t,at);r.root.updateMatrixWorld(true);}

test('all seven actors breathe, shift weight and move their arms without drifting or losing their shape',()=>{
  for(const id of ids){const r=createAvatar(id),scale=r.head.scale.clone(),ys=[],arms=[];
    for(let j=0;j<240;j++){frame(r,idle,j/60);ys.push(r.body.position.y);arms.push(r.arms[0].rotation.x);}
    assert.ok(Math.max(...ys)-Math.min(...ys)>.02,id);assert.ok(Math.max(...arms)-Math.min(...arms)>.03,id);
    assert.equal(r.root.position.y,0);assert.ok(r.head.scale.distanceTo(scale)<1e-9);assert.equal(r.legs[0].parent,r.stance);
    r.root.traverse(n=>{assert.ok(n.matrixWorld.elements.every(Number.isFinite),`${id} ${n.name}`);});
  }
});
test('actual travel drives distinct gaits; knees, opposite legs, cloth and bottle continue the stride',()=>{
  const phases=[];
  for(const id of ids){const r=createAvatar(id);let peak=0,cloth=0,footRange=[];
    for(let j=0;j<180;j++){frame(r,{...idle,action:'walk',dx:1},j/60,{x:j/60*3.6,z:0});peak=Math.max(peak,Math.abs(r.legs[0].rotation.x));cloth=Math.max(cloth,Math.abs(r.robe?.morphTargetInfluences[0]||0));footRange.push(r.legs[0].position.y);}
    assert.ok(peak>(id==='kasa'?.2:.4),id);if(r.legs.length===2)assert.ok(r.legs[0].rotation.x*r.legs[1].rotation.x<=0);
    if(r.robe){assert.ok(cloth>.5);assert.ok(r.robe.parent);assert.equal(r.robe.geometry.morphAttributes.position.length,2);}
    assert.ok(Math.max(...footRange)-Math.min(...footRange)>.05,id);phases.push(r.gaitPhase-r.phase);
  }
  assert.ok(new Set(phases.map(p=>p.toFixed(2))).size>=5);
});
test('held input against a wall cannot make stationary actors walk in place; stopping and booth locks settle',()=>{
  for(const id of ids){const r=createAvatar(id);
    for(let j=0;j<120;j++)frame(r,{...idle,dx:1,action:'walk'},j/60);
    assert.ok(r.motion<.001);assert.ok(Math.abs(r.legs[0].rotation.x)<.001);
    for(let j=0;j<90;j++)frame(r,{...idle,dx:1,action:'walk'},2+j/60,{x:j/60*3.6,z:0});
    for(let j=0;j<90;j++)frame(r,{...idle,dx:1,action:'stall',mini:{phase:'playing'}},4+j/60,{x:5.34,z:0});
    assert.ok(r.motion<.001);assert.ok(Math.abs(r.legs[0].rotation.x)<.001);
  }
});
test('neck and face-tail really deform with a skin and keep their faces attached',()=>{
  for(const id of ['kon','nemu']){const r=createAvatar(id),flex=r.neck||r.tailSpine,mesh=flex.mesh;
    frame(r,idle,0);const vertex=Math.floor(mesh.geometry.attributes.position.count*.65),a=new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position,vertex);mesh.skeleton.update();mesh.applyBoneTransform(vertex,a);
    frame(r,{...idle,dx:1,action:'walk'},.8,{x:1,z:0},.1);mesh.skeleton.update();const b=new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position,vertex);mesh.applyBoneTransform(vertex,b);
    assert.ok(a.distanceTo(b)>.003,id);assert.ok(r.root.getObjectById(mesh.id));assert.equal((id==='kon'?r.head:r.mask).parent,flex.end);
    const weights=mesh.geometry.attributes.skinWeight;for(let i=0;i<weights.count;i++)assert.ok(Math.abs(weights.getX(i)+weights.getY(i)-1)<1e-6);
  }
});
test('walk distance produces the same step phase at 30, 60 and 120 fps',()=>{
  const phases=[];
  for(const fps of [30,60,120]){const r=createAvatar('mizu');for(let j=0;j<=fps*2;j++)frame(r,{...idle,dx:1,action:'walk'},j/fps,{x:3.6*j/fps,z:0},1/fps);phases.push(r.gaitPhase);}
  assert.ok(Math.max(...phases)-Math.min(...phases)<1e-8);
});
test('drink, magic, cover and landing poses work for every character without permanently latching',()=>{
  for(const id of ids){const r=createAvatar(id);for(let j=0;j<24;j++)frame(r,{...idle,action:'drink'},.2+j/60);assert.ok(r.bottle.visible);assert.ok(r.arms[1].rotation.x< -1.3);
    for(let j=0;j<24;j++)frame(r,{...idle,action:'charm'},.8+j/60);assert.ok(r.arms.every(a=>a.rotation.x<-.8));
    for(let j=0;j<24;j++)frame(r,{...idle,cover:1},1.3+j/60);assert.ok(Math.abs(r.arms[0].rotation.z)>.9);
    frame(r,{...idle,height:1,vy:-1},.8);assert.ok(r.root.position.y>0);frame(r,idle,1);assert.ok(r.landing>0);
    for(let j=0;j<120;j++)frame(r,idle,1+j/60);assert.ok(!r.bottle.visible);assert.ok(r.hipBottle.visible);assert.ok(r.landing<1e-8);assert.ok(r.root.position.y<.001);
  }
});
test('human visitors retain a continuous gait between sparse network updates',()=>{
  const r=createVisitor(0);let peak=0,at=0;
  for(let j=0;j<120;j++){if(j%6===0)at+=.18;const rendered=at-.18+(.18*(j%6)/6);animateVisitor(r,{x:at,z:0,direction:1},1/60,j/60,{x:rendered,z:0});peak=Math.max(peak,Math.abs(r.legs[0].rotation.x));}
  assert.ok(r.motion>.4);assert.ok(peak>.25);assert.ok(r.root.rotation.y>.9);
});
test('planted shoes stay on the ground and hold their world position during the stance half-step',()=>{
  for(const id of ids.filter(id=>id!=='kasa')){
    const r=createAvatar(id),previous=[null,null];let checked=0;
    for(let j=0;j<240;j++){
      const t=j/60;r.root.position.z=t*3.6;frame(r,{...idle,action:'walk',dz:1},t,{x:0,z:t*3.6});
      r.feet.forEach((foot,i)=>{const phase=((r.gaitPhase+i*Math.PI)%(Math.PI*2)+Math.PI*2)%(Math.PI*2),point=foot.getWorldPosition(new THREE.Vector3());
        if(j>90&&phase>Math.PI+.2&&phase<Math.PI*2-.2){assert.ok(Math.abs(point.y-.16)<.02,`${id} foot contact`);if(previous[i]){assert.ok(Math.abs(point.z-previous[i].z)<.015,`${id} foot slides`);checked++;}previous[i]=point;}else previous[i]=null;
      });
    }
    assert.ok(checked>30,id);
  }
});
