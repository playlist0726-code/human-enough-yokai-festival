"""Shared bpy helpers for the festival kit (R04). Imported by every env build.py.

Conventions (ASSET_CONTRACT 1 & 8): Y-up in glTF (Blender Z-up is converted by the exporter),
front = +Z in game = -Y in Blender, 1 unit = 1 m, origin at the centre of the footprint on the
ground. All helpers below take GAME coordinates (x, y_up, z_front) so build scripts read like
the runtime code; they are converted to Blender axes internally.

Materials are shared across the kit by name, so the runtime can merge every stall into one
draw call per material:
  kit_wood  kit_cloth  kit_paint  (textured, tinted by vertex colour)
  kit_water (replaced at runtime by the animated water shader)
  kit_glow  (emissive, lantern paper / signs)
"""
import math
import os
import bpy  # noqa: F401  (must come before bmesh in the pip bpy module)
import bmesh
from mathutils import Matrix, Vector

KIT = os.path.dirname(os.path.abspath(__file__))
TEX = os.path.join(KIT, 'textures')
# texture tile size in metres
TILE = {'kit_wood': 1.0, 'kit_cloth': 1.1, 'kit_paint': 1.5, 'kit_water': 2.0, 'kit_glow': 1.0, 'kit_stone': 1.6}
MATS = {
    'kit_wood': {'tex': 'kit_wood.png', 'rough': .82},
    'kit_cloth': {'tex': 'kit_cloth.png', 'rough': .95},
    'kit_paint': {'tex': 'kit_paint.png', 'rough': .55},
    'kit_stone': {'tex': 'kit_stone.png', 'rough': .92},
    'kit_water': {'tex': None, 'rough': .1, 'color': (.18, .42, .55, 1)},
    'kit_glow': {'tex': 'kit_paint.png', 'rough': .7, 'emit': 1.0},
}


def g2b(x, y, z):
    """game (x, up, front) -> blender (x, -front, up)"""
    return Vector((x, -z, y))


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for m in list(bpy.data.materials):
        bpy.data.materials.remove(m)


_mats = {}


def material(name):
    if name in _mats:
        return _mats[name]
    spec = MATS[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes.get('Principled BSDF')
    bsdf.inputs['Roughness'].default_value = spec['rough']
    vc = nt.nodes.new('ShaderNodeVertexColor')
    vc.layer_name = 'Color'
    mix = nt.nodes.new('ShaderNodeMix')
    mix.data_type = 'RGBA'
    mix.blend_type = 'MULTIPLY'
    mix.inputs['Factor'].default_value = 1.0
    if spec['tex']:
        img = bpy.data.images.load(os.path.join(TEX, spec['tex']))
        tex = nt.nodes.new('ShaderNodeTexImage')
        tex.image = img
        nt.links.new(tex.outputs['Color'], mix.inputs['A'])
    else:
        mix.inputs['A'].default_value = spec['color']
    nt.links.new(vc.outputs['Color'], mix.inputs['B'])
    nt.links.new(mix.outputs['Result'], bsdf.inputs['Base Color'])
    if spec.get('emit'):
        bsdf.inputs['Emission Strength'].default_value = spec['emit']
        nt.links.new(mix.outputs['Result'], bsdf.inputs['Emission Color'])
    _mats[name] = m
    return m


def hexcol(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)) + (1.0,)


class Builder:
    """Collects parts into one bmesh per material, then writes one object per asset."""

    def __init__(self, name):
        self.name = name
        self.parts = {}  # material -> bmesh

    def bm(self, mat):
        if mat not in self.parts:
            b = bmesh.new()
            b.loops.layers.uv.new('UVMap')
            b.loops.layers.color.new('Color')
            self.parts[mat] = b
        return self.parts[mat]

    def add(self, src, mat, color, grain='x', tile=None, matrix=None):
        """Merge bmesh `src` (game-space coordinates) into the material bucket with colour + box UVs."""
        dst = self.bm(mat)
        if matrix is not None:
            bmesh.ops.transform(src, matrix=matrix, verts=src.verts)
        # game -> blender axes
        conv = Matrix(((1, 0, 0, 0), (0, 0, -1, 0), (0, 1, 0, 0), (0, 0, 0, 1)))
        bmesh.ops.transform(src, matrix=conv, verts=src.verts)
        src.normal_update()
        col = hexcol(color) if isinstance(color, str) else color
        t = tile or TILE[mat]
        vmap = {}
        for v in src.verts:
            vmap[v] = dst.verts.new(v.co)
        uv = dst.loops.layers.uv['UVMap']
        cl = dst.loops.layers.color['Color']
        # grain axis in blender space
        gaxis = {'x': 0, 'y': 2, 'z': 1}[grain]
        for f in src.faces:
            try:
                nf = dst.faces.new([vmap[v] for v in f.verts])
            except ValueError:
                continue
            nf.smooth = f.smooth
            n = f.normal
            dom = max(range(3), key=lambda i: abs(n[i]))
            axes = [i for i in range(3) if i != dom]
            if gaxis in axes:
                axes = [gaxis] + [a for a in axes if a != gaxis]
            for l in nf.loops:
                co = l.vert.co
                l[uv].uv = (co[axes[0]] / t, co[axes[1]] / t)
                l[cl] = col
        src.free()

    def build(self):
        mesh = bpy.data.meshes.new(self.name)
        merged = bmesh.new()
        merged.loops.layers.uv.new('UVMap')
        merged.loops.layers.color.new('Color')
        uv = merged.loops.layers.uv['UVMap']
        cl = merged.loops.layers.color['Color']
        mats = sorted(self.parts)
        for mi, mat in enumerate(mats):
            src = self.parts[mat]
            suv = src.loops.layers.uv['UVMap']
            scl = src.loops.layers.color['Color']
            vmap = {v: merged.verts.new(v.co) for v in src.verts}
            for f in src.faces:
                try:
                    nf = merged.faces.new([vmap[v] for v in f.verts])
                except ValueError:
                    continue
                nf.material_index = mi
                nf.smooth = f.smooth
                for a, b in zip(f.loops, nf.loops):
                    b[uv].uv = a[suv].uv
                    b[cl] = a[scl]
        bmesh.ops.remove_doubles(merged, verts=merged.verts, dist=1e-5)
        merged.to_mesh(mesh)
        merged.free()
        ca = mesh.color_attributes
        ca.active_color = ca['Color']
        ca.render_color_index = 0
        obj = bpy.data.objects.new(self.name, mesh)
        bpy.context.scene.collection.objects.link(obj)
        for mat in mats:
            obj.data.materials.append(material(mat))
        # auto-smooth-like result: sharp edges stay flat because faces were built flat-shaded per part
        return obj


