// Audio engine. R01 moved the original sine-blip feedback here unchanged; R13 builds the real mix
// (buses, ambience, music) on top and subscribes to the event bus via attach(bus).
export function createAudioEngine({isEnabled=()=>true}={}){
  let context=null;
  const engine={
    get context(){return context;},
    /** The original UI/feedback blip: a short rising sine. */
    tone(freq){
      if(!isEnabled())return;
      context||=new AudioContext();context.resume();
      const o=context.createOscillator(),g=context.createGain();
      o.type='sine';o.frequency.setValueAtTime(freq,context.currentTime);o.frequency.exponentialRampToValueAtTime(freq*1.5,context.currentTime+.2);
      g.gain.setValueAtTime(.08,context.currentTime);g.gain.exponentialRampToValueAtTime(.001,context.currentTime+.35);
      o.connect(g);g.connect(context.destination);o.start();o.stop(context.currentTime+.35);
    },
    /**
     * Subscribe to game events (public/events.mjs). R01 keeps the original sounds, which game.js
     * still triggers directly, so nothing is played from here yet. Returns an unsubscribe function.
     */
    attach(bus){const offs=[];return ()=>offs.forEach(off=>off());}
  };
  return engine;
}
