// R10 event -> effect table. One entry per event-bus type (public/events.mjs). Each entry names:
//   tier  : small | medium | large | none   (how loud the feedback is; drives shake/flash budgets)
//   cue   : sound cue name for R13 (public/audio). Same names appear in docs/production/VFX_LIST.md.
//   run(ctx, e) : spawns particles / meshes / camera feel. Pure visual: never touches game state.
// ctx: {glow, smoke, meshes, feel, budget, n(count), color(playerId), player(id), guest(id), boss(), spawn(controller)}
import {GLOW} from './particles.mjs';

export const TIERS={none:{shake:0,flash:0},small:{shake:0,flash:0},medium:{shake:.22,flash:.12},large:{shake:.55,flash:.3}};
const R=Math.random,TAU=Math.PI*2;
const lerp=(a,b,t)=>a+(b-a)*t;

// ---- building blocks -----------------------------------------------------------------------------
function sparkBurst(ctx,p,{count=16,color='#ffe2a6',speed=3,up=1,size=.3,life=.7,gravity=3,frame=GLOW.sparkle,intensity=2.4,spread=1}){
  for(let i=0,n=ctx.n(count);i<n;i++){const a=R()*TAU,e=(R()*1.2-.2)*spread,s=speed*(.5+R()*.7);
    ctx.glow.emit({x:p.x,y:p.y,z:p.z,vx:Math.cos(a)*Math.cos(e)*s,vy:Math.sin(e)*s+up,vz:Math.sin(a)*Math.cos(e)*s,drag:2.6,gravity,life:life*(.7+R()*.6),
      size,sizeEnd:size*.2,color:Array.isArray(color)?color[i%color.length]:color,intensity,alpha:1,alphaEnd:0,frame,fadeIn:0,spin:(R()-.5)*5});}
}
function dot(ctx,p,{color='#fff1d6',size=.7,sizeEnd=2.3,life=.25,intensity=1.6,frame=GLOW.dot}){ctx.glow.emit({x:p.x,y:p.y,z:p.z,life,size,sizeEnd,color,intensity,alpha:1,alphaEnd:0,frame,fadeIn:0});}
function puff(ctx,p,{count=6,color='#f7f2ff',shade='#8c7fc4',size=.35,sizeEnd=.9,speed=1.4,life=.9,up=.4,radius=.2}){
  for(let i=0,n=ctx.n(count);i<n;i++){const a=i/n*TAU+R()*.5;
    ctx.smoke.emit({x:p.x+Math.cos(a)*radius,y:p.y,z:p.z+Math.sin(a)*radius,vx:Math.cos(a)*speed,vy:up+R()*.3,vz:Math.sin(a)*speed,drag:3,life:life*(.8+R()*.4),
      size,sizeEnd,color,shade,alpha:1,alphaEnd:1,fadeIn:0,spin:(R()-.5)*1.5});}
}
function dustRing(ctx,p,{count=7,size=.18,sizeEnd=.5,speed=1.6,life=.55}){puff(ctx,{x:p.x,y:p.y+.08,z:p.z},{count,color:'#d9c8a6',shade:'#7d6a52',size,sizeEnd,speed,life,up:.15,radius:.25});}
function swirl(ctx,p,{count=24,colors=['#c9b6ff'],radius=.9,height=0,vy=1.6,w=6,vr=-.5,life=1,size=.24,intensity=2.4,frame=GLOW.dot}){
  for(let i=0,n=ctx.n(count);i<n;i++)ctx.glow.emit({x:p.x,y:p.y+height+R()*.3,z:p.z,vy:vy*(.7+R()*.6),life:life*(.8+R()*.4),size,sizeEnd:size*.3,color:colors[i%colors.length],intensity,alpha:1,alphaEnd:0,frame,
    delay:i/n*.35,fadeIn:.15,swirl:{cx:p.x,cz:p.z,angle:i/n*TAU*2,radius:radius*(.8+R()*.4),w,vr}});
}
const chest=p=>p&&{x:p.x,y:p.y+1.3,z:p.z},head=p=>p&&{x:p.x,y:p.y+2.5,z:p.z};

