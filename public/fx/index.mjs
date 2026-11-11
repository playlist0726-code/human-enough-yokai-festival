// R10 FX entry point used by game.js: createFx({scene, bus, pipeline}) -> {spawnAction, clear, update}.
// Every visual effect is driven by the event bus (public/events.mjs) through the FX_MAP table in
// fx/recipes.mjs. Two particle pools (toon smoke, additive glow) = 2 draw calls for all particles.
// Budgets halve on the mobile/light profiles (read from canvas.dataset.quality set by render/quality.mjs).
import {createActionEffects} from './action-effects.mjs';
import {createFireworks} from './fireworks.mjs';
import {createPool,fxTexture} from './particles.mjs';
import {createMeshFx} from './meshes.mjs';
import {createFeel} from './feel.mjs';
import {FX_MAP,TIERS} from './recipes.mjs';
import {POTION_COLORS} from '../renderkit.mjs';
import {groundHeight} from '../../shared/world.mjs';

export const BUDGET={high:1,balanced:.8,mobile:.5,light:.5};
export const CAPACITY={glow:1600,smoke:280};

/**
 * @param {{scene: THREE.Scene, bus: ReturnType<import('../events.mjs').createEventBus>, pipeline: object, profile?: () => string}} ctx
 */
export function createFx({scene,bus,pipeline,profile,timeScale}){
  const getProfile=profile||(()=>pipeline?.renderer?.domElement?.dataset?.quality||'high');
  const budget=()=>BUDGET[getProfile()]??1;
  const glow=createPool({scene,kind:'glow',capacity:CAPACITY.glow,map:fxTexture('/assets/fx/glow-atlas.png'),grid:[4,1],renderOrder:11});
  const smoke=createPool({scene,kind:'smoke',capacity:CAPACITY.smoke,map:fxTexture('/assets/fx/smoke-atlas.png'),grid:[4,4],renderOrder:10});
  const meshes=createMeshFx(scene),feel=createFeel({pipeline,timeScale});
  const actions=createActionEffects(scene);
  // REMASTER-HOOK r02: each burst also tints sky and ground through the render pipeline's flash API.
  const fireworks=createFireworks(glow,{budget,onBurst:burst=>{bus?.emit('firework',{playerId:null,...burst});pipeline?.flash?.(burst.color,.8);}});
  const controllers=[];let state=null,elapsed=0;
  const camera=pipeline?.camera;
  const ctx={glow,smoke,meshes,feel,fireworks,budget,
    n:c=>Math.max(1,Math.round(c*budget())),
    color:id=>POTION_COLORS[state?.players?.[id]?.character]||'#c9b6ff',
    player:id=>{const p=state?.players?.[id];return p?{x:p.x,y:groundHeight(p.x,p.z)+(p.height||0),z:p.z}:null;},
    guest:id=>{const h=state?.humans?.find(g=>g.id===id);return h?{x:h.x,y:groundHeight(h.x,h.z),z:h.z}:null;},
    boss:()=>state?.encounter?{x:state.encounter.x,y:groundHeight(state.encounter.x,state.encounter.z),z:state.encounter.z}:null,
    near:(p,d)=>!camera||!p||camera.position.distanceToSquared({x:p.x,y:p.y,z:p.z})<d*d,
    spawn:fn=>controllers.push(fn)};
  const played=[];
  function run(type,e){
    const recipe=FX_MAP[type];if(!recipe)return;
    if(!e.position&&!['round_start','round_end','firework','boss_banished','boss_omen','stall_enter'].includes(type))return;
    try{recipe.run(ctx,e);}catch(error){console.warn('[fx]',type,error);}
    played.push(type);if(played.length>40)played.shift();
  }
  const off=bus?Object.keys(FX_MAP).map(type=>bus.on(type,e=>run(type,e))):[];
  return {
    actions,fireworks,glow,smoke,meshes,feel,ctx,played,
    /** Server events with an `fx` field: floating labels only (particles come from the bus). */
    spawnAction:(event,s)=>actions.spawn(event,s),
    /** Fire an effect directly (lab, tests). */
    play:run,
    clear(){actions.clear();glow.clear();smoke.clear();meshes.clear();feel.clear();fireworks.clear();controllers.length=0;},
    /** dt: animation time (hit-stop scaled). realDt: real frame time, so shake and flash keep playing during a hit-stop. */
    update(dt,time,s,realDt=dt){
      state=s||state;elapsed=time;
      for(let i=controllers.length-1;i>=0;i--)if(controllers[i](dt)===false)controllers.splice(i,1);
      fireworks.update(time,dt);actions.update(dt,state);glow.update(dt);smoke.update(dt);meshes.update(dt,time);feel.update(realDt);
    },
    dispose(){for(const f of off)f?.();this.clear();},
    tiers:TIERS
  };
}
