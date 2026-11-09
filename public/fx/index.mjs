// REMASTER-HOOK r01: single entry point game.js uses for visual effects, so R10 can rebuild VFX
// inside public/fx/* without editing game.js. New effects should subscribe to the event bus
// (public/events.mjs) instead of reading server snapshots.
import {createActionEffects} from './action-effects.mjs';
import {createFireworks} from './fireworks.mjs';

/**
 * @param {{scene: THREE.Scene, bus: ReturnType<import('../events.mjs').createEventBus>, pipeline: object}} ctx
 */
export function createFx({scene,bus,pipeline}){
  const actions=createActionEffects(scene);
  // REMASTER-HOOK r02: each burst also tints sky and ground through the render pipeline's flash API.
  const fireworks=createFireworks(scene,{onBurst:burst=>{bus?.emit('firework',{playerId:null,...burst});pipeline?.flash?.(burst.color,.8);}});
  return {
    actions,fireworks,
    /** Legacy path: server events with an `fx` field (kept until R10 moves them onto the bus). */
    spawnAction:(event,state)=>actions.spawn(event,state),
    clear:()=>actions.clear(),
    update(dt,elapsed,state){fireworks.update(elapsed,dt);actions.update(dt,state);}
  };
}
