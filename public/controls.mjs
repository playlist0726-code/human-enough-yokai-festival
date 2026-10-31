const physical={Space:'jump',KeyE:'interact',KeyQ:'drink',KeyF:'charm',KeyC:'cover',KeyR:'share',KeyT:'handoff',KeyG:'ping',KeyJ:'strike',KeyW:'up',KeyA:'left',KeyS:'down',KeyD:'right',ArrowUp:'up',ArrowLeft:'left',ArrowDown:'down',ArrowRight:'right',Escape:'close'};
const fallback={' ':'jump',e:'interact',q:'drink',f:'charm',c:'cover',r:'share',t:'handoff',g:'ping',j:'strike',w:'up',a:'left',s:'down',d:'right',arrowup:'up',arrowleft:'left',arrowdown:'down',arrowright:'right',escape:'close','ㄷ':'interact','ㅂ':'drink','ㄹ':'charm','ㅊ':'cover','ㄱ':'share','ㅅ':'handoff','ㅎ':'ping','ㅓ':'strike','ㅈ':'up','ㅁ':'left','ㄴ':'down','ㅇ':'right'};
export function keyIntent(event){
  if(event.metaKey||event.ctrlKey||event.altKey)return null;
  return physical[event.code]||fallback[String(event.key||'').toLowerCase()]||null;
}
export const MOVEMENT=new Set(['up','left','down','right']);
export function viewMovement(dx,dz,yaw){const c=Math.cos(yaw),s=Math.sin(yaw);return {dx:dx*c+dz*s,dz:dz*c-dx*s};}
