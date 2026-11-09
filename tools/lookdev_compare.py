#!/usr/bin/env python3
"""Side-by-side comparison board: concept art | before | after (same game-camera framing).

Usage:
    python3 -I tools/lookdev_compare.py --out board.jpg --title "Start" \
        --concept public/assets/festival.png[:x0,y0,x1,y1] --before before.png --after after.png [--width 1920]

Each panel is scaled to the same height; luminance stats (mean, % dark < 0.25) are printed
under each panel so the night-look target (ART_BIBLE 2: >= 60% dark side) can be checked.
"""
import argparse
from PIL import Image, ImageDraw, ImageFont, ImageStat


def load(spec):
    path, _, crop = spec.partition(':')
    im = Image.open(path).convert('RGB')
    if crop:
        im = im.crop(tuple(int(v) for v in crop.split(',')))
    return im


def stats(im):
    g = im.convert('L').resize((320, 180))
    px = list(g.getdata())
    dark = sum(1 for v in px if v < 64) / len(px)
    return ImageStat.Stat(g).mean[0] / 255, dark


def main(a):
    panels = [('Concept', load(a.concept))] + ([('Before', load(a.before))] if a.before else []) + [('After (R02)', load(a.after))]
    W = a.width
    pw = W // len(panels)
    ph = int(pw * 9 / 16)
    board = Image.new('RGB', (W, ph + 70), '#101320')
    d = ImageDraw.Draw(board)
    try:
        font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 20)
        small = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 15)
    except OSError:
        font = small = ImageFont.load_default()
    for i, (label, im) in enumerate(panels):
        # cover-fit into 16:9 panel
        r = max(pw / im.width, ph / im.height)
        im2 = im.resize((int(im.width * r), int(im.height * r)), Image.LANCZOS)
        x0, y0 = (im2.width - pw) // 2, (im2.height - ph) // 2
        board.paste(im2.crop((x0, y0, x0 + pw, y0 + ph)), (i * pw, 40))
        mean, dark = stats(im)
        d.text((i * pw + 12, 10), f'{a.title} · {label}', fill='#f4efe6', font=font)
        d.text((i * pw + 12, ph + 46), f'mean luminance {mean:.2f} · dark side {dark*100:.0f}%', fill='#c9c3b6', font=small)
    board.save(a.out, quality=88)
    print('saved', a.out)


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', required=True)
    ap.add_argument('--title', default='')
    ap.add_argument('--concept', required=True)
    ap.add_argument('--before')
    ap.add_argument('--after', required=True)
    ap.add_argument('--width', type=int, default=1920)
    main(ap.parse_args())
