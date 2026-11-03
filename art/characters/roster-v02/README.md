# Human Enough! — Blender roster v02

23 original editable models, connected to the running game:

- Seven yokai: Mizu, Pon, Kon, Sumi, Nemu, Akari, Kasa.
- Seven matching human disguises, with distinct hair, outfit patterns and colors.
- Nine festival guest models, also used for booth keepers.

Each named folder contains an editable `.blend` studio scene and its portable `.glb`. `eve-roster-v02.blend` contains all seven yokai and their human disguises together. `yokai-roster.png` and `human-roster.png` are actual renders of these models.

The game loads copies from `public/assets/models/` through `public/model-assets.mjs`. The runtime animates the real model bones for walking, breathing, jumping, drinking, charming and covering. Existing game timing, transformation and partial-reveal rules remain authoritative on the server. Matching imported parts are rigidly attached to bones; these are stylized articulated models, not a final full-body deformation/cloth simulation system.

`manifest.json` records all 23 asset paths. `build_all.py` regenerates individual files in isolated Blender jobs, avoiding the live scene library-writing crash. `render_gallery.py` creates the combined gallery and reference renders. The first detailed Mizu source is retained separately in `../mizu-blender/`.

Scene conventions: Blender Z-up, front -Y; GLB exported Y-up. The game normalizes height and ground contact, so imported scales do not alter collisions or player speed. Embedded textures avoid external asset links. Detailed Blender-only studio lighting is not baked into gameplay.
