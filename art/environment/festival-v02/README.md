# Mountain festival scenery v02

`festival-scenery-kit.blend` and `.glb` preserve the new static geometry used by `public/festival-scenery.mjs`: the continuous surrounding landscape, 360-degree mountain ridges, valley village, shrine, two torii, wisteria structures, cherry trees and stone lantern avenue.

The live module supplies animated sky, water, drifting petals and camera-obstruction fading. Those runtime shaders are intentionally excluded from the portable static kit. Existing festival stalls, path, minigames, lantern strings and foliage remain in `public/festival.mjs` and `public/foliage.mjs`.

Regenerate the portable kit with `node scripts/export-festival-scenery.mjs`, then run `import_kit.py` in Blender to refresh the editable scene.
