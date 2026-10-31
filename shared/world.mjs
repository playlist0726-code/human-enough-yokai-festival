export const CHARACTERS = [
  {id:'mizu',quote:'Nobody look at my head.',bio:'A shy kappa with one enormous eye and a water dish that never keeps a secret.',name:'Mizu',tag:'The shy one-eyed kappa',color:'#79c6ba'},
  {id:'pon',quote:'That was my stomach talking.',bio:'One hungry tanuki, one enormous tail, and a belly-mouth with absolutely no indoor voice.',name:'Pon',tag:'The tanuki with a hungry belly-mouth',color:'#d3a474'},
  {id:'kon',quote:'Just taking a little look.',bio:'A curious fox whose neck stretches toward trouble long before the rest of the crew arrives.',name:'Kon',tag:'The curious long-necked fox',color:'#f7dab3'},
  {id:'sumi',quote:'We agreed to disagree.',bio:'Two crow heads share one outfit. One has a plan. The other has already panicked.',name:'Sumi',tag:'Two heads, twice the trouble',color:'#7285a6'},
  {id:'nemu',quote:'I am asleep. Ask my tail.',bio:'A sleepy, faceless cat whose wide-awake tail does all the looking—and most of the judging.',name:'Nemu',tag:'The cat with a wide-awake tail',color:'#b19bad'},
  {id:'akari',quote:'Act natural. All three of us.',bio:'Three lanterns in one festival coat. Keeping a straight face is a group decision.',name:'Akari',tag:'Three delightfully wobbly lanterns',color:'#f4b65f'},
  {id:'kasa',quote:'Rain? I call that an entrance.',bio:'A one-eyed umbrella with one hopping leg, a very long tongue, and far too much confidence.',name:'Kasa',tag:'The one-legged hopping umbrella',color:'#b19cd9'},
];
export const WORLD = {minX:-21,maxX:21,minZ:-36,maxZ:21,start:{x:0,z:16},gate:{x:0,z:-30},duration:480};
export const STALLS = [
  {id:'apple',game:'shoot',x:-8,z:9,w:4.5,d:3.4,color:'#ba435a',name:'Cork Shooting'},
  {id:'fish',game:'fish',x:8,z:8,w:4.7,d:3.4,color:'#426c97',name:'Goldfish Scooping'},
  {id:'mask',game:'ring',x:-11,z:0,w:4.5,d:3.3,color:'#c9a24d',name:'Ring Toss'},
  {id:'tea',game:'cook',x:10,z:-4,w:4.7,d:3.4,color:'#bc6640',name:'Takoyaki'},
  {id:'wish',game:'fortune',x:-10,z:-13,w:4.4,d:3.5,color:'#b88683',name:'Lucky Draw'},
  {id:'sweet',game:'ice',x:11,z:-18,w:4.6,d:3.5,color:'#638fae',name:'Shaved Ice'},
];
export const stallEntrance=s=>({x:s.x,z:s.z+s.d/2+1});
export function nearbyStall(p){return STALLS.filter(s=>distance(p,stallEntrance(s))<2.35).sort((a,b)=>distance(p,stallEntrance(a))-distance(p,stallEntrance(b)))[0]||null;}
export const DECOR_COLLIDERS=[
  ...[16,11,5,-2,-9,-16,-24].flatMap(z=>[-1,1].map(s=>({x:s*4,z,w:.6,d:.6,height:1.9}))),
  ...[14,-7].flatMap(z=>[-3.7,3.7].flatMap(x=>[-1,1].map(dz=>({x,z:z+dz,w:.24,d:.24,height:4.8})))),
  ...[[11.5,7.3],[-22,6.2]].flatMap(([z,w])=>[-1,1].map(s=>({x:s*w*.43,z,w:.42,d:.42,height:4.4}))),
];
export const OBSTACLES = [
  ...DECOR_COLLIDERS,
  ...STALLS.map(s=>({x:s.x,z:s.z,w:s.w,d:s.d})),
  {x:7,z:-10,w:5,d:4},
  {x:-15,z:-23,w:3,d:3},
  {x:14,z:16,w:3,d:3},
  {x:-16,z:-9,w:4.5,d:5},
];
export const POTION_SPOTS = [
  [-3,14],[3,13],[-3,8],[4,4],[-5,0],[-7,-7],[1,-9],[-4,-15],[7,-16],[3,-23],[-4,-25],[-15,6],[14,1],[15,-12],[-14,-18],
].map(([x,z],i)=>({id:`p${i}`,x,z}));
export const HUMAN_SPOTS = [[-2,9],[3,6],[-5,3],[7,0],[-5,-7],[0,-12],[5,-18],[-8,-18],[0,12]];
export const distance = (a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function walkable(x,z,r=.36){
  if(!Number.isFinite(x)||!Number.isFinite(z)||x<WORLD.minX+r||x>WORLD.maxX-r||z<WORLD.minZ+r||z>WORLD.maxZ-r)return false;
  return !OBSTACLES.some(o=>Math.abs(x-o.x)<o.w/2+r&&Math.abs(z-o.z)<o.d/2+r);
}
export function movePoint(p,dx,dz){
  if(walkable(p.x+dx,p.z))p.x+=dx;
  if(walkable(p.x,p.z+dz))p.z+=dz;
}
export function groundHeight(x,z){const t=Math.max(0,Math.min(1,(-z-4)/30));return t*t*(3-2*t)*4.1+Math.sin(z*.19)*.06*Math.min(1,Math.abs(x)/8);}
export function findPath(start,end){
  const step=1.5, key=(x,z)=>`${x},${z}`;
  const toCell=p=>({x:Math.round((p.x-WORLD.minX)/step),z:Math.round((p.z-WORLD.minZ)/step)});
  const toPoint=p=>({x:WORLD.minX+p.x*step,z:WORLD.minZ+p.z*step});
  const a=toCell(start),b=toCell(end),q=[a],parents=new Map([[key(a.x,a.z),null]]);
  let found=null;
  for(let i=0;i<q.length&&i<1800;i++){
    const c=q[i];if(Math.abs(c.x-b.x)+Math.abs(c.z-b.z)<=1){found=c;break;}
    for(const [dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){
      const n={x:c.x+dx,z:c.z+dz},k=key(n.x,n.z),p=toPoint(n);
      if(!parents.has(k)&&walkable(p.x,p.z,.4)){parents.set(k,c);q.push(n);}
    }
  }
  if(!found)return[];
  const path=[];for(let c=found;c;c=parents.get(key(c.x,c.z)))path.push(toPoint(c));
  path.reverse();path.shift();if(walkable(end.x,end.z,.4))path.push({x:end.x,z:end.z});return path;
}
