# Expressive character movement

All seven playable yokai, all nine visitors and all six stall keepers use the updated movement system. `public/motion-study.html` shows the same live game rigs, with Walk, Idle, Jump, Potion, Charm and Cover controls.

- Travel measured from the rendered world position advances each actor's step phase. Held input while blocked does not produce running in place. The step phase follows distance at 30, 60 and 120 FPS.
- Feet have a separate hierarchy from the upper body. Knees flex, the stance shoe tracks the ground, and the upper body shifts weight, leans into turns and blends between starts/stops.
- Heads, eyes, hands, ears, clothing hems and hip bottles have small idle and secondary movements. Action poses blend in/out instead of replacing the walk pose instantly.
- Mizu takes careful steps; Pon waddles and breathes through his belly-mouth; Kon has a skinned flexible neck and independent twin tails; Sumi's heads and wings move at different phases; Nemu's skinned tail carries its independently expressive face; Akari's three lanterns form an articulated stack; Kasa hops on one foot while its umbrella tassels sway.
- Flexible neck/tail geometry uses real bones and normalized skin weights. Robes have two hem morph targets. Rigid batching explicitly preserves both skinned meshes and morph targets.
- Visitors now animate from their interpolated positions, avoiding an old pattern where each 10 Hz snapshot triggered just one frame of walking. Shop keepers use the same idle rig with their shop gestures layered on top.

Validation: syntax checks and 61 unit tests pass, including all-seven idle/gait/action coverage, deforming skin geometry, frame-rate independence, stationary collision behavior and world-space stance-foot contact. In-browser checks cover the rehearsal and actual pathfinding travel in the festival. Animation changes do not alter server speed, collision, abilities or rewards.
