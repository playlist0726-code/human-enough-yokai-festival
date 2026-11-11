// REMASTER-HOOK hq: presentation time scale (hit-stop, slow motion).
// Scales ONLY the dt that drives on-screen animation and interpolation in game.js. Server ticks,
// snapshot timing, input, network pings and FPS sampling keep using real time, so a hit-stop can
// never desync or delay gameplay; it is a purely visual pause.
const clamp=(v,lo,hi)=>Math.min(hi,Math.max(lo,Number.isFinite(v)?v:lo));
export const MAX_HITSTOP=.25;

export function createTimeScale(){
  let base=1,stop=0,stopScale=0;
  return {
    /** Current multiplier applied to animation dt (0..1). */
    get scale(){return stop>0?Math.min(base,stopScale):base;},
    get stopped(){return stop>0;},
    /** Sustained slow motion (1 = normal). */
    set(value){base=clamp(value,0,1);},
    /** Freeze (or slow to `scale`) for `seconds` of real time. Overlapping calls keep the longer one; capped. */
    hitstop(seconds=.06,scale=0){
      const s=clamp(seconds,0,MAX_HITSTOP);if(s>stop){stop=s;stopScale=clamp(scale,0,1);}
    },
    /** Advance by one frame of real time; returns the scaled dt for animation. */
    step(realDt){
      const dt=Math.max(0,realDt||0);if(stop<=0)return dt*base;
      const frozen=Math.min(stop,dt);stop-=frozen;
      return frozen*Math.min(base,stopScale)+(dt-frozen)*base;
    },
    reset(){base=1;stop=0;}
  };
}
