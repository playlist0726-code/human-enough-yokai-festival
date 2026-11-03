import * as THREE from 'three';
import {surface,fabric,orb,cube,tube,group,curve,ring,batchRigidParts,softBox} from './renderkit.mjs';

const styles=[
  ['#f1c7ad','#302733','#dc8194','flowers','#552e58','bob'],
  ['#d6a480','#2c303c','#487d9f','waves','#d5aa59','short'],
  ['#efcdb2','#d4d0c1','#56656f','waves','#ac825a','elder'],
  ['#c98c6b','#423532','#878fb0','stars','#c57259','short'],
  ['#e7b795','#593d38','#9ca981','flowers','#995d74','bun'],
  ['#f4d4bc','#242936','#ddab69','flowers','#365d79','long'],
  ['#ba856a','#352c31','#6f9e9d','waves','#eaab61','short'],
  ['#dfad8e','#80584b','#b88bc4','moon','#724971','bun'],
  ['#f3c7b1','#34252e','#ed9db1','flowers','#65859c','bob'],
];
// Two eyes, nose, ears, brows, a smile and human hair silhouettes.
export function createVisitor(index=0){
  const [skin,hair,cloth,pattern,obi,cut]=styles[index%styles.length];
  const root=new THREE.Group(),body=group(root),outfit=fabric(cloth,pattern),r={root,body,legs:[],arms:[],eyes:[],head:null,index};
  root.name=`human-visitor-${index}`;root.userData.human=true;
  tube(body,outfit,.32,.44,1.05,0,.92,0);tube(body,surface(obi),.36,.37,.2,0,1.08,0);
  for(const side of [-1,1]){
    const collar=softBox(body,'#f8e5c7',side*.1,1.37,.28,.09,.35,.05,.01);collar.rotation.z=side*.43;
    const arm=group(body,side*.37,1.37,0);r.arms.push(arm);
    const sleeve=tube(arm,outfit,.19,.22,.45,side*.05,-.2,0);sleeve.rotation.z=side*.15;
    orb(arm,skin,side*.06,-.49,.03,.095,.12,.085);
    const leg=group(body,side*.18,.4,0);r.legs.push(leg);tube(leg,skin,.07,.07,.26,0,-.1,0);softBox(leg,'#583d36',0,-.3,.06,.23,.09,.32,.025);
    curve(leg,obi,[[-.08,-.22,.12],[0,-.19,.03],[.08,-.22,.12]],.025);
  }
  const bow=group(body,0,1.08,-.33);for(const s of [-1,1])orb(bow,obi,s*.12,0,0,.14,.12,.08);orb(bow,obi,0,0,.025,.07,.07,.06);
  r.head=group(body,0,1.91,0);orb(r.head,skin,0,0,0,.37,.43,.32);
  for(const s of [-1,1]){
    orb(r.head,skin,s*.36,-.02,0,.075,.115,.07);
    const eye=group(r.head,s*.135,.05,.285);r.eyes.push(eye);orb(eye,'#fff8ec',0,0,0,.08,.105,.035);
    orb(eye,surface('#3e2b35',{roughness:.13}),0,-.01,.033,.044,.063,.025);
    orb(eye,'#fffefa',.016,.022,.054,.015);
    const brow=curve(r.head,hair,[[s*.21,.18,.28],[s*.15,.205,.305],[s*.075,.185,.3]],.017);r.head.userData.brow=brow;
    orb(r.head,'#df917f',s*.235,-.12,.25,.057,.027,.012);
  }
  orb(r.head,skin,0,-.05,.335,.055,.07,.06);
  curve(r.head,'#945c59',[[-.065,-.195,.282],[0,-.219,.3],[.065,-.195,.282]],.012);
  const hairMat=surface(hair,{roughness:.78});orb(r.head,hairMat,0,.15,-.07,.395,.35,.31);
  for(let i=0;i<5;i++){
    const bang=orb(r.head,hairMat,-.27+i*.13,.255-Math.sin(i*.7)*.085,.23,.1,.18,.1);bang.rotation.z=-.2+i*.08;
  }
  if(cut==='bob'||cut==='long')for(const s of [-1,1])orb(r.head,hairMat,s*.3,cut==='long'?-.1:0,-.07,.14,cut==='long'?.47:.32,.22);
  if(cut==='bun'){orb(r.head,hairMat,.04,.4,-.16,.2,.21,.19);curve(r.head,'#e8b767',[[-.3,.24,0],[0,.44,-.09],[.3,.24,0]],.02);orb(r.head,obi,.29,.23,.07,.09,.06,.035);}
  if(cut==='elder'){
    for(const s of [-1,1])ring(r.head,'#6e6254',.107,.011,s*.13,.035,.325);
    curve(r.head,'#6e6254',[[-.035,.035,.325],[0,.045,.35],[.035,.035,.325]],.008);
  }
  if(index%3===0){const fan=group(r.arms[1],.05,-.42,.08);const face=orb(fan,fabric('#f1d7a8','flowers','#ca796a'),.08,.04,.03,.2,.21,.025);face.rotation.z=-.35;tube(fan,'#9c7449',.013,.013,.26,0,-.17,0);}
  r.lastX=null;r.lastZ=null;r.pace=0;batchRigidParts(root);return r;
}
export function animateVisitor(r,h,dt,time){
  const moved=r.lastX===null?0:Math.hypot(h.x-r.lastX,h.z-r.lastZ);r.lastX=h.x;r.lastZ=h.z;
  r.pace=THREE.MathUtils.lerp(r.pace,moved>.002?1:0,1-Math.exp(-dt*8));
  const delta=Math.atan2(Math.sin(h.direction-r.body.rotation.y),Math.cos(h.direction-r.body.rotation.y));r.body.rotation.y+=delta*(1-Math.exp(-dt*8));
  const phase=time*(h.owner?8:4)+r.index*1.8;
  r.legs.forEach((l,i)=>l.rotation.x=Math.sin(phase+i*Math.PI)*.32*r.pace);
  r.arms.forEach((a,i)=>{a.rotation.x=-Math.sin(phase+i*Math.PI)*.24*r.pace;a.rotation.z=(i===0?1:-1)*.04;});
  r.body.position.y=Math.abs(Math.sin(phase))*.028*r.pace;r.head.rotation.z=h.owner?Math.sin(time*2+r.index)*.07:Math.sin(time+r.index)*.015;
  const blinkPhase=(time+r.index*.46)%5.1,blink=blinkPhase<.17?Math.sin(blinkPhase/.17*Math.PI):0;r.eyes.forEach(e=>e.scale.y=1-blink*.94);
  r.head.rotation.y=Math.sin(time*.65+r.index)*.09*(1-r.pace);
}
