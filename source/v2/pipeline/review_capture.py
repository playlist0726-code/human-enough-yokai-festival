"""Review shots of a v2 character through the game's own runtime (rig-v2 + R02 lighting + game camera).

  python3 -I source/v2/pipeline/review_capture.py --id mizu --out docs/production/captures/r03/review
  (needs `npm run dev` on :4173; uses headless Chrome with SwiftShader, so it works without a GPU)

Why not tools/capture.py: the full game drops its session under software WebGL in the sandbox.
This page loads only what the character needs: defs/<id>.json -> the compressed runtime GLBs ->
createV2Rig (same clip selection, gait sync, face morphs, reveal prop as in the game), the R02
night lighting rig, a lantern-lit ground, and the FestivalCamera's framing (fov 55, distance 9.5,
pitch 0.49, target +1.65).

Shots: game_distance.png, closeup_yokai.png, closeup_human.png, turn_yokai.png, reveal.png,
walk_yokai.gif, walk_human.gif, opening.gif (R10 transformationPose beats), portrait.webp (512^2,
transparent, head and shoulders -> public/assets/ui/portraits/<id>.webp).
"""
import argparse, asyncio, base64, io, os
from PIL import Image
from playwright.async_api import async_playwright

PAGE = """<!doctype html><html><head><script type="importmap">{"imports":{"three":"/vendor/three/three.module.js","three/addons/":"/addons/"}}</script>
<style>body{margin:0;background:#141a2e}canvas{display:block}</style></head><body><canvas id=c></canvas>
<script type=module>
import * as THREE from 'three';import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {createV2Rig,normalizeDef,instantiate} from '/characters/rig-v2.mjs';import {createLighting} from '/render/lighting.mjs';
import {transformationPose} from '/transformation.mjs';
const q=new URLSearchParams(location.search),id=q.get('id'),W=+q.get('w'),H=+q.get('h'),alpha=q.get('alpha')==='1';
const r=new THREE.WebGLRenderer({canvas:c,antialias:true,alpha,preserveDrawingBuffer:true});r.setSize(W,H,false);r.outputColorSpace=THREE.SRGBColorSpace;r.toneMapping=THREE.ACESFilmicToneMapping;r.toneMappingExposure=1.05;r.shadowMap.enabled=true;r.shadowMap.type=THREE.PCFSoftShadowMap;
const s=new THREE.Scene();if(!alpha){s.background=new THREE.Color('#18203a');s.fog=new THREE.Fog('#18203a',18,60);}
const L=createLighting(s);L.addHemisphere();L.addDirectional();
if(alpha){const key=new THREE.DirectionalLight('#fff1dc',2.6);key.position.set(2,4,6);s.add(key);const fill=new THREE.HemisphereLight('#dfe8ff','#6b5240',1.4);s.add(fill);}
r.setClearColor(0x000000,alpha?0:1);
const ground=new THREE.Mesh(new THREE.CircleGeometry(40,64),new THREE.MeshStandardMaterial({color:'#5a4434',roughness:.95}));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;ground.visible=!alpha;s.add(ground);
const lanterns=[];for(const [x,z] of [[-3.2,-6],[3.4,-6.5],[-5,1],[5.2,1.5]]){const p=new THREE.PointLight('#ffb36a',4,9,2);p.position.set(x,2.3,z);s.add(p);const m=new THREE.Mesh(new THREE.SphereGeometry(.28,16,12),new THREE.MeshStandardMaterial({color:'#ffcf8a',emissive:'#ff9b45',emissiveIntensity:2.2}));m.position.copy(p.position);m.visible=!alpha;m.userData.lantern=true;s.add(m);lanterns.push(p);}
const cam=new THREE.PerspectiveCamera(55,W/H,.08,300);
const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const def=normalizeDef(await (await fetch(`/characters/defs/${id}.json`)).json());
const assets={};for(const [form,url] of Object.entries(def.forms))assets[form]=await instantiate(await loader.loadAsync(url));
if(def.reveal)assets.reveal=await instantiate(await loader.loadAsync(def.reveal));
const rig=createV2Rig(def,assets);s.add(rig.root);rig.root.traverse(o=>{if(o.isMesh){o.castShadow=true;}});
let pos=new THREE.Vector3(),t=0;
window.setup=(o)=>{window.opt=o;};
// drive the rig like actors.mjs does: p = player snapshot, options.form/progress/revealed
window.step=(n,{form='yokai',speed=0,facing=0,action='idle',cover=0,revealed=false,opening=null}={})=>{
  for(let i=0;i<n;i++){const dt=1/30;t+=dt;pos.x+=Math.sin(facing)*speed*dt;pos.z+=Math.cos(facing)*speed*dt;
    let p={id:'a',x:pos.x,z:pos.z,facing,action,cover,height:0,vy:0,health:4};
    let opts={form,revealed,phase:'playing'};if(opening!=null){p={...p,...transformationPose(opening+i/30/3.2,0)};opts={form:'transform',progress:opening+i/30/3.2};}
    rig.update(p,dt,t,Math.floor(t*10),{x:pos.x,z:pos.z},opts);rig.root.position.x=pos.x;rig.root.position.z=pos.z;}
  return rig.clip.base+'/'+(rig.clip.upper||'-');};
// FestivalCamera framing around the character (yaw: 0 = behind-south like the game's default .2)
const visibleBox=()=>{rig.root.updateMatrixWorld(true);const b=new THREE.Box3();rig.root.traverseVisible(o=>{if(o.isMesh)b.expandByObject(o);});return b;};
window.png=()=>c.toDataURL('image/png');
window.frame=(kind,yaw=.2)=>{const tgt=new THREE.Vector3(pos.x,1.65,pos.z);
  if(kind==='game'){const d=9.5,e=.49;cam.fov=55;cam.position.set(tgt.x+Math.sin(yaw)*Math.cos(e)*d,tgt.y+Math.sin(e)*d,tgt.z+Math.cos(yaw)*Math.cos(e)*d);cam.lookAt(tgt.x-Math.sin(yaw)*Math.cos(e)*10+Math.sin(yaw)*Math.cos(e)*d,tgt.y+Math.sin(e)*d-Math.sin(e)*10,tgt.z-Math.cos(yaw)*Math.cos(e)*10+Math.cos(yaw)*Math.cos(e)*d);}
  else{const b=visibleBox(),h=b.max.y-b.min.y;const head=kind==='portrait'||kind==='close';const cx=(b.min.x+b.max.x)/2,cz=(b.min.z+b.max.z)/2;const look=new THREE.Vector3(cx,head?b.min.y+h*.66:b.min.y+h*.5,cz);const dist=kind==='portrait'?h*1.55:head?h*1.15:h*2.1;cam.fov=30;cam.position.set(look.x+Math.sin(yaw)*dist,look.y+(head?h*.06:h*.15),look.z+Math.cos(yaw)*dist);cam.lookAt(look);}
  s.traverse(o=>{if(o.userData.lantern)o.visible=kind==='game'&&!alpha;});
  cam.updateProjectionMatrix();r.render(s,cam);return [cam.position.toArray().map(v=>+v.toFixed(2)),rig.root.userData.appearance,rig.clip.base];};
document.title='READY';
</script></body></html>"""


