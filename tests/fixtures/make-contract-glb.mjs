// Builds a tiny GLB that satisfies ASSET_CONTRACT v1 (player/disguise profile): one skinned box,
// the 16 humanoid bones, sockets, every player clip and a face_blink morph. No dependencies.
// Options let tests break one rule at a time. Run directly to rewrite tests/fixtures/minimal_player.glb.
import {deflateSync} from 'node:zlib';
import {writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

export const BONES=['Hips','Spine','Neck','Head','LeftArm','LeftForeArm','LeftHand','RightArm','RightForeArm','RightHand','LeftUpLeg','LeftLeg','LeftFoot','RightUpLeg','RightLeg','RightFoot'];
const PARENT={Spine:'Hips',Neck:'Spine',Head:'Neck',LeftArm:'Spine',LeftForeArm:'LeftArm',LeftHand:'LeftForeArm',RightArm:'Spine',RightForeArm:'RightArm',RightHand:'RightForeArm',LeftUpLeg:'Hips',LeftLeg:'LeftUpLeg',LeftFoot:'LeftLeg',RightUpLeg:'Hips',RightLeg:'RightUpLeg',RightFoot:'RightLeg'};
const OFFSET={Hips:[0,.9,0],Spine:[0,.2,0],Neck:[0,.35,0],Head:[0,.1,0],LeftArm:[.2,.3,0],LeftForeArm:[.25,0,0],LeftHand:[.2,0,0],RightArm:[-.2,.3,0],RightForeArm:[-.25,0,0],RightHand:[-.2,0,0],LeftUpLeg:[.1,-.05,0],LeftLeg:[0,-.4,0],LeftFoot:[0,-.4,0],RightUpLeg:[-.1,-.05,0],RightLeg:[0,-.4,0],RightFoot:[0,-.4,0]};
export const SOCKET_PARENT={socket_hand_R:'RightHand',socket_hip_L:'Hips',socket_head_top:'Head',socket_reveal:'Hips'};
export const CLIPS=['idle','walk','run','jump_start','jump_air','land','drink_potion','charm_cast','charm_hold','cover_ward','reveal_panic','hit','sealed','victory'];
const UPPER=new Set(['drink_potion','charm_cast','charm_hold','cover_ward']);

function png(size=4){
  const crcTable=Array.from({length:256},(_,n)=>{let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
  const crc=b=>{let c=0xffffffff;for(const x of b)c=crcTable[(c^x)&255]^(c>>>8);return (c^0xffffffff)>>>0;};
  const chunk=(type,data)=>{const len=Buffer.alloc(4);len.writeUInt32BE(data.length);const td=Buffer.concat([Buffer.from(type),data]);const c=Buffer.alloc(4);c.writeUInt32BE(crc(td));return Buffer.concat([len,td,c]);};
  const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(size,0);ihdr.writeUInt32BE(size,4);ihdr[8]=8;ihdr[9]=6;
  const raw=Buffer.alloc((size*4+1)*size);for(let y=0;y<size;y++){raw[y*(size*4+1)]=0;for(let x=0;x<size;x++){const o=y*(size*4+1)+1+x*4;raw[o]=200;raw[o+1]=120+x*20;raw[o+2]=80+y*30;raw[o+3]=255;}}
  return Buffer.concat([Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]),chunk('IHDR',ihdr),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
}

/**
 * @param {{omitBones?: string[], omitClips?: string[], omitSockets?: string[], texture?: boolean, boneNamePrefix?: string}} o
 * @returns {Buffer}
 */
export function makeContractGlb({omitBones=[],omitClips=[],omitSockets=[],texture=true,boneNamePrefix=''}={}){
  const bin=[];let byteLength=0;const bufferViews=[],accessors=[];
  function add(typed,{type,componentType,target,minmax=false,count}){
    const bytes=Buffer.from(typed.buffer,typed.byteOffset,typed.byteLength),pad=(4-byteLength%4)%4;
    if(pad){bin.push(Buffer.alloc(pad));byteLength+=pad;}
    bufferViews.push({buffer:0,byteOffset:byteLength,byteLength:bytes.length,...(target?{target}:{})});bin.push(bytes);byteLength+=bytes.length;
    const comps={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16}[type],acc={bufferView:bufferViews.length-1,componentType,count:count??typed.length/comps,type};
    if(minmax){const min=Array(comps).fill(Infinity),max=Array(comps).fill(-Infinity);for(let i=0;i<acc.count;i++)for(let c=0;c<comps;c++){min[c]=Math.min(min[c],typed[i*comps+c]);max[c]=Math.max(max[c],typed[i*comps+c]);}acc.min=min;acc.max=max;}
    accessors.push(acc);return accessors.length-1;
  }
  // box from y=0 to y=1.4 (feet on the ground)
  const P=[],N=[],UV=[],IDX=[];
  const faces=[[[1,0,0],[0,1,0],[0,0,1]],[[-1,0,0],[0,1,0],[0,0,-1]],[[0,1,0],[0,0,1],[1,0,0]],[[0,-1,0],[0,0,-1],[1,0,0]],[[0,0,1],[1,0,0],[0,1,0]],[[0,0,-1],[-1,0,0],[0,1,0]]];
  for(const [n,u,v] of faces){const base=P.length/3;for(const [a,b] of [[-1,-1],[1,-1],[1,1],[-1,1]]){const p=[0,1,2].map(i=>n[i]*.3+u[i]*a*.3+v[i]*b*.3);P.push(p[0],p[1]*(1.4/.6)+.7,p[2]);N.push(...n);UV.push((a+1)/2,(b+1)/2);}IDX.push(base,base+1,base+2,base,base+2,base+3);}
  const vertexCount=P.length/3;
  const pos=add(new Float32Array(P),{type:'VEC3',componentType:5126,target:34962,minmax:true});
  const nor=add(new Float32Array(N),{type:'VEC3',componentType:5126,target:34962});
  const uv=add(new Float32Array(UV),{type:'VEC2',componentType:5126,target:34962});
  const joints=add(new Uint16Array(vertexCount*4),{type:'VEC4',componentType:5123,target:34962});
  const weights=add(new Float32Array(Array.from({length:vertexCount},()=>[1,0,0,0]).flat()),{type:'VEC4',componentType:5126,target:34962});
  const blink=add(new Float32Array(Array.from({length:vertexCount},(_,i)=>[0,P[i*3+1]>1.2?-.02:0,0]).flat()),{type:'VEC3',componentType:5126,target:34962,minmax:true});
  const ind=add(new Uint16Array(IDX),{type:'SCALAR',componentType:5123,target:34963});
  const bones=BONES.filter(b=>!omitBones.includes(b));
  const nodes=[{name:'Armature',children:[]},{name:'body',mesh:0,skin:0}];
  const index=new Map();
  for(const b of bones){index.set(b,nodes.length);nodes.push({name:boneNamePrefix+b,translation:OFFSET[b]});}
  for(const b of bones){const parent=PARENT[b]&&index.get(PARENT[b]);if(parent!==undefined){(nodes[parent].children||=[]).push(index.get(b));}else nodes[0].children.push(index.get(b));}
  for(const [socket,parentBone] of Object.entries(SOCKET_PARENT)){if(omitSockets.includes(socket)||!index.has(parentBone))continue;const i=nodes.length;nodes.push({name:socket});(nodes[index.get(parentBone)].children||=[]).push(i);}
  nodes[0].children.push(1);
  // inverse bind matrices from accumulated bone translations
  const world=new Map();const worldOf=b=>{if(world.has(b))return world.get(b);const o=OFFSET[b],p=PARENT[b]&&index.has(PARENT[b])?worldOf(PARENT[b]):[0,0,0];const w=[p[0]+o[0],p[1]+o[1],p[2]+o[2]];world.set(b,w);return w;};
  const ibm=new Float32Array(bones.length*16);bones.forEach((b,i)=>{const w=worldOf(b);ibm.set([1,0,0,0,0,1,0,0,0,0,1,0,-w[0],-w[1],-w[2],1],i*16);});
  const ibmAcc=add(ibm,{type:'MAT4',componentType:5126});
  const times=add(new Float32Array([0,.5,1]),{type:'SCALAR',componentType:5126,minmax:true});
  const s=Math.sin(.15),c=Math.cos(.15);
  const rot=add(new Float32Array([0,0,0,1,s,0,0,c,0,0,0,1]),{type:'VEC4',componentType:5126});
  const animations=CLIPS.filter(n=>!omitClips.includes(n)).map(name=>{
    const bone=UPPER.has(name)?'RightArm':'Hips';
    if(!index.has(bone))return null;
    return {name,samplers:[{input:times,output:rot,interpolation:'LINEAR'}],channels:[{sampler:0,target:{node:index.get(bone),path:'rotation'}}]};
  }).filter(Boolean);
  const gltf={
    asset:{version:'2.0',generator:'human-enough contract fixture'},scene:0,scenes:[{name:'Scene',nodes:[0]}],nodes,
    meshes:[{name:'body',primitives:[{attributes:{POSITION:pos,NORMAL:nor,TEXCOORD_0:uv,JOINTS_0:joints,WEIGHTS_0:weights},indices:ind,material:0,targets:[{POSITION:blink}]}],weights:[0],extras:{targetNames:['face_blink']}}],
    skins:[{name:'Armature',joints:bones.map(b=>index.get(b)),inverseBindMatrices:ibmAcc,skeleton:index.get('Hips')}],
    materials:[{name:'body',pbrMetallicRoughness:{baseColorFactor:[1,1,1,1],metallicFactor:0,roughnessFactor:.8,...(texture?{baseColorTexture:{index:0}}:{})}}],
    animations,accessors,bufferViews,buffers:[]
  };
  if(texture){const image=png(),pad=(4-byteLength%4)%4;if(pad){bin.push(Buffer.alloc(pad));byteLength+=pad;}bufferViews.push({buffer:0,byteOffset:byteLength,byteLength:image.length});bin.push(image);byteLength+=image.length;
    gltf.images=[{name:'body_baseColor',mimeType:'image/png',bufferView:bufferViews.length-1}];gltf.textures=[{source:0,sampler:0}];gltf.samplers=[{magFilter:9729,minFilter:9987}];}
  const binBuf=Buffer.concat(bin),binPadded=Buffer.concat([binBuf,Buffer.alloc((4-binBuf.length%4)%4)]);
  gltf.buffers=[{byteLength:binPadded.length}];
  let json=Buffer.from(JSON.stringify(gltf));json=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,0x20)]);
  const header=Buffer.alloc(12);header.writeUInt32LE(0x46546c67,0);header.writeUInt32LE(2,4);header.writeUInt32LE(12+8+json.length+8+binPadded.length,8);
  const jh=Buffer.alloc(8);jh.writeUInt32LE(json.length,0);jh.writeUInt32LE(0x4e4f534a,4);
  const bh=Buffer.alloc(8);bh.writeUInt32LE(binPadded.length,0);bh.writeUInt32LE(0x004e4942,4);
  return Buffer.concat([header,jh,json,bh,binPadded]);
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
  const out=new URL('./minimal_player.glb',import.meta.url);writeFileSync(out,makeContractGlb());console.log('wrote',fileURLToPath(out));
}