# ---------- primitives (game coordinates) ----------

def _box_bm(sx, sy, sz, bevel=0.0, segs=1):
    b = bmesh.new()
    bmesh.ops.create_cube(b, size=1.0)
    bmesh.ops.scale(b, vec=Vector((sx, sy, sz)), verts=b.verts)
    if bevel > 0:
        bmesh.ops.bevel(b, geom=list(b.edges), offset=min(bevel, sx * .45, sy * .45, sz * .45), segments=segs, affect='EDGES', profile=.5)
    return b


def box(B, mat, color, x, y, z, sx, sy, sz, bevel=.02, segs=1, rot=(0, 0, 0), grain='x', tile=None):
    """Box centred at (x, y, z), size (sx, sy, sz) in game axes; rot = (rx, ry, rz) radians, game axes."""
    b = _box_bm(sx, sy, sz, bevel, segs)
    M = Matrix.Translation((x, y, z)) @ euler(rot)
    B.add(b, mat, color, grain, tile, M)


def euler(rot):
    rx, ry, rz = rot
    return Matrix.Rotation(ry, 4, 'Y') @ Matrix.Rotation(rx, 4, 'X') @ Matrix.Rotation(rz, 4, 'Z')


def cyl(B, mat, color, x, y, z, r, h, segs=12, r2=None, rot=(0, 0, 0), smooth=True, caps=True, tile=None, grain='z'):
    """Cylinder along game Y (up), centred at (x, y, z)."""
    b = bmesh.new()
    bmesh.ops.create_cone(b, cap_ends=caps, cap_tris=False, segments=segs, radius1=r, radius2=r if r2 is None else r2, depth=h)
    # cone is along Z (blender-local) -> make it game-up (Y)
    bmesh.ops.rotate(b, verts=b.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(-math.pi / 2, 3, 'X'))
    for f in b.faces:
        f.smooth = smooth and len(f.verts) == 4
    M = Matrix.Translation((x, y, z)) @ euler(rot)
    B.add(b, mat, color, grain, tile, M)


def sphere(B, mat, color, x, y, z, rx, ry=None, rz=None, segs=10, rings=6, rot=(0, 0, 0)):
    b = bmesh.new()
    bmesh.ops.create_uvsphere(b, u_segments=segs, v_segments=rings, radius=1.0)
    bmesh.ops.scale(b, vec=Vector((rx, ry or rx, rz or rx)), verts=b.verts)
    for f in b.faces:
        f.smooth = True
    M = Matrix.Translation((x, y, z)) @ euler(rot)
    B.add(b, mat, color, 'x', None, M)


def torus(B, mat, color, x, y, z, R, r, segs=16, csegs=6, rot=(0, 0, 0)):
    b = bmesh.new()
    verts = []
    for i in range(segs):
        a = i / segs * 2 * math.pi
        ring = []
        for j in range(csegs):
            c = j / csegs * 2 * math.pi
            p = Vector(((R + r * math.cos(c)) * math.cos(a), r * math.sin(c), (R + r * math.cos(c)) * math.sin(a)))
            ring.append(b.verts.new(p))
        verts.append(ring)
    for i in range(segs):
        for j in range(csegs):
            f = b.faces.new([verts[i][j], verts[(i + 1) % segs][j], verts[(i + 1) % segs][(j + 1) % csegs], verts[i][(j + 1) % csegs]])
            f.smooth = True
    bmesh.ops.recalc_face_normals(b, faces=b.faces)
    M = Matrix.Translation((x, y, z)) @ euler(rot)
    B.add(b, mat, color, 'x', None, M)


def grid(B, mat, color, fn, nu, nv, grain='x', tile=None, double=False):
    """Parametric surface: fn(u, v) -> (x, y, z) game coords, u, v in [0, 1]."""
    b = bmesh.new()
    vs = [[b.verts.new(Vector(fn(i / nu, j / nv))) for j in range(nv + 1)] for i in range(nu + 1)]
    for i in range(nu):
        for j in range(nv):
            f = b.faces.new([vs[i][j], vs[i + 1][j], vs[i + 1][j + 1], vs[i][j + 1]])
            f.smooth = True
    if double:
        # give cloth a back face with a small offset so it reads from below
        bmesh.ops.solidify(b, geom=list(b.faces), thickness=.025)
    B.add(b, mat, color, grain, tile)


def export(obj, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_apply=True,
                              export_vertex_color='ACTIVE', export_yup=True, export_image_format='AUTO',
                              export_image_quality=88, export_materials='EXPORT', export_normals=True,
                              export_texcoords=True, export_extras=False)
    print('exported', path, os.path.getsize(path), 'bytes')


def tri_count(obj):
    return sum(len(p.vertices) - 2 for p in obj.data.polygons)
