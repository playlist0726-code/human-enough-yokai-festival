export const DISGUISE={intro:4.2,period:15,reveal:5,cover:5,range:3.2,charm:5};
export const BODY_PARTS={mizu:'water dish',pon:'tanuki tail',kon:'fox ears and tails',sumi:'crow wings',nemu:'face-tail',akari:'lantern hand',kasa:'umbrella crown'};
export function disguiseState(p,tick){
  const concealed=(p.concealedUntil||0)>tick||(p.ward||0)>0;
  return {revealed:(p.revealUntil||0)>tick&&!concealed,concealed,remaining:Math.max(0,(p.revealUntil||0)-tick),next:Math.max(0,(p.nextRevealAt||DISGUISE.period)-tick),part:BODY_PARTS[p.character]||'yokai feature'};
}
