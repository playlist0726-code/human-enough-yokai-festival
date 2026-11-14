#!/usr/bin/env python3
"""Human Enough! remaster — look-dev shots of the real festival scene (R02 / R04).

Builds the same scene the game builds (render pipeline + festival + scenery + legacy or v2
character models) on an offline page, places the game camera (FestivalCamera) at fixed
spots and saves one PNG per shot. No server session is needed, so it works in the
software-WebGL sandbox where in-game captures drop the WebSocket.

Usage (game server must be running: `npm run dev`):
    python3 -I tools/lookdev.py --out docs/production/captures/r02/lookdev [--profile high|balanced|mobile|light]
           [--shots start,street,shrine,wide] [--size 1280x720] [--flash] [--perf]

Shots (player position, camera yaw/pitch/distance follow the game camera rig):
    start   arrival ring at the bottom of the lane, looking uphill
    street  between the Cork Shooting and Goldfish stalls
    shrine  in front of the Spirit Gate at the summit
    gate    lower, wider view of the Spirit Gate and the shrine hall behind it
    wide    the "Reset view (wide)" camera at the start, closest to the key-art framing
    fish    hero framing of the Goldfish Scooping stall (R04 approval shot)

--breakdown prints draw calls per top-level scene object (first shot) and degenerate-normal meshes.
--nocast leaves characters out (environment-only accounting).
--perf writes renderer.info numbers (draw calls, triangles, geometries, textures) to perf.json.
"""
import argparse, asyncio, base64, json, os, re
from playwright.async_api import async_playwright

PAGE = r"""<!doctype html><html><head><meta charset=utf-8>
<script type="importmap">{"imports":{"three":"/vendor/three/three.module.js","three/addons/":"/addons/"}}</script>
<style>html,body{margin:0;background:#000;overflow:hidden}canvas{display:block}</style></head><body><canvas id=c></canvas>
<script type=module>
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createRenderPipeline} from '/render/pipeline.mjs';
import {PROFILES} from '/visual-quality.mjs';
import {buildFestival} from '/festival.mjs';
import {FestivalCamera} from '/free-camera.mjs';
import {groundHeight} from '/shared/world.mjs';
import {createVisitor} from '/visitors.mjs';
const q=new URLSearchParams(location.search),W=+q.get('w'),H=+q.get('h');
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(55,W/H,.08,300);
const pipeline=createRenderPipeline({canvas:document.getElementById('c'),scene,camera,width:W,height:H});
pipeline.resize(W,H);pipeline.applyProfile(PROFILES[q.get('profile')]);
const festival=buildFestival(scene,new Map());
const loader=new GLTFLoader();
function load(url,height){return new Promise(r=>loader.load(url,g=>{const o=g.scene,b=new THREE.Box3().setFromObject(o),s=height/(b.max.y-b.min.y);o.scale.setScalar(s);o.userData.foot=-b.min.y*s;o.traverse(n=>{if(n.isMesh){n.castShadow=n.receiveShadow=true;}});r(o);},undefined,()=>r(null)));}
const cast=[['mizu','yokai',2.85],['pon','yokai',2.85],['kon','yokai',2.85]];
const models=await Promise.all(cast.map(([id,form,h])=>load(`/assets/models/${id}_${form}.glb`,h)));
const guests=[0,3,5].map(i=>createVisitor(i));
for(const g of guests)scene.add(g.root);
function place(o,x,z,rot){if(!o)return;o.position.set(x,groundHeight(x,z)+(o.userData.foot||0),z);o.rotation.y=rot;scene.add(o);}
const SHOTS={
  start:{p:[0,16.5],yaw:.2,pitch:.49,dist:9.5,cast:[[0,16.5,Math.PI],[-1.7,17.6,Math.PI*.9],[1.8,17.4,-Math.PI*.9]],guests:[[-2,10.5],[2.6,8],[0.5,6]]},
  street:{p:[0,3.2],yaw:-.18,pitch:.40,dist:9.5,cast:[[0,3.2,Math.PI],[-1.5,4.2,Math.PI*.9],[1.5,4.4,-Math.PI*.9]],guests:[[-3.6,1.2],[3.2,-1.5],[-1,-3.5]]},
  shrine:{p:[0,-22.5],yaw:0,pitch:.36,dist:9.5,cast:[[0,-22.5,Math.PI],[-1.6,-21.4,Math.PI*.9],[1.6,-21.6,-Math.PI*.9]],guests:[[-2.4,-26],[2.5,-25.5],[3.4,-19.5]]},
  gate:{p:[0,-19.6],yaw:0,pitch:.24,dist:11.5,cast:[[0,-19.6,Math.PI],[-1.6,-18.7,Math.PI*.9],[1.6,-18.9,-Math.PI*.9]],guests:[[-2.6,-24.5],[2.8,-25.5],[4.4,-20.5]]},
  wide:{p:[0,16.5],yaw:.2,pitch:.62,dist:17,cast:[[0,16.5,Math.PI],[-1.7,17.6,Math.PI*.9],[1.8,17.4,-Math.PI*.9]],guests:[[-2,10.5],[2.6,8],[0.5,6]]},
  fish:{p:[7.6,12.0],yaw:-.12,pitch:.42,dist:7.4,cast:[[5.1,12.4,Math.PI*.8],[4.0,13.4,Math.PI*.85],[10.9,12.8,-Math.PI*.85]],guests:[[12.4,11.4],[3.2,10.6],[5.4,6]]},
};
window.shoot=async(name,t)=>{
  const s=SHOTS[name];s.cast.forEach((c,i)=>place(models[i],...c));
  s.guests.forEach(([x,z],i)=>{const g=guests[i].root;g.position.set(x,groundHeight(x,z)+.07,z);g.rotation.y=Math.atan2(s.p[0]-x,s.p[1]-z);});
  const rig=new FestivalCamera(camera);rig.yaw=rig.smoothYaw=s.yaw;rig.pitch=rig.smoothPitch=s.pitch;rig.distance=s.dist;
  const focus=new THREE.Vector3(s.p[0],groundHeight(s.p[0],s.p[1]),s.p[1]);
  for(let i=0;i<4;i++)rig.update(focus,.1);
  const time=t??12.5;
  for(let i=0;i<3;i++){festival.update(time+i*.05,camera,focus,null);pipeline.update({dt:.05,elapsed:time+i*.05,focus,threat:null});}
  if(q.get('flash')==='1'){pipeline.flash?.('#dd9bff',1);pipeline.update({dt:.05,elapsed:time+.2,focus,threat:null});}
  pipeline.renderer.info.reset();pipeline.render(PROFILES[q.get('profile')].post);
  const i=pipeline.renderer.info,png=document.getElementById('c').toDataURL('image/png');  // same task as the draw: no partial frames
  return {png,calls:i.render.calls,triangles:i.render.triangles,geometries:i.memory.geometries,textures:i.memory.textures,lights:(()=>{let n=0;scene.traverse(o=>{if(o.isLight&&o.visible&&o.intensity>0)n++;});return n;})()};
};
// wait for festival-kit GLBs (R04) so shots never catch a half-loaded street
await festival.kit?.finish();
if(q.get('nocast')==='1'){models.length=0;for(const g of guests)scene.remove(g.root);}
// draw-call accounting: calls with each top-level object hidden, plus mesh/material counts, plus geometry problems
window.breakdown=async(name)=>{
  await window.shoot(name);const post=PROFILES[q.get('profile')].post;
  const calls=()=>{pipeline.renderer.info.reset();pipeline.render(post);return pipeline.renderer.info.render.calls;};
  const all=calls(),rows=[];
  for(const ch of scene.children){if(!ch.visible||ch.isLight)continue;let meshes=0;const mats=new Set();ch.traverse(o=>{if(o.isMesh||o.isPoints){meshes++;(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>mats.add(m));}});if(!meshes)continue;
    ch.visible=false;const d=all-calls();ch.visible=true;rows.push({name:ch.name||ch.type,calls:d,meshes,materials:mats.size,kinds:(()=>{const k={};ch.traverse(o=>{if(o.isMesh||o.isPoints){const key=(o.material.transparent?'T:':'')+(o.material.name||o.material.type)+(o.isInstancedMesh?':inst':'');k[key]=(k[key]||0)+1;}});return k;})()});}
  const bad=[];scene.traverse(o=>{const n=o.geometry?.attributes?.normal;if(!n)return;let c=0;for(let i=0;i<n.count;i++){const l=Math.hypot(n.getX(i),n.getY(i),n.getZ(i));if(!(l>1e-6))c++;}if(c)bad.push({name:o.name||o.parent?.name||o.type,material:o.material?.name||o.material?.type,degenerateNormals:c});});
  return {total:all,rows:rows.sort((a,b)=>b.calls-a.calls),bad};
};
document.title='READY';
</script></body></html>"""