// ---- controllers (effects that move over time) -----------------------------------------------------
/** Charm ribbon: a helix of pink/violet light travels from the caster's hands to the guest, then hearts pop. */
function charmRibbon(ctx,e){
  const from=chest(e.position),guest=ctx.guest(e.guestId);if(!from)return;let t=0,acc=0,popped=false;
  ctx.spawn(dt=>{
    t+=dt;const k=Math.min(1,t/.6),to=guest?{x:guest.x,y:guest.y+1.8,z:guest.z}:{x:from.x,y:from.y+1,z:from.z};
    acc+=dt*150*ctx.budget();
    const arc=u=>({x:lerp(from.x,to.x,u),y:lerp(from.y,to.y,u)+Math.sin(u*Math.PI)*.9,z:lerp(from.z,to.z,u)});
    if(k<1){const h=arc(k);ctx.glow.emit({x:h.x,y:h.y,z:h.z,life:.14,size:.7,sizeEnd:.5,color:'#ffb3e6',intensity:2.4,alpha:1,alphaEnd:0,frame:GLOW.dot,fadeIn:0});}
    while(acc>=1&&k<1){acc--;const u=Math.max(0,k-R()*.08),a=u*TAU*3+t*9,r=.42*(1-u*.5),h=arc(u);
      ctx.glow.emit({x:h.x+Math.cos(a)*r,y:h.y+Math.sin(a)*r,z:h.z+Math.sin(a*.7)*r,vy:.25,life:.6,size:.32,sizeEnd:.05,color:R()<.5?'#ff8fd0':'#c48cff',intensity:2.6,alpha:1,alphaEnd:0,frame:R()<.2?GLOW.sparkle:GLOW.dot,fadeIn:0,spin:3});}
    if(k>=1&&!popped){popped=true;
      for(let i=0,n=ctx.n(8);i<n;i++){const a=i/n*TAU;ctx.glow.emit({x:to.x+Math.cos(a)*.35,y:to.y+.4,z:to.z+Math.sin(a)*.35,vx:Math.cos(a)*1,vy:1.6+R()*.8,vz:Math.sin(a)*1,drag:1.5,gravity:.7,life:1.3,size:.55,sizeEnd:.35,color:'#ff7ab0',intensity:2,alpha:1,alphaEnd:0,frame:GLOW.heart,fadeIn:0,rot:0,spin:(R()-.5)*1.5});}
      ctx.meshes.ring({x:to.x,y:to.y-1.8,z:to.z},{color:'#ff8fd0',from:.3,to:1.9,life:.6,intensity:2.2,width:.2});dot(ctx,to,{color:'#ffb3e6',size:.8,sizeEnd:2.4,life:.25});
      return false;}
    return t<1;
  });
}
/** Spirit bolt: a blue flame streaks from the shooter to the Demon King's crystal with a trail. */
function spiritBolt(ctx,e){
  const from=chest(e.position),boss=ctx.boss();if(!from||!boss)return;const to={x:boss.x,y:boss.y+2.4,z:boss.z};let t=0;const dur=.28,big=e.combo;
  ctx.spawn(dt=>{
    t+=dt;const k=Math.min(1,t/dur),x=lerp(from.x,to.x,k),y=lerp(from.y,to.y,k)+Math.sin(k*Math.PI)*.6,z=lerp(from.z,to.z,k);
    ctx.glow.emit({x,y,z,life:.1,size:big?1.1:.8,sizeEnd:.6,color:'#cfdcff',intensity:2.6,alpha:1,alphaEnd:0,frame:GLOW.dot,fadeIn:0});
    for(let i=0,n=ctx.n(7);i<n;i++)ctx.glow.emit({x:x+(R()-.5)*.15,y:y+(R()-.5)*.15,z:z+(R()-.5)*.15,life:.45,size:big?.6:.45,sizeEnd:.06,color:R()<.6?'#8fb0ff':'#e4dbff',intensity:3,alpha:1,alphaEnd:0,frame:GLOW.dot,fadeIn:0});
    if(k>=1){sparkBurst(ctx,to,{count:big?28:16,color:['#8fb0ff','#e4dbff','#ffffff'],speed:big?5:3.5,size:big?.32:.24,gravity:1.5});dot(ctx,to,{color:'#cfdcff',size:.8,sizeEnd:big?3:2});ctx.feel.shake(big?.3:.12);return false;}
    return true;
  });
}

