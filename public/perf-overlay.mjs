// Performance overlay, enabled with ?perf=1.
// Shows FPS (with 1% low), draw calls, triangles, geometries, textures, an estimate of GPU memory
// and the active quality profile. The latest numbers are also exposed as window.__PERF__ so
// capture scripts can record them.

/** Average FPS and 1% low (FPS of the slowest 1% of frames) from frame times in seconds. */
export function frameStats(times){
  if(!times.length)return {fps:0,low1:0,frames:0};
  const total=times.reduce((a,b)=>a+b,0),sorted=[...times].sort((a,b)=>b-a),worst=sorted.slice(0,Math.max(1,Math.ceil(times.length*.01)));
  return {fps:times.length/total,low1:worst.length/worst.reduce((a,b)=>a+b,0),frames:times.length};
}

const BYTES={1009:1,1010:1,1011:2,1012:2,1013:4,1014:4,1015:4,1016:2};
/** Rough GPU memory estimate (bytes) for geometry buffers and textures reachable from the scene. */
export function estimateGpuMemory(scene){
  const geometries=new Set(),textures=new Set();
  scene.traverse(o=>{
    if(o.geometry)geometries.add(o.geometry);
    const mats=o.material?(Array.isArray(o.material)?o.material:[o.material]):[];
    for(const m of mats)for(const value of Object.values(m)){if(value?.isTexture)textures.add(value);}
    for(const m of mats)for(const u of Object.values(m.uniforms||{}))if(u?.value?.isTexture)textures.add(u.value);
  });
  if(scene.environment?.isTexture)textures.add(scene.environment);
  let geometry=0,texture=0;
  for(const g of geometries){for(const a of Object.values(g.attributes))geometry+=a.array?.byteLength||0;geometry+=g.index?.array?.byteLength||0;}
  for(const t of textures){
    const img=t.image,w=img?.width||img?.data?.width||0,h=img?.height||img?.data?.height||0;
    if(t.isCompressedTexture&&t.mipmaps?.length){for(const m of t.mipmaps)texture+=m.data?.byteLength||0;continue;}
    const channels=4,bpc=BYTES[t.type]||1,mip=t.generateMipmaps!==false&&t.minFilter!==1006&&t.minFilter!==1003?4/3:1;
    texture+=w*h*channels*bpc*mip*(t.isCubeTexture?6:1);
  }
  return {geometry,texture,total:geometry+texture};
}

const mb=bytes=>`${(bytes/1048576).toFixed(1)} MB`;

/**
 * @param {{renderer: THREE.WebGLRenderer, scene: THREE.Scene, getProfile: () => string, enabled?: boolean}} o
 * Call frame(realDt) once per rendered frame, after rendering.
 */
export function installPerfOverlay({renderer,scene,getProfile,enabled=new URLSearchParams(globalThis.location?.search||'').get('perf')==='1',seconds=5}){
  if(!enabled)return {enabled:false,frame(){},snapshot:()=>null};
  const el=document.createElement('pre');el.id='perf-overlay';el.setAttribute('aria-hidden','true');
  Object.assign(el.style,{position:'fixed',left:'8px',bottom:'8px',zIndex:'9999',margin:'0',padding:'8px 10px',font:'12px/1.35 ui-monospace,Menlo,Consolas,monospace',color:'#e8f2ff',background:'rgba(8,12,24,.78)',borderRadius:'6px',pointerEvents:'none',whiteSpace:'pre'});
  document.body.append(el);
  const times=[];let span=0,sinceText=0,memory=null,sinceMemory=Infinity,last=null;
  return {
    enabled:true,
    frame(realDt){
      if(!(realDt>0)||realDt>=1)return;
      times.push(realDt);span+=realDt;while(span>seconds&&times.length>1)span-=times.shift();
      sinceText+=realDt;sinceMemory+=realDt;
      if(sinceMemory>2){memory=estimateGpuMemory(scene);sinceMemory=0;}
      if(sinceText<.5)return;sinceText=0;
      const s=frameStats(times),r=renderer.info.render,m=renderer.info.memory;
      last={fps:Math.round(s.fps),low1:Math.round(s.low1),drawCalls:r.calls,triangles:r.triangles,geometries:m.geometries,textures:m.textures,gpuMemoryMB:memory?+(memory.total/1048576).toFixed(1):null,profile:getProfile(),pixelRatio:renderer.getPixelRatio()};
      globalThis.__PERF__=last;
      el.textContent=`FPS ${last.fps}  1% low ${last.low1}\ndraw calls ${last.drawCalls}\ntriangles ${last.triangles.toLocaleString('en-US')}\ngeometries ${last.geometries}  textures ${last.textures}\nGPU mem ~${memory?mb(memory.total):'…'} (tex ${memory?mb(memory.texture):'…'})\nprofile ${last.profile} @${last.pixelRatio}x`;
    },
    snapshot:()=>last
  };
}
