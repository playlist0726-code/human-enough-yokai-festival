"""Sumi paint pass (clean_character.py hook): the generator washed the eye whites out to pale cream.
Restore the turnaround's warm yellow (#f2e27a) on the eye-white texels only, found by rasterising
the UVs of eye-region faces whose baked colour is pale-yellow. Pupils and highlights are untouched."""
import colorsys
from PIL import Image, ImageDraw

EYE_BOX = (-0.18, -0.4, 0.71, 0.18, -0.05, 0.89)   # fractions of height, same as the eyes class
TARGET = (0.947, 0.886, 0.478)                      # #f2e27a in display space


def paint(cfg, lo, imgs, np):
    import charkit as K
    base = imgs['base']
    w, h = base.size
    px = np.array(base.pixels[:], dtype=np.float32).reshape(h, w, 4)
    H = cfg['height_m']
    lo_b = [v * H for v in EYE_BOX[:3]]; hi_b = [v * H for v in EYE_BOX[3:]]
    uv = lo.data.uv_layers.active.data
    mask = Image.new('L', (w, h), 0)
    draw = ImageDraw.Draw(mask)
    n = 0
    for poly in lo.data.polygons:
        c = poly.center
        if not all(lo_b[i] <= c[i] <= hi_b[i] for i in range(3)):
            continue
        u = sum(uv[i].uv.x for i in poly.loop_indices) / len(poly.loop_indices)
        v = sum(uv[i].uv.y for i in poly.loop_indices) / len(poly.loop_indices)
        r, g, b, _ = px[min(h - 1, int(v * h)), min(w - 1, int(u * w))]
        hh, ss, vv = colorsys.rgb_to_hsv(r ** (1 / 2.2), g ** (1 / 2.2), b ** (1 / 2.2))
        if 0.1 <= hh <= 0.2 and vv >= 0.8:   # beak base is h~0.07, v<=0.76
            draw.polygon([(uv[i].uv.x * w, uv[i].uv.y * h) for i in poly.loop_indices], fill=255)
            n += 1
    m = np.asarray(mask, dtype=np.float32) / 255.0
    # grow the mask by 2 px so UV seams do not leave a cream rim
    for _ in range(2):
        m = np.maximum.reduce([m, np.roll(m, 1, 0), np.roll(m, -1, 0), np.roll(m, 1, 1), np.roll(m, -1, 1)])
    disp = np.clip(px[..., :3], 0, 1) ** (1 / 2.2)
    lum = disp.mean(-1, keepdims=True)
    # keep only pale texels (pupils/highlight dots stay as baked); keep the baked shading via luminance
    pale = (lum[..., 0] > 0.55) & (disp.min(-1) > 0.35)
    k = (m * pale)[..., None]
    tinted = np.clip(np.array(TARGET, dtype=np.float32) * (lum / 0.86), 0, 1)
    out = disp * (1 - k) + tinted * k
    px[..., :3] = out ** 2.2
    base.pixels[:] = px.ravel()
    K.log('paint: eye whites tinted on', n, 'faces,', int(k.sum()), 'texels')
