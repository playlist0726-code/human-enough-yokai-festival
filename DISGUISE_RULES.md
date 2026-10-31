# Human disguises and five-second charms

## Current rules

- Players choose one of the seven original yokai. A shared 4.2-second transformation scene plays after the lobby countdown and before the festival begins. It reveals the selected yokai, a burst of magical smoke and light, then their human guise. All players enter as humans; the festival timer remains stopped during the scene.
- Each guise preserves the selected character's outfit colors and has its own human hair/face combination. These human characters retain walking, idle, jumping and action motion.
- Every 15 seconds of active festival time, a species-specific feature shows for 5 seconds: Mizu's water dish, Pon's striped tail, Kon's fox ears/tails, Sumi's wings, Nemu's face-tail, Akari's lantern hand or Kasa's umbrella crown. The 5-second reveal duration is the initial tuning choice; the requested period is 15 seconds.
- C hides other connected teammates' features within 3.2 steps while Cover is active, for 5 seconds with the existing 12-second cooldown. It cannot hide the caster's own feature. Leaving the area ends concealment. Ward prizes hide the recipient's features as well. Cover can coexist with drinking or casting.
- F costs 18 spirit and starts a fixed 5-second charm. The short initial cast takes 0.6 seconds. Humans follow during the remaining window and permanently wait in their exact stopping position when it ends. They can be charmed again by any player. Cover, proximity, spirit levels, wards, booths and handoffs never extend the timer.
- Potion collection/sharing, minigames, delivery credit and the team victory condition remain available. One player must bring three guests to the gate. Repeated short charms relay each guest uphill.

## Implementation

`shared/disguise.mjs` owns timing constants and the appearance predicate. The authoritative simulation publishes reveal/conceal timers, stops expired charms, and keeps waiting guests out of wandering AI. Disconnection cancels an entrance scene safely; removal of an escort parks their active guests.

`public/disguise.mjs` composes the existing animated yokai and human rigs, plus character-specific partial features. Cloned face-tail skinning has an independent skeleton. The entry scene reuses the same player models and restores them to the festival afterwards. The HUD shows reveal and charm countdowns, waiting guests are marked for re-charming, and first-person booth hands use human skin with applicable reveal details.

The character rehearsal at `/motion-study.html` includes Human disguise, Disguise slipping, True yokai and Transformation views.

## Verification

Syntax checks and 69 unit tests pass. New coverage checks entrance timing/cancellation, periodic reveal, nearby-team-only Cover, fixed charm expiry, stationary waiting, re-charming, unchanged handoff time, all seven human/partial rigs and transformation visibility. The two real-socket integration tests also pass through the entrance phase. Browser screenshots in `artifacts/disguise/` cover the transformation and human/partial forms in the festival.
