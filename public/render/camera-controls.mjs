// View buttons (distance, reset, mouse look) and pointer/touch/wheel input for the existing
// FestivalCamera (public/free-camera.mjs). Tap or click on the ground requests click-to-move.
import * as THREE from 'three';

/**
 * @param {object} o
 * @param {HTMLCanvasElement} o.canvas
 * @param {THREE.PerspectiveCamera} o.camera
 * @param {import('../free-camera.mjs').FestivalCamera} o.freeCamera
 * @param {{camera: string}} o.settings
 * @param {() => void} o.onSettingsChange   persist + refresh the settings panel
 * @param {(message: string) => void} o.toast
 * @param {() => void} o.onPointerLockLost   stop held input
 * @param {() => boolean} o.inputEnabled
 * @param {() => THREE.Object3D} o.getGround
 * @param {(goal: {x:number,z:number}) => void} o.onGroundTap
 */
export function createCameraControls({canvas,camera,freeCamera,settings,onSettingsChange,toast,onPointerLockLost,inputEnabled,getGround,onGroundTap}){
  const cameraButton=document.createElement('button');cameraButton.className='view-control';cameraButton.setAttribute('aria-label','Change camera distance');
  const rotateButton=document.createElement('button');rotateButton.className='view-control';rotateButton.textContent='Reset view';rotateButton.setAttribute('aria-label','Reset camera');
  const lookButton=document.createElement('button');lookButton.className='view-control';lookButton.textContent='Mouse look';lookButton.setAttribute('aria-label','Toggle mouse look');
  const container=document.createElement('div');container.className='view-controls';container.append(cameraButton,rotateButton,lookButton);
  let mouseLook=false,cameraStyle=settings.camera;
  const styleLabel=()=>cameraStyle==='close'?'View · Close':'View · Wide';
  cameraButton.textContent=styleLabel();freeCamera.reset(cameraStyle==='wide');
  cameraButton.onclick=()=>{cameraStyle=cameraStyle==='close'?'wide':'close';cameraButton.textContent=styleLabel();freeCamera.reset(cameraStyle==='wide');settings.camera=cameraStyle;onSettingsChange();};
  rotateButton.onclick=()=>{freeCamera.yaw=.2;freeCamera.reset(cameraStyle==='wide');};
  lookButton.onclick=async()=>{if(document.pointerLockElement===canvas||mouseLook){mouseLook=false;lookButton.textContent='Mouse look';if(document.pointerLockElement===canvas)document.exitPointerLock();return;}try{if(!canvas.requestPointerLock)throw Error('Unavailable');await canvas.requestPointerLock();}catch{mouseLook=true;lookButton.textContent='Mouse look · On';canvas.focus();toast('Mouse look enabled. Move over the world to look; Esc releases it.');}};
  document.addEventListener('pointerlockchange',()=>{lookButton.textContent=document.pointerLockElement===canvas?'Mouse look · On':'Mouse look';if(document.pointerLockElement!==canvas)onPointerLockLost();});

  const raycaster=new THREE.Raycaster();
  let orbitAt=null,pinchDistance=0;const touchPointers=new Map();
  function pointNavigation(x,y){raycaster.setFromCamera(new THREE.Vector2(x/innerWidth*2-1,-y/innerHeight*2+1),camera);const hit=raycaster.intersectObject(getGround(),false)[0];if(hit)onGroundTap({x:hit.point.x,z:hit.point.z});}
  canvas.addEventListener('contextmenu',e=>e.preventDefault());
  canvas.addEventListener('pointerdown',e=>{
    if(!inputEnabled())return;canvas.focus();
    if(mouseLook)return;
    if(e.pointerType==='touch'){touchPointers.set(e.pointerId,{x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,moved:false});canvas.setPointerCapture(e.pointerId);pinchDistance=0;return;}
    if((e.button===2||e.button===0)&&document.pointerLockElement!==canvas){orbitAt={id:e.pointerId,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,tap:e.button===0,moved:false};canvas.setPointerCapture(e.pointerId);return;}
  });
  canvas.addEventListener('pointermove',e=>{
    if(!inputEnabled())return;
    if(document.pointerLockElement===canvas||mouseLook){freeCamera.drag(e.movementX,e.movementY);return;}
    const touch=touchPointers.get(e.pointerId);
    if(touch){
      const dx=e.clientX-touch.x,dy=e.clientY-touch.y;touch.x=e.clientX;touch.y=e.clientY;touch.moved||=Math.hypot(touch.x-touch.startX,touch.y-touch.startY)>8;
      if(touchPointers.size===2){const [a,b]=[...touchPointers.values()],d=Math.hypot(a.x-b.x,a.y-b.y);if(pinchDistance)freeCamera.zoom((pinchDistance-d)*3);pinchDistance=d;for(const t of touchPointers.values())t.moved=true;}
      else freeCamera.drag(dx,dy);return;
    }
    if(orbitAt?.id===e.pointerId){orbitAt.moved||=Math.hypot(e.clientX-orbitAt.startX,e.clientY-orbitAt.startY)>6;if(!orbitAt.tap||orbitAt.moved)freeCamera.drag(e.clientX-orbitAt.x,e.clientY-orbitAt.y);orbitAt.x=e.clientX;orbitAt.y=e.clientY;}
  });
  function endCameraPointer(e){const t=touchPointers.get(e.pointerId);if(t&&!t.moved&&inputEnabled()&&e.type!=='pointercancel')pointNavigation(e.clientX,e.clientY);touchPointers.delete(e.pointerId);pinchDistance=0;if(orbitAt?.id===e.pointerId){if(orbitAt.tap&&!orbitAt.moved&&inputEnabled()&&e.type!=='pointercancel')pointNavigation(e.clientX,e.clientY);orbitAt=null;}}
  canvas.addEventListener('pointerup',endCameraPointer);canvas.addEventListener('pointercancel',endCameraPointer);canvas.addEventListener('lostpointercapture',e=>{touchPointers.delete(e.pointerId);if(orbitAt?.id===e.pointerId)orbitAt=null;});
  canvas.addEventListener('wheel',e=>{if(!inputEnabled())return;e.preventDefault();freeCamera.zoom(e.deltaY);},{passive:false});

  return {
    container,
    get mouseLook(){return mouseLook;},
    /** Esc: leave mouse look / pointer lock. Returns true if it was active. */
    release(){if(!(mouseLook||document.pointerLockElement===canvas))return false;mouseLook=false;lookButton.textContent='Mouse look';if(document.pointerLockElement===canvas)document.exitPointerLock();return true;},
    /** Input stopped (blur, menus): drop the soft mouse-look mode. */
    resetLook(){mouseLook=false;lookButton.textContent='Mouse look';},
    /** Re-read settings.camera. */
    sync(){cameraStyle=settings.camera;freeCamera.reset(cameraStyle==='wide');cameraButton.textContent=styleLabel();}
  };
}