// ---- the table -----------------------------------------------------------------------------------------
export const FX_MAP={
  potion_pickup:{tier:'small',cue:'potion_pickup',run(ctx,e){const p=e.position,c=ctx.color(e.playerId),b={x:p.x,y:p.y+.7,z:p.z};sparkBurst(ctx,b,{count:20,color:[c,'#ffffff','#e4dbff'],speed:2.6,up:2.4,size:.32});dot(ctx,b,{color:c,size:.6,sizeEnd:2,life:.3,intensity:2});
    for(let i=0,n=ctx.n(8);i<n;i++)ctx.glow.emit({x:b.x,y:b.y,z:b.z,vy:2.2+R(),life:.8,size:.3,sizeEnd:.1,color:c,intensity:2.6,alpha:1,alphaEnd:0,frame:GLOW.dot,delay:i*.03,swirl:{cx:b.x,cz:b.z,angle:i/n*TAU,radius:.3,w:8,vr:.3}});
    ctx.meshes.ring(p,{color:c,from:.2,to:1.4,life:.5});}},
  potion_drink:{tier:'small',cue:'potion_drink',run(ctx,e){const p=e.position,c=ctx.color(e.playerId);
    dot(ctx,{x:p.x,y:p.y+1.5,z:p.z},{color:c,size:.5,sizeEnd:1.6,life:.35,intensity:2});
    swirl(ctx,p,{count:44,colors:[c,'#e4dbff','#ffffff'],radius:.95,height:.15,vy:2.1,w:6,vr:-.35,life:1.25,size:.42,intensity:3.2});
    for(let i=0,n=ctx.n(10);i<n;i++)ctx.glow.emit({x:p.x+(R()-.5)*.5,y:p.y+.3,z:p.z+(R()-.5)*.5,vy:2.8+R()*1.5,drag:.6,life:1,size:.36,sizeEnd:.08,color:c,intensity:3,alpha:1,alphaEnd:0,frame:GLOW.sparkle,delay:.15+R()*.4,spin:2});
    ctx.meshes.ring(p,{color:c,from:.4,to:1.6,life:.6,width:.22});ctx.meshes.ring(p,{color:'#ffffff',from:.3,to:1.2,life:.5,delay:.2,intensity:1.4});if(e.local)ctx.feel.pulse('#energy-fill',c);}},
  charm_cast:{tier:'medium',cue:'charm_cast',shake:0,run(ctx,e){swirl(ctx,e.position,{count:12,colors:['#ff8fd0','#c48cff'],radius:.55,height:1,vy:.8,w:9,life:.6,size:.24});charmRibbon(ctx,e);}},
  charm_end:{tier:'small',cue:'charm_end',run(ctx,e){const p=e.position;if(e.reason==='expired'){puff(ctx,{x:p.x,y:p.y+1.9,z:p.z},{count:3,size:.25,sizeEnd:.55,speed:.6,life:.7,shade:'#a08fb8'});ctx.glow.emit({x:p.x,y:p.y+2.3,z:p.z,vy:-.4,life:.9,size:.3,sizeEnd:.2,color:'#b8a8c8',intensity:1.2,alpha:.9,alphaEnd:0,frame:GLOW.heart,rot:0,fadeIn:0});}
    else if(e.reason==='transferred')sparkBurst(ctx,{x:p.x,y:p.y+1.6,z:p.z},{count:8,color:'#ffd79a',speed:1.4,size:.18});}},
  cover_ward:{tier:'medium',cue:'cover_ward',shake:0,run(ctx,e){const p=e.position,id=e.playerId;
    ctx.meshes.dome(p,{radius:3.2,life:2.2,getCenter:()=>{const pl=ctx.player(id);return pl?{x:pl.x,y:pl.y,z:pl.z}:null;}});ctx.meshes.ring(p,{color:'#ffcf6b',from:.6,to:3.3,life:.5,intensity:2});
    for(let i=0,n=ctx.n(10);i<n;i++)ctx.glow.emit({x:p.x,y:p.y+.6+(i%3)*.5,z:p.z,vy:.15,life:1.9,size:.3,sizeEnd:.22,color:'#ffd79a',intensity:2.2,alpha:1,alphaEnd:0,frame:GLOW.sparkle,rot:0,delay:i*.04,swirl:{cx:p.x,cz:p.z,angle:i/n*TAU,radius:2.4,w:1.8,vr:.15}});}},
  reveal_start:{tier:'medium',cue:'reveal_pop',run(ctx,e){const h=head(e.position);puff(ctx,h,{count:8,size:.4,sizeEnd:1.05,speed:2.6,life:.85});sparkBurst(ctx,h,{count:16,color:['#ffe2a6','#ffffff','#ff9fc8'],speed:4.2,size:.42});dot(ctx,h,{color:'#fff1d6',size:.8,sizeEnd:2.6,life:.22,frame:GLOW.sparkle,intensity:2.4});dot(ctx,h,{color:'#ffd79a',size:.6,sizeEnd:2.2,life:.35,frame:GLOW.ring});if(e.local)ctx.feel.shake(.25);}},
  reveal_end:{tier:'small',cue:'reveal_hide',run(ctx,e){puff(ctx,head(e.position),{count:4,size:.25,sizeEnd:.6,speed:1,life:.7});}},
  guest_delivered:{tier:'large',cue:'guest_delivered',run(ctx,e){const p=e.position;ctx.meshes.pillar(p,{radius:1,height:8,color:'#ffb066',life:1.8});ctx.meshes.ring(p,{color:'#ffd79a',from:.4,to:3,life:.8,intensity:2});ctx.meshes.ring(p,{color:'#ffb066',from:.4,to:2,life:.8,delay:.18});
    for(let i=0,n=ctx.n(30);i<n;i++){const a=R()*TAU,r=R()*1.1;ctx.glow.emit({x:p.x+Math.cos(a)*r,y:p.y+R()*.5,z:p.z+Math.sin(a)*r,vy:2+R()*2.5,drag:.4,life:1.6,size:.2,sizeEnd:.06,color:R()<.5?'#ffb066':'#ffe2a6',intensity:2.6,alpha:1,alphaEnd:0,frame:R()<.3?GLOW.sparkle:GLOW.dot,delay:R()*.4,fadeIn:.1});}
    if(e.local)ctx.feel.flash('#ffd7a0',.18);}},
  stall_win:{tier:'medium',cue:'stall_win',run(ctx,e){sparkBurst(ctx,head(e.position),{count:26,color:['#ff9fc8','#ffd79a','#9ee1e3','#c9b6ff'],speed:3.2,up:2.5,size:.22,gravity:4,life:1.1});}},
  stall_fail:{tier:'small',cue:'stall_fail',run(ctx,e){puff(ctx,head(e.position),{count:3,size:.22,sizeEnd:.5,speed:.6,shade:'#7d7480',color:'#d8d2dc'});}},
  stall_reward:{tier:'small',cue:'stall_reward',run(ctx,e){sparkBurst(ctx,chest(e.position),{count:12,color:'#ffd79a',speed:1.8,up:2,size:.2});}},
  stall_enter:{tier:'none',cue:'stall_enter',run(){}},
  hit:{tier:'medium',cue:'hit',run(ctx,e){const c=chest(e.position);sparkBurst(ctx,c,{count:12,color:['#ff7a8a','#ffd0d6'],speed:4,size:.24,gravity:2});dot(ctx,c,{color:'#ff9aa8',size:.7,sizeEnd:2.2,frame:GLOW.sparkle,life:.22,intensity:2});if(e.local)ctx.feel.shake(.45);}},
  sealed:{tier:'medium',cue:'sealed',run(ctx,e){const p=e.position;puff(ctx,{x:p.x,y:p.y+.4,z:p.z},{count:8,color:'#cdb6f2',shade:'#4a2f6e',size:.35,sizeEnd:.9,speed:1.6,life:1.1,up:.3,radius:.5});ctx.meshes.ring(p,{color:'#a46bff',from:.5,to:2,life:.9,intensity:2});if(e.local)ctx.feel.shake(.4);}},
  rescued:{tier:'medium',cue:'rescued',run(ctx,e){const p=e.position;swirl(ctx,p,{count:22,colors:['#ffd79a','#ffffff'],radius:.7,vy:2.4,w:5,life:1,size:.2});ctx.meshes.ring(p,{color:'#ffd79a',from:.3,to:1.8,life:.6,intensity:2});}},
  boss_omen:{tier:'medium',cue:'boss_omen',run(ctx,e){const p=e.position;if(!p)return;ctx.meshes.ring(p,{color:'#a46bff',from:1,to:7,life:.9,width:.08,intensity:2});ctx.meshes.ring(p,{color:'#ff8a3d',from:.8,to:3,life:.7,delay:.12,intensity:2});
    puff(ctx,{x:p.x,y:p.y+.3,z:p.z},{count:6,color:'#6c5a8a',shade:'#1d1430',size:.5,sizeEnd:1.3,speed:2.4,life:1.2,up:.2,radius:.8});ctx.feel.shake(.18);}},
  boss_banished:{tier:'large',cue:'boss_banished',run(ctx,e){const p=e.position||ctx.boss();if(!p)return;const c={x:p.x,y:(p.y||0)+2.4,z:p.z};
    sparkBurst(ctx,c,{count:70,color:['#ffe2a6','#ffffff','#ffb066','#c9b6ff'],speed:7,up:2,size:.34,gravity:2.5,life:1.4});puff(ctx,c,{count:12,size:.6,sizeEnd:1.8,speed:3.5,life:1.4,color:'#efe6ff',shade:'#6c5a8a',radius:.6});
    ctx.meshes.ring({x:p.x,y:p.y||0,z:p.z},{color:'#ffd79a',from:1,to:9,life:1,intensity:2.2});ctx.meshes.pillar({x:p.x,y:p.y||0,z:p.z},{radius:1.6,height:12,color:'#ffe2a6',life:1.4});ctx.feel.flash('#fff1d6',.35);ctx.feel.shake(.65);}},
  spirit_bolt:{tier:'small',cue:'spirit_bolt',run(ctx,e){spiritBolt(ctx,e);}},
  ward_block:{tier:'small',cue:'ward_block',run(ctx,e){const c=chest(e.position);sparkBurst(ctx,c,{count:14,color:['#ffcf6b','#ffffff'],speed:3.5,size:.22});ctx.meshes.ring(e.position,{color:'#ffcf6b',from:1,to:2.6,life:.35,intensity:2.2});}},
  seal_break:{tier:'medium',cue:'seal_break',run(ctx,e){const c=chest(e.position);sparkBurst(ctx,c,{count:18,color:['#a46bff','#e4dbff'],speed:4,size:.26,gravity:5});puff(ctx,c,{count:4,color:'#d8d2dc',shade:'#4a2f6e',size:.3,sizeEnd:.8});if(e.local)ctx.feel.shake(.2);}},
  ping:{tier:'small',cue:'ping',run(ctx,e){const p=e.position;ctx.meshes.pillar(p,{radius:.25,height:9,color:'#9ee1e3',life:2.6,intensity:2});for(let k=0;k<3;k++)ctx.meshes.ring(p,{color:'#9ee1e3',from:.3,to:1.8,life:.7,delay:k*.45});}},
  footstep:{tier:'small',cue:'footstep',run(ctx,e){if(!e.local&&!ctx.near(e.position,16))return;const p=e.position;ctx.smoke.emit({x:p.x+(e.foot==='left'?-.12:.12),y:p.y+.08,z:p.z,vy:.25,vx:(R()-.5)*.3,drag:2,life:.55,size:.14,sizeEnd:.36,color:'#d9c8a6',shade:'#7d6a52',alpha:.75,alphaEnd:.75,fadeIn:0});}},
  jump:{tier:'small',cue:'jump',run(ctx,e){dustRing(ctx,e.position,{count:5,size:.16,sizeEnd:.42,speed:1.2});}},
  land:{tier:'small',cue:'land',run(ctx,e){dustRing(ctx,e.position,{count:8});ctx.meshes.ring(e.position,{color:'#d9c8a6',from:.3,to:1.1,life:.3,intensity:.8,alpha:.7});}},
  round_start:{tier:'medium',cue:'round_start',run(ctx){ctx.fireworks?.salvo(3);}},
  round_end:{tier:'large',cue:'round_end',run(ctx,e){if(e.result==='won'){ctx.fireworks?.salvo(6);ctx.feel.flash('#ffe2a6',.2);}}},
  firework:{tier:'small',cue:'firework',run(ctx,e){ctx.feel.flash(e.color||'#ffd79a',.05);}}
};

/** Event types the bus can emit (kept in sync with public/events.mjs by tests/fx-map.test.mjs). */
export const FX_EVENTS=Object.keys(FX_MAP);
