#!/usr/bin/env python3
"""R10 review recorder: drives /fx/lab.html frame by frame and writes a GIF (and a contact sheet).

Usage (server running):
  python3 -I source/v2/fx/record_lab.py --query "mode=transform&chars=mizu,pon,kon" --out docs/production/captures/r10/transform
  python3 -I source/v2/fx/record_lab.py --query "mode=world&char=mizu&effect=charm" --out ...
Software WebGL is slow but deterministic here: every frame is rendered on demand, so timing in
the GIF is the real game timing regardless of how long a frame took to draw.
"""
import argparse, asyncio, os
from playwright.async_api import async_playwright
from PIL import Image


async def main(a):
    os.makedirs(a.out, exist_ok=True)
    w, h = map(int, a.size.split('x'))
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=a.chrome if os.path.exists(a.chrome) else None,
                                    args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        pg = await b.new_page(viewport={'width': w, 'height': h}); pg.set_default_timeout(300000)
        logs = []
        pg.on('console', lambda m: logs.append(m.text)); pg.on('pageerror', lambda e: logs.append('ERR ' + str(e)))
        await pg.goto(f'{a.url}/fx/lab.html?{a.query}&w={w}&h={h}', wait_until='load')
        try:
            await pg.wait_for_function('window.labReady===true', timeout=240000)
        except Exception:
            print('\n'.join(logs[-20:])); raise
        total = a.frames or await pg.evaluate('window.labFrames')
        frames = []
        for i in range(total):
            info = await pg.evaluate(f'window.labFrame({i},{a.fps})')
            path = f'{a.out}/f{i:03d}.png'
            await pg.screenshot(path=path)
            frames.append(Image.open(path).convert('RGB'))
            if i % 12 == 0: print(i, info, flush=True)
        await b.close()
    small = [f.resize((w * a.gif_width // w, h * a.gif_width // w), Image.LANCZOS) for f in frames]
    pal = [f.quantize(colors=200, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.FLOYDSTEINBERG) for f in small]
    pal[0].save(f'{a.out}.gif', save_all=True, append_images=pal[1:], duration=round(1000 / a.fps), loop=0, optimize=True)
    picks = [frames[round(k * (len(frames) - 1) / 7)] for k in range(8)]
    tw, th = w // 2, h // 2
    sheet = Image.new('RGB', (tw * 4, th * 2))
    for k, f in enumerate(picks): sheet.paste(f.resize((tw, th)), ((k % 4) * tw, (k // 4) * th))
    sheet.save(f'{a.out}-sheet.png')
    if not a.keep:
        for f in os.listdir(a.out): os.remove(os.path.join(a.out, f))
        os.rmdir(a.out)
    print('saved', f'{a.out}.gif', f'{os.path.getsize(a.out + ".gif") / 1024:.0f} KB')


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--query', default='mode=transform'); ap.add_argument('--out', required=True)
    ap.add_argument('--url', default='http://127.0.0.1:4173'); ap.add_argument('--size', default='960x540')
    ap.add_argument('--fps', type=int, default=24); ap.add_argument('--frames', type=int, default=0)
    ap.add_argument('--gif-width', type=int, default=640); ap.add_argument('--keep', action='store_true')
    ap.add_argument('--chrome', default='/usr/bin/google-chrome')
    asyncio.run(main(ap.parse_args()))
