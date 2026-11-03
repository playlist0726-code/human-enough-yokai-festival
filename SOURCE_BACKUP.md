# Complete game-source snapshot

This private repository contains the playable game and its related local production sources. Existing game files stay in their original locations. Earlier workspace materials are copied into `source-archive/workspace/` without changing their contents or the source folders on the Mac.

Included material:

- `art/`: Blender source files, Blender backup versions, exported GLBs, rendering scripts, renders, logs and manifests.
- `artifacts/`: gameplay screenshots, motion references and test evidence.
- `integrations/`: imported minigame source and the pre-integration archive.
- `source-archive/workspace/art/`: original character sheets, prompts, stall images and marketing artwork.
- `source-archive/workspace/production/`: character motion studies, frame sequences, videos, scene sources, manifests and existing export ZIPs.
- `source-archive/workspace/exports/`: original minigame export bundle and extracted source.
- `source-archive/workspace/festival-play/`: the earlier festival-site source and deployment metadata.
- Planning and graphics research documents, the initial workspace prototype, tests, production settings and submission materials.
- `source-archive/references/`: the explicitly supplied original character/stall/title images, contest rules and promotional video, when still available on disk.

Credentials (`.env` and `.env.*`), dependency installations (`node_modules`), Git internal metadata, Python caches, transcode caches and generated build caches are excluded. Dependencies can be restored from the lockfiles. This is a game-project backup, not a backup of the entire home folder or chat history; only the named game references outside `eve-games` are included.

## Restore and verify

Install Git LFS, then clone the private repository with an account that can access it:

```sh
git lfs install
git clone https://github.com/playlist0726-code/human-enough-yokai-festival.git
cd human-enough-yokai-festival
git lfs pull
python3 scripts/verify-source-backup.py
npm ci
```

Large source assets use Git LFS. Use a clone followed by `git lfs pull` for a complete restore; a GitHub ZIP download is not the verification method for this backup.

`SOURCE_BACKUP_MANIFEST.json` lists original relative paths, repository locations, byte counts, SHA-256 hashes and file permissions. The verifier checks every listed file against its original bytes. `--compare-originals` additionally compares against the original workspace on the Mac.

To rebuild the old parent workspace layout, copy the children of `source-archive/workspace/` to a separate restore folder, then place the game repository in its `yokai-festival/` subfolder. Keep current files separate from a restore until you have reviewed differences.

The snapshot commit uses `[skip render]`, so storing these files does not redeploy the public game. No runtime game code is modified by this backup.
