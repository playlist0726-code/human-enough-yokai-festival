# Mizu — Blender character study v01

Original e.v.e games one-eyed kappa, based on the user's supplied Mizu concept.

- `mizu-character-v01.blend`: editable character, packed seigaiha texture, seven-bone articulation rig, blink shape keys, studio camera and lighting. The original default scene is preserved separately.
- `mizu-character-v01.glb`: character only, with embedded texture and animation tracks. Approximately 3.6 MB. Studio is excluded.
- `mizu-portrait.png`: actual Cycles render of this model.

In Blender, use the scene **EVE • MIZU Character Studio**. Frames 1–120 at 30 fps show a breathing idle; blink closes around frames 41 and 99. Press Space over the viewport to play.

This is a first editable 3D design study. Parts are attached to bones with rigid parenting. It does not yet have a production deforming skin, walking/jumping/actions, human disguise, collision, LODs, or integration into the running game. Detailed cloth noise and some studio shading are Blender-specific; the portable GLB uses the supported material properties and embedded base-color tile.

Rebuild in a fresh scene by running `build_mizu.py`, `finish_mizu.py`, then `present_mizu.py`, in that order. The last script renders and saves the deliverables. Each build creates a new scene rather than deleting the user's existing scene.
