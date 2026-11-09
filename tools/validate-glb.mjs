#!/usr/bin/env node
// Human Enough! remaster — GLB asset contract validator (v1)
// Usage: node tools/validate-glb.mjs <file.glb> [--profile player|disguise|guest|prop|env] [--json]
// Checks a .glb against docs/production/ASSET_CONTRACT.md. No dependencies.
import fs from 'node:fs';
import path from 'node:path';

const PROFILES = {
  player:   {maxTris: 25000, maxMaterials: 4, maxTexture: 2048, maxImages: 4, maxBones: 64, maxBytes: 3_000_000, skinned: true,
             humanoid: true, sockets: ['socket_hand_R', 'socket_hip_L', 'socket_head_top'],
             clips: ['idle', 'walk', 'run', 'jump_start', 'jump_air', 'land', 'drink_potion', 'charm_cast', 'charm_hold', 'cover_ward', 'reveal_panic', 'hit', 'sealed', 'victory'],
             morphs: ['face_blink']},
  disguise: {maxTris: 15000, maxMaterials: 4, maxTexture: 2048, maxImages: 4, maxBones: 64, maxBytes: 2_000_000, skinned: true,
             humanoid: true, sockets: ['socket_hand_R', 'socket_hip_L', 'socket_head_top', 'socket_reveal'],
             clips: ['idle', 'walk', 'run', 'jump_start', 'jump_air', 'land', 'drink_potion', 'charm_cast', 'charm_hold', 'cover_ward', 'reveal_panic', 'hit', 'sealed', 'victory'],
             morphs: ['face_blink']},
  guest:    {maxTris: 8000, maxMaterials: 3, maxTexture: 1024, maxImages: 3, maxBones: 64, maxBytes: 1_000_000, skinned: true,
             humanoid: true, sockets: ['socket_head_top'],
             clips: ['idle', 'walk', 'charmed_walk', 'wait', 'cheer', 'talk'], morphs: []},
  prop:     {maxTris: 5000, maxMaterials: 2, maxTexture: 1024, maxImages: 3, maxBones: 0, maxBytes: 600_000, skinned: false, humanoid: false, sockets: [], clips: [], morphs: []},
  env:      {maxTris: 60000, maxMaterials: 8, maxTexture: 2048, maxImages: 8, maxBones: 0, maxBytes: 6_000_000, skinned: false, humanoid: false, sockets: [], clips: [], morphs: []},
};
const HUMANOID = ['Hips', 'Spine', 'Neck', 'Head',
  'LeftArm', 'LeftForeArm', 'LeftHand', 'RightArm', 'RightForeArm', 'RightHand',
  'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'RightUpLeg', 'RightLeg', 'RightFoot'];

const args = process.argv.slice(2);
const file = args.find(a => !a.startsWith('--'));
const profileName = (args[args.indexOf('--profile') + 1] && args.includes('--profile')) ? args[args.indexOf('--profile') + 1] : 'player';
const asJson = args.includes('--json');
if (!file || !PROFILES[profileName]) {
  console.error('Usage: node tools/validate-glb.mjs <file.glb> [--profile ' + Object.keys(PROFILES).join('|') + '] [--json]');
  process.exit(2);
}
const P = PROFILES[profileName];
const buf = fs.readFileSync(file);
if (buf.readUInt32LE(0) !== 0x46546c67) { console.error('Not a GLB file'); process.exit(2); }
const jsonLen = buf.readUInt32LE(12);
const gltf = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8'));
const binStart = 20 + jsonLen + 8;
const nodes = gltf.nodes || [];
const strip = n => (n || '').replace(/^.*?:/, '').replace(/^mixamorig\d*:?/i, '').replace(/^[a-z0-9-]+_(yokai|human|guest)__/, '');

// triangles + materials
let tris = 0; const usedMats = new Set(); let morphNames = new Set();
for (const m of gltf.meshes || []) {
  for (const p of m.primitives) {
    const mode = p.mode ?? 4;
    const count = p.indices !== undefined ? gltf.accessors[p.indices].count : gltf.accessors[p.attributes.POSITION].count;
    if (mode === 4) tris += count / 3; else if (mode === 5 || mode === 6) tris += Math.max(0, count - 2);
    if (p.material !== undefined) usedMats.add(p.material);
  }
  (m.extras?.targetNames || []).forEach(n => morphNames.add(n));
}
// draw calls ≈ mesh primitives instanced by nodes
let drawCalls = 0;
for (const n of nodes) if (n.mesh !== undefined) drawCalls += gltf.meshes[n.mesh].primitives.length;

// textures
const images = (gltf.images || []).map((img, i) => {
  let w = 0, h = 0, mime = img.mimeType || '';
  if (img.bufferView !== undefined) {
    const bv = gltf.bufferViews[img.bufferView];
    const b = buf.subarray(binStart + (bv.byteOffset || 0), binStart + (bv.byteOffset || 0) + bv.byteLength);
    if (b[0] === 0x89 && b[1] === 0x50) { w = b.readUInt32BE(16); h = b.readUInt32BE(20); mime = 'image/png'; }
    else if (b[0] === 0xff && b[1] === 0xd8) {
      for (let o = 2; o < b.length - 9;) {
        if (b[o] !== 0xff) break; const mk = b[o + 1], len = b.readUInt16BE(o + 2);
        if (mk >= 0xc0 && mk <= 0xc3) { h = b.readUInt16BE(o + 5); w = b.readUInt16BE(o + 7); break; }
        o += 2 + len;
      }
      mime = 'image/jpeg';
    } else if (b.subarray(1, 7).toString() === 'KTX 20') { w = b.readUInt32LE(20); h = b.readUInt32LE(24); mime = 'image/ktx2'; }
    else if (b.subarray(8, 12).toString() === 'WEBP') { mime = 'image/webp'; }
  }
  return {i, name: img.name || '', mime, w, h};
});

// skeleton
const jointIdx = new Set(); (gltf.skins || []).forEach(s => s.joints.forEach(j => jointIdx.add(j)));
const boneNames = [...jointIdx].map(j => strip(nodes[j].name));
const allNodeNames = nodes.map(n => strip(n.name));
const clips = (gltf.animations || []).map(a => a.name || '');
// bounds from POSITION min/max (ignores node transforms; approximate)
let minY = Infinity, maxY = -Infinity;
for (const m of gltf.meshes || []) for (const p of m.primitives) { const a = gltf.accessors[p.attributes.POSITION]; if (a.min && a.max) { minY = Math.min(minY, a.min[1]); maxY = Math.max(maxY, a.max[1]); } }

const results = [];
const check = (name, ok, detail, severity = 'error') => results.push({name, ok, detail, severity});
const bytes = buf.length;
check('file size', bytes <= P.maxBytes, `${(bytes / 1e6).toFixed(2)} MB (max ${(P.maxBytes / 1e6).toFixed(1)} MB, before meshopt/KTX2)`);
check('triangles', tris <= P.maxTris, `${Math.round(tris).toLocaleString()} (max ${P.maxTris.toLocaleString()})`);
check('materials', usedMats.size <= P.maxMaterials, `${usedMats.size} (max ${P.maxMaterials})`);
check('draw calls', drawCalls <= P.maxMaterials + 2, `${drawCalls} primitives (target ≤ ${P.maxMaterials + 2}; merge separate parts into one skinned mesh)`);
const bigTex = images.filter(t => t.w > P.maxTexture || t.h > P.maxTexture);
check('texture size', bigTex.length === 0, images.map(t => `${t.w}x${t.h} ${t.mime.replace('image/', '')}`).join(', ') || 'no textures', 'error');
check('texture count', images.length <= P.maxImages, `${images.length} images (max ${P.maxImages})`);
check('textured (not flat colour)', images.length >= 1 || profileName === 'env', images.length ? 'has texture maps' : 'no texture maps — flat colour materials read as toy/placeholder', 'warn');
const pot = images.filter(t => t.w && (t.w & (t.w - 1) || t.h & (t.h - 1)));
check('power-of-two textures', pot.length === 0, pot.length ? pot.map(t => `${t.w}x${t.h}`).join(', ') : 'ok', 'warn');
if (P.skinned) {
  check('skinned', jointIdx.size > 0, `${(gltf.skins || []).length} skin(s), ${jointIdx.size} joints`);
  check('bone count', jointIdx.size <= P.maxBones, `${jointIdx.size} (max ${P.maxBones})`);
}
if (P.humanoid) {
  const missing = HUMANOID.filter(b => !boneNames.includes(b));
  check('humanoid bones', missing.length === 0, missing.length ? 'missing: ' + missing.join(', ') : 'all 16 core bones present');
  const extras = boneNames.filter(b => !HUMANOID.includes(b) && !/^(Spine\d|Left|Right|Neck\d|HeadTop|socket_|x_)/.test(b));
  check('extra bone naming', extras.length === 0, extras.length ? 'rename with x_ prefix: ' + extras.slice(0, 12).join(', ') : 'ok', 'warn');
}
for (const s of P.sockets) check(`socket ${s}`, allNodeNames.includes(s), allNodeNames.includes(s) ? 'present' : 'missing empty/bone node');
if (P.clips.length) {
  const missing = P.clips.filter(c => !clips.includes(c));
  check('animation clips', missing.length === 0, missing.length ? `missing ${missing.length}/${P.clips.length}: ${missing.join(', ')}` : `all ${P.clips.length} present (+${clips.length - P.clips.length} extra)`);
}
for (const m of P.morphs) check(`morph ${m}`, morphNames.has(m), morphNames.has(m) ? 'present' : 'missing (or provide eye texture-swap instead)', 'warn');
check('grounded origin', !isFinite(minY) || Math.abs(minY) < 0.05 || jointIdx.size > 0, isFinite(minY) ? `min Y ${minY.toFixed(3)} (feet should sit at 0)` : 'n/a', 'warn');
const unnamed = clips.filter(c => !c || /^(Take|Armature|mixamo|Action)/i.test(c));
check('clip naming', unnamed.length === 0, unnamed.length ? 'rename: ' + unnamed.join(', ') : (clips.length ? clips.join(', ') : 'no clips'), clips.length ? 'error' : 'warn');

const errors = results.filter(r => !r.ok && r.severity === 'error').length;
const warns = results.filter(r => !r.ok && r.severity === 'warn').length;
if (asJson) {
  console.log(JSON.stringify({file: path.basename(file), profile: profileName, pass: errors === 0, errors, warns, results, clips, bones: boneNames}, null, 2));
} else {
  console.log(`\n${path.basename(file)}  ·  profile: ${profileName}`);
  for (const r of results) console.log(`${r.ok ? '  ✓' : r.severity === 'warn' ? '  !' : '  ✗'} ${r.name.padEnd(26)} ${r.detail}`);
  console.log(errors === 0 ? `\nPASS (${warns} warning${warns === 1 ? '' : 's'})` : `\nFAIL: ${errors} error(s), ${warns} warning(s)`);
}
process.exit(errors === 0 ? 0 : 1);