async def main(a):
    os.makedirs(a.out, exist_ok=True)
    page_path = os.path.join('public', '__review.html')
    with open(page_path, 'w') as f:
        f.write(PAGE)
    try:
        async with async_playwright() as p:
            exe = a.chrome if os.path.exists(a.chrome) else None
            b = await p.chromium.launch(executable_path=exe, args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])

            async def open_page(w, h, alpha=False):
                pg = await b.new_page(viewport={'width': w, 'height': h})
                pg.on('pageerror', lambda e: print('pageerror', e))
                await pg.goto(f'{a.url}/__review.html?id={a.id}&w={w}&h={h}&alpha={1 if alpha else 0}')
                await pg.wait_for_function("document.title=='READY'", timeout=180000)
                return pg

            async def shot(pg):
                return Image.open(io.BytesIO(await pg.locator('canvas').screenshot(omit_background=True)))

            async def gif(pg, name, form, n=24, speed=3.6, kind='game', yaw=.2, facing=-1.2, every=1, warm=30, **kw):
                await pg.evaluate(f"step({warm},{{form:'{form}',speed:{speed},facing:{facing}}})")
                frames = []
                for i in range(n):
                    await pg.evaluate(f"step({every},{{form:'{form}',speed:{speed},facing:{facing},opening:{kw.get('opening','null') if 'opening' not in kw else kw['opening'] + i * every / 30 / 3.2}}})")
                    await pg.evaluate(f"frame('{kind}',{yaw})")
                    frames.append((await shot(pg)).convert('RGB'))
                frames[0].save(os.path.join(a.out, name), save_all=True, append_images=frames[1:], duration=int(1000 * every / 30), loop=0)
                print('wrote', name, len(frames), 'frames')

            # 1) game camera distance, idle then walking toward the camera's side
            pg = await open_page(960, 540)
            print(await pg.evaluate("step(45,{form:'yokai'})"))
            print(await pg.evaluate("frame('game',.2)")); (await shot(pg)).save(os.path.join(a.out, 'game_distance.png'))
            # 2) close-ups
            print(await pg.evaluate("frame('close',.35)")); (await shot(pg)).save(os.path.join(a.out, 'closeup_yokai.png'))
            for yaw, tag in ((0, 'front'), (1.57, 'side'), (3.14, 'back'), (.6, 'tq')):
                await pg.evaluate(f"frame('full',{yaw})"); (await shot(pg)).save(os.path.join(a.out, f'turn_yokai_{tag}.png'))
            await pg.evaluate("step(30,{form:'human'})")
            await pg.evaluate("frame('close',.35)"); (await shot(pg)).save(os.path.join(a.out, 'closeup_human.png'))
            await pg.evaluate("frame('full',.45)"); (await shot(pg)).save(os.path.join(a.out, 'turn_human_tq.png'))
            await pg.evaluate("step(10,{form:'human',revealed:true})")
            print(await pg.evaluate("frame('full',.45)")); (await shot(pg)).save(os.path.join(a.out, 'reveal.png'))
            await pg.close()
            # 3) walking GIFs at the game camera (server walk speed 3.6 u/s)
            pg = await open_page(640, 400)
            await gif(pg, 'walk_yokai.gif', 'yokai', n=20, kind='full', yaw=.25, facing=1.57)
            await pg.close()
            pg = await open_page(640, 400)
            await gif(pg, 'walk_human.gif', 'human', n=20, kind='full', yaw=.25, facing=1.57)
            await pg.close()
            pg = await open_page(640, 400)
            await gif(pg, 'walk_game.gif', 'yokai', n=20, kind='game', yaw=.2, facing=-.9)
            await pg.close()
            # 4) portrait for the R05 slot (transparent, head and shoulders)
            pg = await open_page(512, 512, alpha=True)
            await pg.evaluate("step(20,{form:'yokai'})")
            await pg.evaluate("frame('portrait',.3)")
            import base64
            data = await pg.evaluate("png()")
            Image.open(io.BytesIO(base64.b64decode(data.split(',')[1]))).save(os.path.join(a.out, 'portrait.png'))
            await pg.close()
            # 5) studio full-body (concept comparison), same key-art lighting as the portrait
            pg = await open_page(640, 640, alpha=True)
            for form, yaw in (('yokai', 0), ('human', 0)):
                await pg.evaluate(f"step(20,{{form:'{form}'}})")
                await pg.evaluate(f"frame('full',{yaw})")
                data = await pg.evaluate("png()")
                Image.open(io.BytesIO(base64.b64decode(data.split(',')[1]))).save(os.path.join(a.out, f'studio_{form}.png'))
            await pg.close()
            await b.close()
    finally:
        os.remove(page_path)


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--id', default='mizu')
    ap.add_argument('--out', required=True)
    ap.add_argument('--url', default='http://127.0.0.1:4173')
    ap.add_argument('--chrome', default='/usr/bin/google-chrome')
    asyncio.run(main(ap.parse_args()))
