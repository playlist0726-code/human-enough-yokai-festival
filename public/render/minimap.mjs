// HUD minimap: path, stalls, shrine, guests, potions, boss and crew.
import {STALLS} from '../../shared/world.mjs';

export function drawMinimap(c,state,myId){
  const ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);ctx.fillStyle='#cad0ad';ctx.fillRect(0,0,c.width,c.height);
  const x=v=>12+(v+21)/42*136,z=v=>8+(v+36)/57*164;
  ctx.fillStyle='#e7d6ae';ctx.fillRect(x(-3.6),8,x(3.6)-x(-3.6),164);
  ctx.fillStyle='#8b7064';for(const s of STALLS)ctx.fillRect(x(s.x-s.w/2),z(s.z-s.d/2),s.w/42*136,s.d/57*164);
  ctx.fillStyle='#8971a8';ctx.fillRect(x(-2),z(-31),14,7);
  for(const h of state.humans){if(h.state==='delivered')continue;ctx.fillStyle=h.owner?'#9b6dad':h.state==='waiting'?'#d79b46':'#f6eee1';ctx.beginPath();ctx.arc(x(h.x),z(h.z),2.5,0,7);ctx.fill();}
  for(const potion of state.potions)if(potion.available){ctx.fillStyle='#81749a';ctx.fillRect(x(potion.x)-1,z(potion.z)-1,2,2);}
  const encounter=state.encounter;if(encounter&&['omen','assault','exposed'].includes(encounter.phase)){ctx.fillStyle='#673d85';ctx.beginPath();ctx.arc(x(encounter.x),z(encounter.z),6,0,7);ctx.fill();for(const seal of encounter.seals)if(!seal.broken){ctx.fillStyle='#e9b75f';ctx.fillRect(x(seal.x)-2,z(seal.z)-2,4,4);}}
  for(const p of Object.values(state.players)){if(p.pingAt&&p.pingUntil>state.tick){ctx.strokeStyle='#f5bb43';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x(p.pingAt.x),z(p.pingAt.z),8+Math.sin(state.tick*6)*2,0,7);ctx.stroke();}ctx.fillStyle=p.id===myId?'#ac5443':'#426f89';ctx.strokeStyle='#fff4d9';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x(p.x),z(p.z),4,0,7);ctx.fill();ctx.stroke();}
}
