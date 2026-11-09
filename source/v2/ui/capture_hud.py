#!/usr/bin/env python3
"""R05 HUD review capture. Enters solo practice and screenshots the live HUD once the socket is settled.

Usage (server running):  python3 -I source/v2/ui/capture_hud.py --out <dir> [--size 1280x720] [--touch]
Software WebGL in the sandbox can starve the socket; this retries until the HUD is visible and
'Reconnecting' is gone, then shoots immediately. Writes hud.png (and menu.png with --menu).
"""
import argparse, asyncio, os
from playwright.async_api import async_playwright


def night_composite(out):
    import numpy as np
    from PIL import Image, ImageEnhance
    sc = Image.open(f'{out}/_scene.png').convert('RGB')
    sc = ImageEnhance.Contrast(ImageEnhance.Color(ImageEnhance.Brightness(sc).enhance(.40)).enhance(.7)).enhance(1.15)
    arr = np.asarray(sc, float) / 255
    h, w = arr.shape[:2]; yy, xx = np.mgrid[0:h, 0:w]
    r = np.sqrt(((xx - w * .5) / w) ** 2 + ((yy - h * .6) / h) ** 2)
    cool = np.array([.42, .52, .95]); warm = np.array([1.0, .78, .55])
    t = np.clip(r / .6, 0, 1)[..., None]
    arr = arr * (warm * (1 - t) + cool * t)            # warm pool at the player, moonlit edges
    img = Image.fromarray((np.clip(arr, 0, 1) * 255).astype('uint8')).convert('RGBA')
    img.alpha_composite(Image.open(f'{out}/_hud.png').convert('RGBA'))
    img.convert('RGB').save(f'{out}/hud-night-sim.png')


async def main(a):
    os.makedirs(a.out, exist_ok=True)
    w, h = map(int, a.size.split('x'))
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=a.chrome if os.path.exists(a.chrome) else None,
                                    args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        ctx = await b.new_context(viewport={'width': w, 'height': h}, has_touch=a.touch, is_mobile=a.touch, device_scale_factor=2 if a.touch else 1)
        pg = await ctx.new_page(); pg.set_default_timeout(240000)
        await pg.add_init_script("localStorage.setItem('eve-human-enough-settings-v1', JSON.stringify({sound:false,quality:'light',camera:'close',name:'Mizu',character:'%s'}))" % a.character)
        # Review aid: give the socket breathing room under software WebGL by spacing animation frames.
        await pg.add_init_script("(()=>{const raf=requestAnimationFrame.bind(window);let last=0;window.requestAnimationFrame=cb=>{const wait=Math.max(0,%d-(performance.now()-last));return setTimeout(()=>raf(t=>{last=performance.now();cb(t);}),wait);};})()" % a.frame_gap)
        await pg.goto(a.url + ('/?touch=1' if a.touch else '/'), wait_until='load'); await pg.wait_for_timeout(3000)
        await pg.click('#title-enter'); await pg.wait_for_timeout(2000)
        if a.select: await pg.screenshot(path=f'{a.out}/select.png')
        await pg.click('#practice')
        await pg.wait_for_function("(() => { const h=document.getElementById('hud'), t=document.getElementById('transformation');"
                                   " return h && !h.classList.contains('hidden') && (!t || t.classList.contains('hidden')); })()")
        # Review aid: software WebGL starves the socket; the last frame under the reconnect veil is still
        # a valid HUD frame, so hide the veil and shoot right away. (Real-GPU numbers come from R14.)
        await pg.add_style_tag(content='#connection-status{display:none!important}')
        await pg.wait_for_timeout(a.settle)
        if a.night_sim:
            # Review aid only: grade the 3D frame toward the ART_BIBLE night offline (R02 owns the real look),
            # then lay the untouched HUD layer on top. Nothing here ships. HUD layer first (fastest shot).
            veil = await pg.add_style_tag(content='#scene{visibility:hidden!important}html,body,#game{background:transparent!important}')
            await pg.screenshot(path=f'{a.out}/_hud.png', omit_background=True)
            await veil.evaluate('e=>e.remove()')
            await pg.add_style_tag(content='#hud,#toast{visibility:hidden!important}')
            await pg.screenshot(path=f'{a.out}/_scene.png')
            night_composite(a.out)
        else:
            await pg.screenshot(path=f'{a.out}/hud.png')
        if a.menu:
            await pg.click('#open-menu'); await pg.wait_for_timeout(1500)
            await pg.screenshot(path=f'{a.out}/menu.png')
        await b.close()
    print('saved', a.out)


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', required=True); ap.add_argument('--url', default='http://127.0.0.1:4173')
    ap.add_argument('--size', default='1280x720'); ap.add_argument('--character', default='mizu')
    ap.add_argument('--touch', action='store_true'); ap.add_argument('--menu', action='store_true'); ap.add_argument('--select', action='store_true'); ap.add_argument('--night-sim', action='store_true')
    ap.add_argument('--settle', type=int, default=6000); ap.add_argument('--frame-gap', type=int, default=2500)
    ap.add_argument('--chrome', default='/usr/bin/google-chrome')
    asyncio.run(main(ap.parse_args()))
