export function joystickVector(x,y,radius=42,deadzone=.12){
  const length=Math.hypot(x,y),magnitude=Math.min(1,length/radius);
  if(magnitude<=deadzone||!Number.isFinite(length))return {x:0,z:0};
  const strength=(magnitude-deadzone)/(1-deadzone);return {x:x/length*strength,z:y/length*strength};
}
export function bindJoystick(element,stick,onMove,onStart){
  let pointer=null;
  const move=e=>{const box=element.getBoundingClientRect(),v=joystickVector(e.clientX-box.left-box.width/2,e.clientY-box.top-box.height/2,box.width*.36);onMove(v);stick.style.transform=`translate(${v.x*30}px,${v.z*30}px)`;};
  element.addEventListener('pointerdown',e=>{if(pointer!==null)return;e.preventDefault();pointer=e.pointerId;element.setPointerCapture(pointer);onStart();move(e);});
  element.addEventListener('pointermove',e=>{if(e.pointerId===pointer){e.preventDefault();move(e);}});
  const release=e=>{if(e&&e.pointerId!==pointer)return;pointer=null;onMove({x:0,z:0});stick.style.transform='';};
  for(const name of ['pointerup','pointercancel','lostpointercapture'])element.addEventListener(name,release);
  window.addEventListener('blur',()=>release());document.addEventListener('visibilitychange',()=>{if(document.hidden)release();});
  return release;
}
