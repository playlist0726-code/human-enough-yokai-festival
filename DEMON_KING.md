# Demon King invasion · playable implementation

The supplied 71-second trailer establishes a Demon King watching the crew through a crystal and the yokai protecting one another with golden talismans. The game now turns those ideas into a shared encounter rather than an unrelated arena fight. The enemy is an original articulated Three.js model with horns, mask-like face, robe, claws and an orbiting purple crystal; it is a game interpretation of the trailer, not an imported film shot.

## Play loop

The usual festival has 45 seconds of safe play after the transformation. A 3-second omen introduces the king near the active crew. **Boss practice** on character selection brings the first omen forward to 4 seconds, using the same authoritative mechanics.

1. Move out of orange ground warnings. Jump over purple radial shockwaves. Shadows seek exposed disguises first, then escorts. Mask minions pursue nearby players.
2. **C Ward** creates the trailer's golden protection dome. It blocks shadow damage for yourself and nearby teammates and retains the existing teammate-disguise cover. Its 5-second duration / 12-second cooldown is unchanged. It never extends a human's 5-second charm.
3. Press **E** beside each purple cursed seal. Remain within 2.25 steps for 1.15 seconds. Leaving range or taking an unprotected hit cancels the channel. Solo has 2 seals; online crews have 3. Covering someone who is disarming gives the team a useful role.
4. When every seal breaks, the crystal opens for 9 seconds. Hold **J / Spirit bolt** to fire. The server selects a nearby mask first, then an exposed crystal within 17 steps. Shots cost 3 spirit with a 0.68-second cooldown. Alternating players' crystal shots adds combo damage. A failed window restores the seals but preserves damage dealt.
5. Banishing the king grants +20 seconds (up to the round's time cap), a potion, 30 spirit, one heart, a 12-second ward and a 9-second speed boost. There is then roughly a minute before the next invasion. Resume escorting guests and playing stall games.

Delivering 3 humans with one player remains the victory condition. Fighting is a valuable survival/escort option, not an additional compulsory final-gate requirement. Later invasions and the final 90 seconds have faster patterns, while retaining visible warning time.

## Recoveries and fairness

- Four hearts per player. A hit removes one heart and 8 spirit, grants brief hit immunity and parks followers at their current position. Delivered guests are never removed.
- Potions restore 55 spirit and one heart; injured players can drink at full spirit.
- At zero hearts, movement and actions are blocked. A connected, healthy teammate can press E within 2.3 steps to rescue the player. Solo talismans reform the player after 8 seconds. An entire connected co-op crew being sealed for 4 seconds ends the round with an explicit reason.
- Booth players and disconnected players cannot be hit offscreen. Solo menus freeze the whole encounter; multiplayer menus do not pause others. Reconnection preserves the encounter and player state.
- All attacks, distance checks, damage, seal progress, rewards, combo timing and cooldowns are server authoritative. Clients only show state and send existing action/input messages.

## Presentation and controls

Boss health/phase, seal progress, hearts, attack telegraphs, mask minions, crystal projectiles, hit feedback, gold talisman domes and boss/seal minimap marks use the live shared state. Shots turn the character toward the target. Overhead festival structures fade when they block the king as well as the player. Cached minion/ward meshes avoid repeated resource allocations.

The ninth touch action is Spirit bolt. It fits the three-column portrait layout; landscape uses five columns over two rows, keeping at least 44 px targets. Existing joystick movement, drag-look, pinch zoom and keyboard E/Q/F/C/Space/R/T/G remain available.

## Verification

- 90 unit tests and 4 real-socket integration tests passed, including actual boss mode, shared warning/seal state, reconnect without encounter reset and rejection of remote seal breaking / client damage fields.
- A browser playthrough broke both seals, blocked damage twice, fired 9 shots, banished the king and received the rewards. The server-reported result was HP 0, banished 1, 4 player hearts and 100 spirit.
- See `artifacts/demon-king/` for actual browser proof and the contact sheet used to inspect the trailer.
- Physical-phone performance and simultaneous multi-touch still need device testing; responsive preview checks are reported separately.

Responsive verification completed on 390×844 and 844×390 browser viewports: all nine touch actions fit, portrait actions are 54×48 px, landscape actions are 44×44 px, and no horizontal overflow was reported. The mobile preview registered an actual Spirit bolt hit and a Ward block. This is Mac browser verification, not a physical-phone performance claim. Combat camera framing now lifts smoothly so the king's face remains visible without locking free-look, and combat messages use the boss panel instead of obscuring the fight.