async def main(a):
    os.makedirs(a.out, exist_ok=True)
    w, h = map(int, a.size.split('x'))
    perf = {}
    async with async_playwright() as p:
        exe = a.chrome if a.chrome and os.path.exists(a.chrome) else None
        b = await p.chromium.launch(executable_path=exe, args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        pg = await b.new_page(viewport={'width': w, 'height': h}, device_scale_factor=1)
        pg.set_default_timeout(400000)
        pg.on('console', lambda m: m.type in ('error', 'warning') and print('console:', m.text[:300]))
        pg.on('pageerror', lambda e: print('pageerror:', str(e)[:500]))
        await pg.route(re.compile(r'__lookdev\.html'), lambda route: route.fulfill(status=200, content_type='text/html', body=PAGE))
        await pg.goto(f'{a.url}/__lookdev.html?w={w}&h={h}&profile={a.profile}&flash={1 if a.flash else 0}&nocast={1 if a.nocast else 0}')
        await pg.wait_for_function("document.title=='READY'")
        if a.breakdown:
            print(json.dumps(await pg.evaluate(f"window.breakdown('{a.shots.split(',')[0]}')"), indent=1))
            await b.close()
            return
        for shot in a.shots.split(','):
            await pg.evaluate(f"window.shoot('{shot}')")  # warm-up: compile shaders, fill shadow maps
            stats = await pg.evaluate(f"window.shoot('{shot}')")
            path = f'{a.out}/{shot}_{a.profile}{"_flash" if a.flash else ""}.png'
            with open(path, 'wb') as f:
                f.write(base64.b64decode(stats.pop('png').split(',', 1)[1]))
            perf[shot] = stats
            print(path, json.dumps(stats))
        await b.close()
    if a.perf:
        with open(f'{a.out}/perf_{a.profile}.json', 'w') as f:
            json.dump(perf, f, indent=1)


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', required=True)
    ap.add_argument('--url', default='http://127.0.0.1:4173')
    ap.add_argument('--size', default='1280x720')
    ap.add_argument('--profile', default='high', choices=['high', 'balanced', 'mobile', 'light'])
    ap.add_argument('--shots', default='start,street,shrine')
    ap.add_argument('--flash', action='store_true')
    ap.add_argument('--perf', action='store_true')
    ap.add_argument('--breakdown', action='store_true', help='print draw calls per top-level object and meshes with degenerate normals')
    ap.add_argument('--nocast', action='store_true', help='environment only: no characters (draw-call accounting)')
    ap.add_argument('--chrome', default='/usr/bin/google-chrome')
    asyncio.run(main(ap.parse_args()))
