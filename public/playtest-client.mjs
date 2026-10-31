export function installPlaytest({getMetrics,onStop,canvas}){
  const query=new URLSearchParams(location.search),enabled=query.get('test')==='1',lab=query.get('lab')==='1';
  const diagnostics=document.createElement('aside');diagnostics.className='playtest-badge';diagnostics.hidden=!enabled;diagnostics.setAttribute('aria-label','Local device test');
  const label=document.createElement('b'),details=document.createElement('span'),save=document.createElement('button');save.textContent='Save test';save.type='button';diagnostics.append(label,details,save);document.body.append(diagnostics);
  let samples=[];
  const snapshot=()=>({...getMetrics(),viewport:{width:innerWidth,height:innerHeight,ratio:devicePixelRatio},touch:document.body.classList.contains('touch-mode'),layout:{overflow:document.documentElement.scrollWidth>innerWidth,targets:[...document.querySelectorAll('#joystick,.touch-actions button,.view-controls button')].filter(el=>el.getClientRects().length).map(el=>{const r=el.getBoundingClientRect();return {name:el.getAttribute('aria-label')||el.textContent.trim(),x:Math.round(r.x),y:Math.round(r.y),width:Math.round(r.width),height:Math.round(r.height)};})},webglLost:canvas.dataset.context==='lost',time:new Date().toISOString()});
  const sample=()=>{
    if(document.hidden)return;const metrics=snapshot();canvas.dataset.playtest=JSON.stringify(metrics);
    if(!enabled)return;samples.push(metrics);if(samples.length>120)samples.shift();
    label.textContent=`${metrics.fps||'—'} FPS · ${metrics.profile}`;details.textContent=`${metrics.connection} · ${metrics.rtt===null?'—':metrics.rtt+' ms'} · ${innerWidth} × ${innerHeight}`;
    if(lab&&window.parent!==window)window.parent.postMessage({type:'eve-playtest',metrics},location.origin);
  };
  let timer=setInterval(sample,2000);
  save.onclick=()=>{
    const notes=prompt('Device / browser and what felt wrong (optional):','')??'';
    const report={version:'eve-phone-playtest-v1',environment:lab?'Responsive browser preview':'Device browser',userAgent:navigator.userAgent,notes,metrics:snapshot(),samples};
    const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=`eve-phone-test-${Date.now()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();onStop();canvas.dataset.context='lost';label.textContent='3D view interrupted';details.textContent='Reload this page to restore the festival.';diagnostics.hidden=false;});
  canvas.addEventListener('webglcontextrestored',()=>{canvas.dataset.context='restored';location.reload();});
  window.addEventListener('pagehide',()=>clearInterval(timer));window.addEventListener('pageshow',e=>{if(e.persisted){clearInterval(timer);timer=setInterval(sample,2000);}});
}
