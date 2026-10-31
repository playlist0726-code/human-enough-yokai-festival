export const CHANNEL='eve-festival-minigame-v1';
export function isFrameMessage(event,origin,source){return event.origin===origin&&event.source===source&&event.data?.channel===CHANNEL;}
export function cleanStallInput(input){
  if(!input||typeof input!=='object')return null;
  const type=input.type;
  if(['begin','close','turn'].includes(type))return {type};
  const unit=n=>Number.isFinite(n)&&n>=0&&n<=1;
  if(type==='aim'&&unit(input.x)&&unit(input.y))return {type,x:input.x,y:input.y};
  if(type==='throw'&&unit(input.power)&&unit(input.aimX))return {type,power:input.power,aimX:input.aimX};
  if(['flip','pick','syrup'].includes(type)&&Number.isInteger(input.index)&&input.index>=0&&input.index<6)return {type,index:input.index};
  return null;
}
