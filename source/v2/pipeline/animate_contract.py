"""Stage 3 — keyframe the 14 contract clips (30 fps, in place, no root motion).

  .venv-bpy/bin/python source/v2/pipeline/animate_contract.py source/v2/characters/<id>/character.json

Reads build/v2/<id>/rigged.blend, writes build/v2/<id>/animated.blend and
build/v2/<id>/gait.json (walk/run speeds measured from the planted foot, for defs/<id>.json).

Clip shapes come from motion_lib.py; the character's personality from
source/v2/characters/<id>/motion.py (STYLE overrides, CLIPS replacements, SECONDARY follow-through).
Pose solving is pure Python FK (no depsgraph): legs use analytic 2-bone IK toward foot targets so
planted feet stay put, x_ bones get spring-like follow-through from their head's acceleration.
Upper-body clips get no Hips/leg keys (contract §5).
"""
import copy, importlib.util, math, os, sys
import bpy
from mathutils import Vector, Matrix, Quaternion
sys.path.insert(0, os.path.dirname(__file__))
import charkit as K
import motion_lib as ML

LEG_BONES = {'Hips', 'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'LeftToeBase', 'RightUpLeg', 'RightLeg', 'RightFoot', 'RightToeBase'}


class Ctx:
    pass


def load_character_motion(cfg):
    # `motion_file` in the config (repo-relative), else motion.py beside the config
    path = K.repo_path(cfg['motion_file']) if cfg.get('motion_file') else os.path.join(cfg['_dir'], 'motion.py')
    style, clips, secondary = copy.deepcopy(ML.DEFAULT_STYLE), dict(ML.CLIPS), {}
    if os.path.exists(path):
        spec = importlib.util.spec_from_file_location(f"motion_{cfg['id']}", path)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        for k, v in getattr(mod, 'STYLE', {}).items():
            if isinstance(v, dict) and isinstance(style.get(k), dict):
                style[k].update(v)
            else:
                style[k] = v
        clips.update(getattr(mod, 'CLIPS', {}))
        secondary = getattr(mod, 'SECONDARY', {})
    return style, clips, secondary


class Solver:
    """FK in armature space: P(b) = P(parent) @ (R(parent)^-1 @ R(b)) @ B(b)."""

    def __init__(self, arm):
        self.arm = arm
        self.bones = []
        def walk(b):
            self.bones.append(b)
            for c in b.children:
                walk(c)
        for b in arm.data.bones:
            if not b.parent:
                walk(b)
        self.R = {b.name: b.matrix_local.copy() for b in self.bones}
        self.rel = {b.name: (self.R[b.parent.name].inverted() @ self.R[b.name]) if b.parent else self.R[b.name].copy()
                    for b in self.bones}
        self.parent = {b.name: (b.parent.name if b.parent else None) for b in self.bones}
        self.names = {b.name for b in self.bones}

    def head_rest(self, name):
        return self.R[name].to_translation()

    def basis_from_delta(self, name, q, scale=None):
        rr = self.R[name].to_quaternion()
        m = (rr.inverted() @ q @ rr).to_matrix().to_4x4()
        if scale:
            m = m @ Matrix.Diagonal((*scale, 1.0))
        return m

    def parent_frame(self, name, P):
        par = self.parent[name]
        return (P[par] @ self.rel[name]) if par else self.rel[name]

    def solve(self, pose, ctx):
        B, P = {}, {}
        for b in self.bones:
            n = b.name
            q = pose.rot.get(n, Quaternion())
            B[n] = self.basis_from_delta(n, q, pose.scale.get(n))
            if n == 'Hips':
                rr = self.R[n].to_quaternion()
                B[n] = Matrix.Translation(rr.inverted() @ pose.hips) @ B[n]
            if n.endswith('UpLeg') and pose.feet.get(n[0]):
                continue  # filled by IK below once the hips are known
            if n.endswith(('Leg', 'Foot', 'ToeBase')) and not n.endswith('UpLeg') and pose.feet.get(n[0]):
                continue
            P[n] = self.parent_frame(n, P) @ B[n]
            if b.children:
                pass
        # IK legs (after hips/spine are solved); children of legs are re-solved afterwards
        for side in ('L', 'R'):
            tgt = pose.feet.get(side)
            if tgt is None:
                continue
            pre = 'Left' if side == 'L' else 'Right'
            up, lo, ft = pre + 'UpLeg', pre + 'Leg', pre + 'Foot'
            frame_up = self.parent_frame(up, P)
            hip = frame_up.to_translation()
            a = (self.head_rest(lo) - self.head_rest(up)).length
            bl = (self.head_rest(ft) - self.head_rest(lo)).length
            d_vec = tgt - hip
            d = max(abs(a - bl) + 1e-4, min(a + bl - 1e-4, d_vec.length))
            dn = d_vec.normalized()
            # knee bends toward the character's forward (-Y in the hips frame) + slightly outward
            fwd = P['Hips'].to_quaternion() @ Vector((0.18 * (1 if side == 'L' else -1), -1, 0))
            perp = (fwd - dn * fwd.dot(dn)).normalized()
            cos_a = (a * a + d * d - bl * bl) / (2 * a * d)
            ang = math.acos(max(-1, min(1, cos_a)))
            knee = hip + dn * (a * math.cos(ang)) + perp * (a * math.sin(ang))
            ankle = hip + dn * d
            for name, frm, head, to in ((up, frame_up, hip, knee), (lo, None, knee, ankle)):
                if frm is None:
                    frm = self.parent_frame(name, P)
                cur = frm.to_quaternion()
                ycur = cur @ Vector((0, 1, 0))
                want = cur.copy()
                want.rotate(ycur.rotation_difference((to - head).normalized()))
                desired = Matrix.Translation(frm.to_translation()) @ want.to_matrix().to_4x4()
                B[name] = Matrix.Diagonal((1, 1, 1, 1)) @ (frm.inverted() @ desired)
                B[name] = B[name].to_quaternion().to_matrix().to_4x4()
                P[name] = frm @ B[name]
            # foot: keep the rest orientation in armature space, plus hips yaw and pitch
            frm = self.parent_frame(ft, P)
            yaw = P['Hips'].to_quaternion().to_euler().z
            want = Quaternion((0, 0, 1), yaw * 0.5) @ ML.Q(x=-pose.foot_pitch.get(side, 0.0)) @ pose.rot.get(ft, Quaternion()) @ self.R[ft].to_quaternion()
            desired = Matrix.Translation(frm.to_translation()) @ want.to_matrix().to_4x4()
            B[ft] = (frm.inverted() @ desired).to_quaternion().to_matrix().to_4x4()
            P[ft] = frm @ B[ft]
        # anything still unsolved (toes, children of IK bones)
        for b in self.bones:
            if b.name not in P:
                P[b.name] = self.parent_frame(b.name, P) @ B[b.name]
        return B, P


def secondary_pass(solver, frames, sec, loop, fps):
    """Follow-through for x_ bones: tilt against the acceleration of the bone head (spring-ish)."""
    if not sec:
        return
    n = len(frames)
    for bone, s in sec.items():
        if bone not in solver.names:
            continue
        pos = [P[bone].to_translation() for B, P in frames]
        # rotation of the head's own frame matters too (dish sloshes when the head turns)
        acc = []
        for i in range(n):
            if loop:
                a, b, c = pos[(i - 1) % n], pos[i], pos[(i + 1) % n]
            else:
                a, b, c = pos[max(0, i - 1)], pos[i], pos[min(n - 1, i + 1)]
            acc.append((a + c - 2 * b) * fps * fps)
        # smooth + delay (lag) for a softer follow-through
        lag = s.get('lag', 2)
        gain = s.get('gain', 0.6)      # degrees per (m/s^2)
        limit = s.get('limit', 18)
        squash = s.get('squash', 0.0)
        for i, (B, P) in enumerate(frames):
            j = (i - lag) % n if loop else max(0, i - lag)
            win = [acc[(j + k) % n] if loop else acc[min(n - 1, max(0, j + k))] for k in (-1, 0, 1)]
            av = sum(win, Vector()) / 3
            rx = max(-limit, min(limit, av.y * gain))   # forward accel -> tips back
            ry = max(-limit, min(limit, -av.x * gain))  # sideways accel -> tips the other way
            q = ML.Q(x=rx, y=ry)
            frm = solver.parent_frame(bone, P)
            cur = frm.to_quaternion() @ B[bone].to_quaternion()
            desired = Matrix.Translation(frm.to_translation()) @ (q @ cur).to_matrix().to_4x4()
            nb = frm.inverted() @ desired
            if squash:
                st = 1 + max(-0.12, min(0.12, -av.z * squash))
                nb = nb @ Matrix.Diagonal((1 / math.sqrt(st), st, 1 / math.sqrt(st), 1))
            B[bone] = nb


def key_clip(arm, solver, name, frames, upper):
    act = bpy.data.actions.new(name)
    act.use_fake_user = True
    arm.animation_data_create()
    arm.animation_data.action = act
    pbs = arm.pose.bones
    for f, (B, P) in enumerate(frames):
        for n, m in B.items():
            if upper and n in LEG_BONES:
                continue
            pb = pbs[n]
            loc, rot, sca = m.decompose()
            pb.rotation_mode = 'QUATERNION'
            pb.rotation_quaternion = rot
            pb.keyframe_insert('rotation_quaternion', frame=f, group=n)
            if n == 'Hips':
                pb.location = loc
                pb.keyframe_insert('location', frame=f, group=n)
            if any(abs(c - 1) > 1e-4 for c in sca) or n in ('Spine1', 'Head') or n.startswith('x_'):
                pb.scale = sca
                pb.keyframe_insert('scale', frame=f, group=n)
    arm.animation_data.action = None
    for pb in pbs:
        pb.rotation_quaternion = Quaternion()
        pb.location = Vector()
        pb.scale = Vector((1, 1, 1))
    return act


def measure_speed(solver, frames, side, fps):
    """Ground speed (m/s) of the planted foot over the cycle = treadmill speed of the clip."""
    ft = ('Left' if side == 'L' else 'Right') + 'Foot'
    ys = [P[ft].to_translation() for B, P in frames]
    zmin = min(p.z for p in ys)
    planted = [i for i, p in enumerate(ys) if p.z < zmin + 0.004]
    if len(planted) < 2:
        return 0.0
    v = [(ys[i + 1].y - ys[i].y) * fps for i in planted if i + 1 < len(ys) and i + 1 in planted]
    return sum(v) / len(v) if v else 0.0


def run(cfg_path):
    cfg = K.load_config(cfg_path)
    K.open_blend(K.build_path(cfg, 'rigged.blend'))
    arm = bpy.data.objects['Armature']
    bpy.context.scene.render.fps = ML.FPS  # contract: 30 fps (Blender defaults to 24)
    bpy.context.scene.render.fps_base = 1.0
    for a in list(bpy.data.actions):
        bpy.data.actions.remove(a)
    solver = Solver(arm)
    style, clips, secondary = load_character_motion(cfg)
    ctx = Ctx()
    ctx.J = {n: solver.head_rest(n) for n in solver.names}
    ctx.style = style
    ctx.cfg = cfg
    gait = {}
    for name, fn in clips.items():
        nf = style[name]['frames']
        loop = name in ML.LOOPING
        frames = []
        for f in range(nf + 1):
            t = (f % nf if loop else f) / ML.FPS
            frames.append(solver.solve(fn(t, ctx), ctx))
        secondary_pass(solver, frames[:-1] if loop else frames, secondary, loop, ML.FPS)
        if loop:
            frames[-1] = frames[0]
        key_clip(arm, solver, name, frames, name in ML.UPPER)
        if name in ('walk', 'run'):
            gait[name] = round(measure_speed(solver, frames[:-1], 'L', ML.FPS), 4)
        K.log(f'clip {name:13s} {nf:3d} frames{" loop" if loop else ""}')
    h = cfg['height_m']
    form = cfg.get('form', 'yokai')
    unit = {'yokai': 2.85, 'human': 2.55}[form] / h  # runtime normalises height to these units
    out = {'walk_mps': gait.get('walk'), 'run_mps': gait.get('run'),
           'walkSpeed': round((gait.get('walk') or 0) * unit, 3), 'runSpeed': round((gait.get('run') or 0) * unit, 3)}
    K.write_json(K.build_path(cfg, 'gait.json'), out)
    K.log('gait', out)
    K.save_blend(K.build_path(cfg, 'animated.blend'))


if __name__ == '__main__':
    run(K.config_arg())
