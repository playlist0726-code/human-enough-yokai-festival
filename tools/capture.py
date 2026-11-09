#!/usr/bin/env python3
"""Human Enough! remaster — fixed-camera screenshot capture for before/after review.

Usage (game server must already be running: `npm run dev`):
    python3 -I tools/capture.py --out artifacts/remaster/<room>/<label> [--url http://127.0.0.1:4173] [--size 1280x720]

Shots: 01_title, 02_select, 03_ingame_start, 04_ingame_walk, 05_models_yokai, 06_models_human
Quality defaults to auto (2-core sandboxes resolve to the light profile; heavier profiles can stall
the WebSocket heartbeat under software WebGL). Every room captures `before` at the start and `after` at the end with the same command,
so the HQ room can compare identical framings.

Headless WebGL uses SwiftShader (software). It is slow: allow ~3 minutes. Use a real GPU
browser for FPS numbers; these images are for look comparison only.
"""
import argparse, asyncio, os, re
from playwright.async_api import async_playwright

VIEWER = """<!doctype html><html><head><script type="importmap">{"imports":{"three":"/vendor/three/three.module.js","three/addons/":"/addons/"}}</script>
<style>body{margin:0;background:#1d2238}</style></head><body><canvas id=c width=1400 height=560></canvas>
<script type=module>
import * as THREE from 'three';import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const q=new URLSearchParams(location.search),kind=q.get('k')||'yokai',dir=q.get('dir')||'/assets/models';
const names=['mizu','pon','kon','sumi','nemu','akari','kasa'];
const r=new THREE.WebGLRenderer({canvas:c,antialias:true});r.setSize(1400,560,false);r.outputColorSpace=THREE.SRGBColorSpace;r.toneMapping=THREE.ACESFilmicToneMapping;
const s=new THREE.Scene();s.background=new THREE.Color(0x1d2238);
s.add(new THREE.HemisphereLight(0xbcc8ff,0x3a2a22,1.2));const k=new THREE.DirectionalLight(0xffd7a8,2.4);k.position.set(3,6,5);s.add(k);const rim=new THREE.DirectionalLight(0x8fb0ff,1.4);rim.position.set(-4,3,-5);s.add(rim);
const cam=new THREE.PerspectiveCamera(22,1400/560,0.1,200);cam.position.set(0,1.2,27);cam.lookAt(0,1.1,0);
const L=new GLTFLoader();let n=0;
names.forEach((nm,i)=>L.load(`${dir}/${nm}_${kind}.glb`,g=>done(g.scene,i),undefined,()=>done(null,i)));
function done(o,i){if(o){const b=new THREE.Box3().setFromObject(o),sz=b.getSize(new THREE.Vector3()),sc=2.4/sz.y;o.scale.setScalar(sc);o.position.set((i-3)*2.9,-b.min.y*sc,0);s.add(o);}
if(++n==names.length){r.render(s,cam);document.title='DONE';}}
</script></body></html>"""


async def main(a):
    os.makedirs(a.out, exist_ok=True)
    w, h = map(int, a.size.split('x'))
    async with async_playwright() as p:
        exe = a.chrome if a.chrome and os.path.exists(a.chrome) else None
        b = await p.chromium.launch(executable_path=exe, args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        pg = await b.new_page(viewport={'width': w, 'height': h})
        pg.set_default_timeout(180000)
        await pg.add_init_script("localStorage.setItem('eve-human-enough-settings-v1', JSON.stringify({sound:false,quality:'%s',camera:'close',name:'Capture',character:'%s'}))" % (a.quality, a.character))
        await pg.goto(a.url + '/', wait_until='load'); await pg.wait_for_timeout(4000)
        await pg.screenshot(path=f'{a.out}/01_title.png')
        await pg.click('#title-enter'); await pg.wait_for_timeout(2500)
        await pg.screenshot(path=f'{a.out}/02_select.png')
        await pg.click('#practice')
        # wait until the festival HUD is live (transformation scene finished)
        await pg.wait_for_function("(() => { const h = document.getElementById('hud'); const t = document.getElementById('transformation');"
                                   " return h && !h.classList.contains('hidden') && (!t || t.classList.contains('hidden')); })()")
        async def settle():
            # software WebGL can starve the socket; the client auto-reconnects within 30 s
            try:
                await pg.wait_for_function("document.getElementById('connection-status')?.classList.contains('hidden')", timeout=60000)
            except Exception:
                return False
            await pg.wait_for_timeout(2500)
            return await pg.evaluate("!document.getElementById('hud').classList.contains('hidden') && document.getElementById('menu').classList.contains('hidden') && document.getElementById('connection-status').classList.contains('hidden')")
        if not await settle():
            raise SystemExit('Session dropped under software WebGL (slow sandbox). Rerun, use --size 960x540, or take in-game shots on a real GPU.')
        await pg.screenshot(path=f'{a.out}/03_ingame_start.png')
        await pg.keyboard.down('w'); await pg.wait_for_timeout(1800); await pg.keyboard.up('w')
        if await settle():
            await pg.screenshot(path=f'{a.out}/04_ingame_walk.png')
        else:
            # keep going so the model renders (05/06) are still captured
            print('warning: session dropped after walking under software WebGL; 04_ingame_walk skipped (use a real GPU)')
        await pg.close()
        for kind, idx in (('yokai', '05'), ('human', '06')):
            vp = await b.new_page(viewport={'width': 1400, 'height': 560}); vp.set_default_timeout(180000)
            await vp.route(re.compile(r'__capture_viewer\.html'), lambda route: route.fulfill(status=200, content_type='text/html', body=VIEWER))
            await vp.goto(f'{a.url}/__capture_viewer.html?k={kind}&dir={a.models}')
            await vp.wait_for_function("document.title=='DONE'"); await vp.wait_for_timeout(400)
            await vp.screenshot(path=f'{a.out}/{idx}_models_{kind}.png'); await vp.close()
        await b.close()
    print('saved to', a.out)


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', required=True)
    ap.add_argument('--url', default='http://127.0.0.1:4173')
    ap.add_argument('--size', default='1280x720')
    ap.add_argument('--models', default='/assets/models', help='URL dir holding <id>_yokai.glb / <id>_human.glb')
    ap.add_argument('--quality', default='auto', choices=['auto', 'high', 'light'])
    ap.add_argument('--character', default='mizu')
    ap.add_argument('--chrome', default='/usr/bin/google-chrome')
    asyncio.run(main(ap.parse_args()))
