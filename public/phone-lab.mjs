const $=id=>document.getElementById(id);
let info=null,lastMetrics=null,history=[],landscape=false;
const params=new URLSearchParams(location.search);$('room').value=(params.get('room')||'').toUpperCase().replace(/[^A-Z2-9]/g,'').slice(0,5);
async function refresh(){
  try{
    const response=await fetch('/api/playtest',{cache:'no-store'});if(!response.ok)throw Error();info=await response.json();const old=$('network').value;
    $('network').replaceChildren(...info.urls.map(u=>new Option(new URL(u).host,u)));if(info.urls.includes(old))$('network').value=old;
    $('network-state').textContent=info.lan&&info.urls.length?'Local network is open. Scan below on your phone.':'Local-only mode. Start the game with “npm run dev:lan”, then refresh.';
    if(info.public){
      $('lab-mode').textContent='PLAY TOGETHER';$('invite-mode').textContent='01 / ANY DEVICE';
      $('invite-explainer').textContent='Share this link with friends anywhere. Open it on a phone, tablet or computer, choose a different yokai, and join the same room.';
      $('network-state').textContent='The festival is online. No shared Wi-Fi or account is needed.';
      $('connection-help').innerHTML='<summary>Phone cannot connect?</summary><p>Open the game link in a browser with WebGL support. If the server is waking up, allow a moment and try again. Ask the host for a new room code if the previous night has already started.</p>';
    }
    updateInvite();
  }catch{$('network-state').textContent='Game server is unavailable. Restart it on the Mac, then refresh.';}
}
function updateInvite(){
  const base=$('network').value,room=$('room').value.toUpperCase();$('room').value=room.replace(/[^A-Z2-9]/g,'').slice(0,5);
  if(!base){$('qr').hidden=true;$('qr-empty').hidden=false;$('copy').disabled=true;$('invite').removeAttribute('href');$('invite').textContent='No local network address available.';return;}
  const url=new URL('/',base);url.searchParams.set('touch','1');url.searchParams.set('test','1');if(/^[A-Z2-9]{5}$/.test(room))url.searchParams.set('room',room);
  $('invite').href=url.href;$('invite').textContent=url.href;$('qr').src=`/api/playtest/qr?address=${encodeURIComponent(new URL(base).hostname)}&room=${encodeURIComponent(room)}`;$('qr').hidden=false;$('qr-empty').hidden=true;$('copy').disabled=false;
}
$('qr').onerror=()=>{$('qr').hidden=true;$('qr-empty').hidden=false;$('qr-empty').textContent='QR unavailable. Use the phone link below.';};
$('network').onchange=updateInvite;$('room').oninput=updateInvite;$('refresh').onclick=refresh;
$('copy').onclick=async()=>{try{await navigator.clipboard.writeText($('invite').href);$('network-state').textContent='Phone link copied.';}catch{$('network-state').textContent='Long-press or select the phone link to copy it.';}};
function fit(){
  let [w,h]=$('device').value.split(',').map(Number);if(landscape)[w,h]=[h,w];const space=$('preview-space'),scale=Math.min(1,(space.clientWidth-28)/(w+12),(space.clientHeight-28)/(h+12));
  $('preview').width=w;$('preview').height=h;$('device-frame').style.transform=`scale(${scale})`;$('size-label').textContent=`${w} × ${h}`;
}
$('device').onchange=fit;$('rotate').onclick=()=>{landscape=!landscape;fit();};new ResizeObserver(fit).observe($('preview-space'));
window.addEventListener('message',event=>{
  if(event.origin!==location.origin||event.source!==$('preview').contentWindow||event.data?.type!=='eve-playtest')return;
  lastMetrics=event.data.metrics;$('preview').dataset.metrics=JSON.stringify(lastMetrics);history.push(lastMetrics);if(history.length>120)history.shift();
  const layout=lastMetrics.layout;if(layout){const small=layout.targets.filter(t=>t.width<44||t.height<44),outside=layout.targets.filter(t=>t.x<0||t.y<0||t.x+t.width>lastMetrics.viewport.width||t.y+t.height>lastMetrics.viewport.height);$('layout-state').textContent=layout.overflow||small.length||outside.length?`Layout: ${small.length} small targets · ${outside.length} off-screen controls${layout.overflow?' · horizontal overflow':''}`:layout.targets.length?'Layout: touch controls fit the screen, with targets at least 44 px.':'Layout: choose a character and enter the festival to check the controls.';}
  $('fps').textContent=lastMetrics.fps?`${lastMetrics.fps} · ${lastMetrics.profile}`:'—';$('connection').textContent=lastMetrics.connection||'Not joined';$('ping').textContent=lastMetrics.rtt===null?'—':`${lastMetrics.rtt} ms`;$('models').textContent=`${lastMetrics.modelsLoaded} ready${lastMetrics.modelsFailed?` / ${lastMetrics.modelsFailed} failed`:''}`;
});
$('report').onclick=()=>{
  const report={version:'eve-phone-playtest-v1',time:new Date().toISOString(),environment:'Mac browser responsive preview; not a physical phone measurement',screen:$('size-label').textContent,checks:[...document.querySelectorAll('.checks label')].map(label=>({test:label.textContent.trim(),passed:label.querySelector('input').checked})),notes:$('notes').value,metrics:lastMetrics,samples:history};
  const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=`eve-playtest-${Date.now()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);$('save-state').textContent='Test report saved. Attach it to our chat when you want me to fix what you found.';
};
refresh();fit();
