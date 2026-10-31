# Handshake multiplayer mission audit

Checked on October 30, 2026 against the project brief supplied in chat.

**Updated after launch preparation: the game and WebSocket server are now deployed at https://human-enough-yokai-festival.onrender.com/. Physical-device testing and ChatGPT Work process confirmation remain distinct checks.**

| Requirement | Evidence | Result |
| --- | --- | --- |
| At least two players on separate devices | Real WebSocket integration tests pass. Two independent browser clients joined room U2D8S, readied, started together, and received the same help ping and round outcome. | Software behavior verified. Two physical devices and separate networks still need testing. |
| Rules understandable without the creator | Lobby explains the disguise cycle, five-second charm and one-player/three-guests team victory. In-game How to play explains controls, potions, booths, cover, handoffs, combat and rescue. | Implemented and opened in the browser. New-player comprehension has not been user-tested. |
| Publicly reachable URL or host | The game and server are hosted on Render. Local development still listens on port 4173. | Updated: deployed to Render; public HTTPS health and invitation endpoints verified. |
| ChatGPT Work use | The brief requests ChatGPT Work. Source files and automated tests cannot establish which product was used during creation. | Not verified by this audit. |

## Validation

- Syntax checks passed.
- 93 unit tests passed; 5 integration tests passed; no failures (98 total).
- Browser test used a desktop game tab and the 390 × 844 Phone Lab iframe on the same Mac. This was not a physical phone or external-network test.
- Both clients reached the same shared loss outcome after the idle crew was sealed. Both were returned to the character menu after testing.
- Screenshot: `artifacts/submission-audit/two-player-check.png`.

## Remaining work

1. Completed: public Render web service hosts the game and its WebSocket server. Free instances may sleep after inactivity; the address remains available and starts the server again on demand.
2. Open that address on two physical devices using different networks, join the same room, and verify movement, interactions and a completed round.
3. Completed: the lobby and pre-play help now explain the eight-minute limit, individual three-guest target and four-second whole-crew-sealed failure condition. Seven character biographies and quotes were added; the normal mode gives 45 seconds before the first invasion.
4. Confirm the ChatGPT Work process requirement from the actual creation history; this audit does not assert that Codex use alone satisfies it.

Options A and B in the supplied brief are alternative workflows, not two separate sets of deliverables that must both be completed. This file records project checks, not contest eligibility or an official acceptance decision.

## User phone feedback

After opening the public phone invitation, the user reported that it worked and asked to proceed. This is recorded as user feedback. The agent did not independently capture a synchronized physical-phone round; the hosted two-client checks are recorded separately.
