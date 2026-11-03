# Weighted character roster v03

All 23 production models now use weighted armature deformation for the yukata and sleeves. Kon's neck and Nemu's face-bearing tail also have two extra joints, with their head/mask following the end of the chain. Runtime motion adds delayed sway and moving hems, alongside walk, blink, jump, drink, charm and cover poses.

Each character folder contains an editable `.blend`, the exported `.glb` and a `deformation.json` inventory. The native sources include a short Walk preview action (frames 1–48); the game animates these bones itself. `eve-roster-v03.blend` is the combined gallery, and the two roster PNGs are actual Blender renders. The previous v02 sources remain preserved.

`refine_rigs.py` refines one v02 character, and `refine_all.py` regenerates the complete roster. Rebuilding writes the current GLBs to `public/assets/models/`. Each scene contains its character and studio; the combined gallery includes the 14 player forms. NPC source files are individual.

These are stylized editable game models. Clothes use skin weights and secondary motion, rather than a real-time cloth solver. Faces and most solid anatomical parts still use rigid bone articulation.
