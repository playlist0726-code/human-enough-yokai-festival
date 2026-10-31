# Phone playtest · Human Enough!

Open [Phone Lab](http://127.0.0.1:4173/phone-lab.html) on the Mac. The server must be running in LAN mode:

```sh
cd /Users/gimjunsu/eve-games/yokai-festival
npm run dev:lan
```

1. Put the phone and Mac on the same Wi-Fi and keep the Mac awake.
2. Scan the QR in Phone Lab. The game opens in Safari or Chrome, without an installation or account.
3. For co-op, create a room on the Mac and open **Invite a phone · QR code** in the lobby. Its QR contains the room code. The phone still chooses a character, then uses **Join room** with the prefilled code.
4. Each player marks Ready before the host starts. Up to four players use the same authoritative game server.

The detected network address can change when Wi-Fi changes; use **Refresh addresses** in Phone Lab. This shared-network address can be isolated by a guest network or VPN; a response on the Mac does not prove reachability from a phone. No internet deployment or public tunnel is configured.

## Controls and screen checks

- Left joystick: analog movement relative to the camera, with a dead zone and pointer ownership.
- Drag the world: turn camera; pinch: zoom; tap: walk to a clear spot.
- Right buttons: Interact, Potion, Charm, Cover, Jump, Share, Hand off, Help ping.
- Buttons respect the notch and home indicator. Portrait and landscape have separate layouts. Minimum action/camera target is 44 px.
- Blur, pointer cancellation, lost capture and rotation release movement. Menus and minigames block world input. Existing reconnect reserves the player for 30 seconds.
- Auto starts touch devices on Mobile: 1x resolution, 768 shadow map, no SSAO, lighter bloom and a shorter NPC visibility range. Sustained low frame rate drops to Light, which disables dynamic shadows and postprocessing. High remains available in settings. Minigames also cap automatic mobile resolution at 1x.

The Phone Lab iframe uses a real 390×844, 360×740, 430×932 or tablet viewport. Rotate changes its actual layout dimensions without rejoining. It tests responsive layout on the Mac, not mobile GPU performance or real multi-touch hardware.

## Diagnose and share a result

Invites include `test=1`: an on-screen badge shows FPS, active graphics profile, connection, round-trip latency and viewport size. **Save test** saves a JSON report locally with device/browser, game position, sample history and notes. No report is automatically sent anywhere. Attach that file in our chat when reporting a problem.

Phone Lab has a separate checklist and report for its browser preview. Reports clearly identify whether the measurement came from that preview. It checks screen overflow, off-screen controls and touch target sizes. No account, credential, session token or real location is included.

If graphics memory is interrupted, an explicit message appears; reload restores the view. The test badge is opt-in and ordinary play does not show it.

## Validation

See the final verification section below for measured browser checks. Unit tests cover network filtering/invites, joystick normalization, mobile quality, real GLB skin attributes, actual weighted deformation under action poses and independent cloned skeletons. Real socket integration covers the new endpoint/ping plus readiness, reconnect, host migration and cooperative actions.

Physical iPhone/Android performance and real multi-touch still require a test on the user's phone.

### Final verification

- Browser rehearsal: all seven yokai loaded the weighted v03 model; Kon and Nemu expose their additional chain joints.
- Responsive preview: 390×844, 360×740 and 844×390. Checked joystick/action controls, at least 44 px targets, no horizontal overflow or off-screen controls. Fixed landscape positioning and preview frame overflow found during this check.
- Browser inputs: held joystick moved the character from (0, 16) to approximately (-1.01, 11.15); releasing stopped it. Jump count incremented, and Potion changed spirit 70→100 with inventory 1→0. Screen rotation retained the player and room.
- LAN HTTP check: the detected address returned playtest information and a valid SVG QR. This is a Mac-side network check, not a physical phone connectivity result.
- Automated validation: 79 unit tests and 3 real-socket integration tests passed; module syntax checks passed.
- Frame-rate readings in the Mac's embedded preview varied with browser activity and other open 3D views. They are not presented as phone performance claims.

The Demon King update adds a ninth touch action, Spirit bolt. Boss practice is available in character selection. Landscape uses five 44 px columns across two rows; portrait keeps three columns.
