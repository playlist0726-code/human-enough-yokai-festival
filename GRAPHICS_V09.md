# Festival graphics pass v09

The supplied October 22 gameplay recording was used as a visual reference for rounded silhouettes, coherent painted surfaces, broadleaf foliage, readable characters, and restrained HUD placement. The festival keeps its original yokai cast, mountain layout, night setting and cooperative rules.

## Changes

- 30 forked trees with roots and 5,400 individual, curved, volumetric leaves. Per-instance color variation and a slow shader breeze; tree leaves, blossoms, grass and flowers share four instanced draws, plus one merged trunk draw. Small ground leaves use simpler geometry.
- Deterministic meadow placement avoids the main lane, stall entrances and potion pickups. Grass ground color has broad painted variation and tiny leaf motifs.
- A narrower path uses actual rounded paving meshes with five colors and terrain-aligned placement. Stepping stones connect all six booths.
- Ribbed paper lanterns have a generated paper texture, shaped silhouette, caps and tassels. Higher strings leave the central view open.
- Stalls have patterned aprons, back boards, roof ties, ropes and warmer local lights.
- Softer contact shadows, revised moon/fill/rim lighting, more polished yokai surfaces and larger human heads improve character readability.
- The camera sits at a more elevated three-quarter angle. Own-name labels are hidden, other-player names are smaller, and human names appear nearby. HUD cards occupy less space and preserve existing controls.

## Validation

- Syntax checks pass, including the new foliage module.
- All 53 unit tests pass, including garden placement, finite mesh bounds, batching budget and outward-facing leaf normals.
- Both real-socket integration tests pass.
- Browser checks covered desktop (1280 × 800) and the original narrow viewport, walking to a stall, jump, potion use, and entering Goldfish Scooping.
- Screenshots are in `artifacts/graphics-v09/`. The desktop high-quality scene reported 120 FPS on this computer during the sampled interval; this is not a guarantee for other devices.

This is an upgrade to the existing procedural game art. Matching the supplied commercial game's final visual quality still needs authored character meshes, sculpted faces/hair, richer booth props, texture work and animation polish. The current code is ready to replace individual procedural assets with those production assets without rewriting multiplayer rules.
