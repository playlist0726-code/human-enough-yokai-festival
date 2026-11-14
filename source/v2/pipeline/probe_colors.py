"""Print the colour histogram the material rules see, inside a box (fractions of height).

  .venv-bpy/bin/python source/v2/pipeline/probe_colors.py <character.json> x0 y0 z0 x1 y1 z1

Values are the same HSV that clean_character.classify_faces uses (baked baseColor, then **(1/2.2)),
so dark saturated colours read lighter and less saturated than in an image editor
(Kon's navy yukata reads h0.7 s0.2 v0.7). Calibrate `materials` rules from this output.
"""
import collections, colorsys, os, sys
import bpy
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
import charkit as K

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
cfg = K.load_config(argv[0])
box = [float(v) for v in argv[1:7]]
K.open_blend(K.build_path(cfg, 'clean.blend'))
m = bpy.data.objects[cfg['id']]
H = cfg['height_m']
img = next(i for i in bpy.data.images if i.name.endswith('_baseColor'))
w, h = img.size
px = np.empty(w * h * 4, np.float32); img.pixels.foreach_get(px); px = px.reshape(h, w, 4)
uv = m.data.uv_layers.active.data
hist = collections.Counter()
for p in m.data.polygons:
    q = p.center / H
    if not all(box[i] <= q[i] <= box[i + 3] for i in range(3)):
        continue
    u = sum(uv[i].uv.x for i in p.loop_indices) / len(p.loop_indices)
    v = sum(uv[i].uv.y for i in p.loop_indices) / len(p.loop_indices)
    r, g, b, _ = px[int(v * h), int(u * w)]
    hh, ss, vv = colorsys.rgb_to_hsv(r ** (1 / 2.2), g ** (1 / 2.2), b ** (1 / 2.2))
    hist[(round(float(hh), 2), round(float(ss), 1), round(float(vv), 1))] += 1
for k, n in hist.most_common(20):
    print(f'h {k[0]:.2f}  s {k[1]:.1f}  v {k[2]:.1f}   {n} faces')
