# Public game deployment

Play: https://human-enough-yokai-festival.onrender.com/

Render service: `srv-dbil7kgu01pc73d8pa90` (Oregon, one free Node instance).
Source: private GitHub repository `playlist0726-code/human-enough-yokai-festival`, branch `main`.

Both static assets and WebSocket multiplayer use the same public origin. No laptop, tunnel, login or installation is required for players. The free instance sleeps after inactivity; Render documents a first-request delay of 50 seconds or more. An active room is held in server memory. A deploy, server restart or instance replacement ends existing rooms; create a new room afterward. Do not redeploy during a planned playtest or judging session.

## Repeatable configuration

- Runtime: Node 22.x (same major as local tests)
- Build: `npm ci --omit=dev && npm run build`
- Start: `npm start`
- Environment: `NODE_ENV=production`
- Host: `0.0.0.0`; port: Render's `PORT`
- Health check: `/health`
- Instance count: **one**. Rooms are not shared across replicas.
- Render supplies `RENDER_EXTERNAL_URL`; public QR invitations use that origin without revealing internal network addresses.

`render.yaml` declares equivalent Blueprint settings. The Dockerfile provides an alternative for a Node-compatible host. Blender source files remain in the local `art/` folder and are not needed by the server.

`npm run build` compresses text modules and GLBs in `.cache/gzip`. The measured initial production set fell from 48.7 MB to 15.8 MB; PNGs are unchanged. The server negotiates gzip, handles `gzip;q=0`, and revalidates with ETags. Rebuild after modifying source assets.

## Validate a release

Run `npm run check`, `npm test`, and `npm run test:integration` locally. Model source tests require the original local Blender art folder; it is intentionally excluded from the deployment repository. Run `npm run test:live -- https://human-enough-yokai-festival.onrender.com/` for two real clients over the hosted network. That check does not replace testing on two physical devices.

To roll back, use a previously successful deploy in the Render dashboard. The previous release's game sessions will not be restored.

Model downloads are limited to three at once and retry transient failures up to three attempts with a 25-second per-attempt timeout. Successfully loading a previously missing model clears its failure report. Regression tests cover concurrency, shared requests, transient failures and recovery.
