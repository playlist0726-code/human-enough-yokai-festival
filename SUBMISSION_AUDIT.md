# Handshake multiplayer mission audit

Checked on October 30, 2026 against the project brief supplied in chat.

**Overall: core game implemented; public-access requirement remains incomplete.**

| Requirement | Evidence | Result |
| --- | --- | --- |
| At least two players on separate devices | Real WebSocket integration tests pass. Two independent browser clients joined room U2D8S, readied, started together, and received the same help ping and round outcome. | Software behavior verified. Two physical devices and separate networks still need testing. |
| Rules understandable without the creator | Lobby explains the disguise cycle, five-second charm and one-player/three-guests team victory. In-game How to play explains controls, potions, booths, cover, handoffs, combat and rescue. | Implemented and opened in the browser. New-player comprehension has not been user-tested. |
| Publicly reachable URL or host | Current server listens on port 4173 for local/network testing. README and PHONE_PLAYTEST explicitly document that internet hosting is not configured. | Not met. localhost and the Phone Lab network invitation are not a public submission URL. |
| ChatGPT Work use | The brief requests ChatGPT Work. Source files and automated tests cannot establish which product was used during creation. | Not verified by this audit. |

## Validation

- Syntax checks passed.
- 90 unit tests passed; 4 integration tests passed; no failures.
- Browser test used a desktop game tab and the 390 × 844 Phone Lab iframe on the same Mac. This was not a physical phone or external-network test.
- Both clients reached the same shared loss outcome after the idle crew was sealed. Both were returned to the character menu after testing.
- Screenshot: `artifacts/submission-audit/two-player-check.png`.

## Remaining work

1. Host both the game assets and its live WebSocket server at a public address that stays available for reviewers.
2. Open that address on two physical devices using different networks, join the same room, and verify movement, interactions and a completed round.
3. Improve first-play guidance by explicitly stating the eight-minute base time limit and the whole-crew-sealed failure condition before the round starts. The timer and loss explanation already appear during/after play.
4. Confirm the ChatGPT Work process requirement from the actual creation history; this audit does not assert that Codex use alone satisfies it.

Options A and B in the supplied brief are alternative workflows, not two separate sets of deliverables that must both be completed. This file records project checks, not contest eligibility or an official acceptance decision.
