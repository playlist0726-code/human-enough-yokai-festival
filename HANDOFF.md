# HANDOFF — 방 사이 인수인계

규칙(ROOM_PROTOCOL §4): 각 방은 PR을 올릴 때 **맨 아래에** 항목을 추가한다 — 날짜, 방, 바뀐 것, 다른 방이 알아야 할 인터페이스 변경, 다음 할 일. 위쪽 항목은 고치지 않는다.

---

## 2026-11-08 · A방 · R01 기반 공사 (`remaster/r01-foundation`)

### 바뀐 것
- `public/game.js` 51.5 KB → 26.4 KB. 렌더·조명·후처리·오디오·VFX·캐릭터·HUD를 모듈로 분리했다. **화면과 규칙은 그대로다**: 렌더 상태 지문(렌더러 설정, 안개, 환경맵, 조명 11개, 프레임당 렌더 호출 23개와 각 패스의 uniform)이 high·light 프로필에서 이전과 같고, 타이틀·선택 화면·모델 렌더 캡처도 픽셀 단위로 같다.
- 새 모듈: `public/render/*`, `public/audio/engine.mjs`, `public/events.mjs`, `public/fx/*`(훅), `public/hud.mjs`(훅), `public/characters/*`, `public/perf-overlay.mjs`
- `scripts/build-production.mjs`: v2 GLB 압축 단계 추가(아래). `server.mjs`: `.wasm .ktx2 .ogg .m4a .mp3` MIME 등록(three/addons는 이미 `/addons/`로 제공됨).
- 테스트 93 → 111개: `tests/events.test.mjs`, `tests/rig-v2.test.mjs`, `tests/production-tools.test.mjs`, 계약 GLB 픽스처 `tests/fixtures/minimal_player.glb`(생성기 `make-contract-glb.mjs`).
- `npm run check`에 새 모듈 전부 추가. 개발 의존성 `@gltf-transform/cli` 추가(프로덕션 설치에는 들어가지 않음).

### game.js가 각 방에 열어 둔 진입점 (game.js는 이제 본부만 수정)
| 방 | 고칠 파일 | game.js가 부르는 것 |
|---|---|---|
| R02 룩 | `public/render/pipeline.mjs · lighting.mjs · post.mjs` | `createRenderPipeline({canvas,scene,camera})` → `applyProfile(q)`, `resize(w,h)`, `update({dt,elapsed,focus,threat})` 매 프레임, `render(usePost)`, `flash(color,intensity)`(현재 no-op, R02가 구현) |
| R02/R14 품질 | `public/render/quality.mjs`, `public/visual-quality.mjs` | `createQualityControl({settings,touchMode,apply})` → `.mode .profile .settings`, `cycle() sync() observe(fps,seconds,active)` |
| R03 캐릭터 | `public/characters/rig-v2.mjs · actors.mjs · defs/*.json` | `loadDefs()`, `createRigFactory(...)`, `createActors({scene,getMyId,rigs})` → `sync(state) snap() stash() update(frame) probe()` |
| R05 UI | `public/hud.mjs` | `renderLobby(state,myId,portrait)`, `renderHud(state,myId,portrait)`, `interactionPrompt(state,myId,encounterView)` |
| R10 VFX | `public/fx/*` | `createFx({scene,bus,pipeline})` → `spawnAction(event,state)`(기존 이펙트), `clear()`, `update(dt,elapsed,state)` 매 프레임. 새 효과는 **이벤트 버스를 구독**한다 |
| R13 사운드 | `public/audio/engine.mjs` | `createAudioEngine({isEnabled})` → `tone(freq)`(기존 효과음, game.js가 아직 직접 호출), `attach(bus)`(여기서 버스 구독) |
| R14 성능 | `public/perf-overlay.mjs`, `scripts/build-production.mjs` | `installPerfOverlay({renderer,scene,getProfile})` → `frame(realDt)` 매 프레임 |

`window.__YOKAI_GAME__.events`로 브라우저 콘솔에서 버스를 볼 수 있다: `__YOKAI_GAME__.events.on('*', console.log)`.

### 이벤트 버스 `public/events.mjs`
- `createEventBus()` → `on(type|'*', fn)`(해제 함수 반환), `once`, `off`, `emit(type, payload)`. 핸들러가 예외를 던져도 다른 핸들러와 게임 루프는 계속 돈다.
- game.js는 서버 스냅샷마다 `createGameEvents(bus).ingest(state, myId)`를 부른다. 스냅샷 차이와 서버 이벤트에서 아래 이벤트를 만든다. **방에 들어온 첫 스냅샷은 기준점으로만 쓰고 이벤트를 내보내지 않는다**(지난 이벤트 재생 방지). 방을 나가면 `reset()`.
- 모든 payload 공통: `{type, playerId: string|null, position: {x,y,z}|null, tick, local: boolean}` — `position.y`는 지면 높이 + 점프 높이, `local`은 내 캐릭터 여부.

| 이벤트 | 출처 | 추가 필드 |
|---|---|---|
| `potion_pickup` | 서버 fx `pickup`(나눠 주기 포함) | position = 포션 위치 |
| `potion_drink` | fx `drink` | |
| `charm_cast` | fx `charm` | `guestId` |
| `charm_end` | 손님 `owner`가 사라지거나 바뀜 | `guestId`, `reason: 'expired'|'delivered'|'transferred'`, playerId = 이전 주인 |
| `reveal_start` / `reveal_end` | `disguiseState().revealed` 변화(플레이 중) | `part`(start만, 예: `water dish`) |
| `cover_ward` | fx `cover` | |
| `guest_delivered` | 손님 `state` → `delivered` | `guestId`, playerId = 데려온 플레이어 |
| `stall_enter` | `player.mini` 생김 | `stallId`, `game` |
| `stall_win` / `stall_fail` | `mini.status` → `result` | `stallId`, `game`, `reason` |
| `hit` / `sealed` | fx `hit`(`type:'down'`이면 sealed) | `health` |
| `rescued` | fx `revive` | |
| `boss_omen` | fx `omen` | position = 데몬킹 위치 |
| `boss_banished` | fx `bossDown` | |
| `round_start` / `round_end` | phase → `playing` / `playing` → `won`·`lost` | `mode`, `round` / `result`, `reason`, playerId = 승자 |
| `footstep` | 플레이어 이동 거리 1.2 m마다(공중 제외) | `foot: 'left'|'right'` |
| `jump` / `land` | fx `jump` / `land` | |
| `firework` | `public/fx/fireworks.mjs`(클라이언트) | `color`, playerId = null |
| 추가: `spirit_bolt`, `ward_block`, `seal_break`, `ping`, `stall_reward` | fx `bolt` · `blocked` · `seal` · `ping` · `reward` | `spirit_bolt`: `from`, `boss`, `combo` |

### rig-v2 `public/characters/rig-v2.mjs`
- 사용 조건: `public/characters/defs/index.json`의 `characters`에 id가 있고 `<id>.json`이 검사를 통과할 때. 아니면 기존 리그. `?rig=legacy`는 모두 기존 리그.
- 캐릭터는 **항상 기존 리그로 먼저 나타나고**, v2 GLB 로드가 끝나면 교체된다(`actors.mjs`). 로드가 실패하면 경고만 남기고 기존 리그를 유지한다.
- 로더: `GLTFLoader + MeshoptDecoder + KTX2Loader`(트랜스코더 `/addons/libs/basis/`). 디코더는 v2 캐릭터가 있을 때만 불러온다.
- rig API: `kind:'v2'`, `root`, `forms.{yokai,human}`, `appearance`, `speed`, `clip.{base,upper}`, `socket(name, form?)`, `attach(name, object, form?)` → 소켓이 없으면 false, `update(p, dt, time, tick, position, {form, progress, phase, revealed?})`.
- 클립 선택(우선순위 높은 순): `victory`(phase won) > `sealed`(체력 0·down) > `hit`(hurtUntil) > `jump_start`/`jump_air` > `reveal_panic`(변장 노출 직후 1.1초) > `land`(0.3초) > `run`/`walk`/`idle`(속도). 한 번 재생 클립은 더 높은 우선순위만 끊을 수 있다. 크로스페이드 기본 0.2초.
- 클립이 없으면 대체: run→walk→idle, jump_start→jump_air→idle, land·hit·sealed·victory·reveal_panic→idle. `sealed`가 없으면 기존처럼 몸을 기울인다.
- 상체 레이어: `drink`→`drink_potion`, `charm`→`charm_cast`, `cover`→`cover_ward`. Hips·다리 트랙은 런타임이 한 번 더 걸러 낸다.
- 걸음 속도: `timeScale = clamp(실제 속도 / gait.walkSpeed, minScale, maxScale)`(달리기는 runSpeed). 속도는 화면에 그려진 위치 변화로 잰다.
- 높이 정규화: 폼마다 바운딩 박스 높이를 `height.<form>`에 맞추고 발을 y=0에 둔다(기본 yokai 2.85, human 2.55 — 기존 모델과 같은 화면 크기).

### defs JSON 스키마 `public/characters/defs/<id>.json`
```json
{
  "id": "mizu",
  "version": 2,
  "forms": {
    "yokai": "/assets/models/v2/mizu_yokai.glb",
    "human": "/assets/models/v2/mizu_human.glb"
  },
  "reveal": "/assets/models/v2/mizu_reveal.glb",
  "height": {"yokai": 2.85, "human": 2.55},
  "gait": {"walkSpeed": 3.6, "runSpeed": 4.86, "runThreshold": 4.2, "idleBelow": 0.15, "minScale": 0.6, "maxScale": 1.8},
  "crossfade": 0.2,
  "clips": {"walk": "walk_mizu"}
}
```
- 필수: `id`(파일 이름과 같아야 함), `version: 2`, `forms`(yokai·human 중 하나 이상, `.glb`). 나머지는 선택이고 위 값이 기본값이다.
- `gait.walkSpeed`·`runSpeed`: 클립을 1배속으로 재생할 때 발이 미끄러지지 않는 이동 속도(월드 단위/초). 서버 기본 이동 속도는 3.6, 속도 버프는 4.86.
- `clips`: 계약 이름 → GLB 안의 클립 이름(이름이 같으면 생략).
- `reveal`: 인간 변장의 `socket_reveal`에 붙는 요괴 부위 GLB. 변장이 드러날 때 0→1로 커진다.
- 다 만들었으면 `index.json`의 `characters`에 id를 넣는다.

### v2 GLB 압축 `npm run build`
- `public/assets/models/v2/`와 `public/assets/env/v2/`의 GLB를 **그 자리에서** 압축한다: dedup → prune(빈 소켓 노드 유지) → resample → Meshopt. 텍스처는 `toktx`(KTX-Software)가 있으면 KTX2 UASTC, 없으면 WebP. flatten·join·simplify는 하지 않아 스킨과 소켓이 그대로 남는다.
- 이미 `EXT_meshopt_compression`을 쓰는 파일은 건너뛴다(다시 돌려도 안전). `node scripts/build-production.mjs --v2-only`로 이 단계만 돌릴 수 있다.
- Docker·Render 빌드는 `npm ci --omit=dev`라 압축 도구가 없다. 그래서 **방에서 로컬로 압축한 GLB를 커밋한다.** 도구가 없을 때 압축 안 된 파일이 있으면 목록만 출력한다.
- 원본 내보내기 GLB는 `source/v2/<category>/<id>/`(일반 git 파일, LFS 아님)에 두고, `tools/validate-glb.mjs` 검사는 원본에 돌린다(계약의 파일 크기 기준이 압축 전 기준). 빌드는 `source/`를 읽지도 고치지도 않는다.

### 성능 기준치(2026-11-08, 시작 지점, R01 전후 동일)
소프트웨어 WebGL에서 잰 값이라 FPS는 의미가 없다. draw calls·삼각형은 하드웨어와 무관하다.

| 프로필 | draw calls | 삼각형 | 지오메트리 | 텍스처 | GPU 메모리 추정 | 계약 예산 |
|---|---|---|---|---|---|---|
| high | 2,474 | 9.06 M | 721 | 127 | ~171 MB | ≤250 / ≤750k |
| mobile | 1,289 | 4.59 M | 729 | 124 | ~194 MB | ≤150 / ≤350k |
| light | 849 | 2.70 M | 720 | 104 | ~171 MB | — |

모든 프로필이 예산을 크게 넘는다. 원인은 기존 모델(캐릭터당 50~186k 삼각형, 50~110개 파츠)과 high의 SSAO·그림자 패스다. R03 이후 캐릭터 교체와 R14가 해결한다.

### 알아야 할 것
- **클라우드 세션에서는 Git LFS 푸시가 막혀 있다.** 본부 결정(LFS 대체 규칙, ASSET_CONTRACT 9장): v2 제작 원본은 `source/v2/<category>/<id>/`에 일반 파일로(파일당 20 MB 이하, 권장 10 MB, 이미지 2048 px 이하 PNG/WebP, `.blend` 대신 `build.py`, 생성물은 `provenance.json`에 Higgsfield job id). 캡처는 `docs/production/captures/<rNN>/`. 기존 `art/` LFS 파일은 건드리지 않는다.
- 소프트웨어 WebGL 샌드박스에서는 인게임 화면이 2초에 1프레임 정도라 `tools/capture.py`의 03·04 인게임 샷이 "Reconnecting" 화면이 되거나 실패한다. 인게임 비교와 FPS는 실제 GPU 브라우저에서 잰다.
- 하위 폴더 모듈은 공유 코드를 `../../shared/...`로 불러온다(브라우저에서는 `/shared/`, Node 테스트에서는 저장소의 `shared/`로 해석됨).

### 다음 할 일
- 본부: PR 검토·병합 → Phase 1 방(B·C·F) 열기.
- R03: 미즈 v2 GLB + `defs/mizu.json` + `index.json` 등록. 실제 GLB로 걸음 보정값(`gait.walkSpeed`)을 맞춘다.
- R14: 위 성능 기준치를 실제 GPU에서 다시 잰다.

## 2026-11-09 · B방 · R02 밤 조명·후처리 (`remaster/r02-night-look`)
### 바뀐 것
- 조명 리그 재설계(`render/lighting.mjs`): 약하고 차가운 달빛(북서쪽 위, 유일한 그림자, 텍셀 스냅) + 남색 반구광 + 낮은 따뜻한 바운스 + 차가운 역광. 회색 RoomEnvironment 대신 밤 환경맵(PMREM).
- 하늘(`render/sky.mjs`): 그라데이션 돔·셰이더 별·구름·달 원반과 헤일로·원경 능선 2겹·호수 마을 불빛. 드로우콜 4.
- 등불 빛(`render/lanterns.mjs`): 등불 앵커 → 빛 웅덩이 라이트맵 + 플레이어 근처 실제 PointLight(high 6 · balanced 4 · mobile 2 · light 0).
- 월드 라이트 패치(`render/world-light.mjs`): 모든 lit 재질에 빛 웅덩이·계곡 안개·발광 ×1.7, 캐릭터 재질에만 림 라이트. 비유한(NaN) 색을 버려 **main의 high/balanced에서 블룸이 NaN 픽셀을 검은 사각형으로 번지게 하던 버그**를 막았다.
- 후처리(`render/post.mjs`): 블룸(임계 0.8) → Output → 코드로 만든 3D LUT 그레이드 + 비네트 + 불꽃 색광 → SMAA. 프로필별 토글(`visual-quality.mjs`).
- 자동 품질 하향이 한 단계씩: high → balanced → mobile → light.
- 지면 톤(`art-materials.mjs`): 어두운 이끼·흙 잔디, 따뜻한 회색 돌.
- 도구: `tools/lookdev.py`(서버 세션 없이 실제 축제 장면을 게임 카메라로 촬영 — 샌드박스에서 인게임 캡처가 끊길 때 쓴다), `tools/lookdev_compare.py`(컨셉|전|후 비교 보드).
- 계획·값: `docs/production/LIGHTING.md`. 비교: `docs/production/captures/r02/compare_{start,street,shrine}.jpg`.

### 다른 방이 알아야 할 인터페이스
- **등불을 만들면** `import {registerLantern} from './render/lanterns.mjs'` → `registerLantern({x,y,z,kind})`(월드 좌표, kind: paper·stall·stone·string·portal·potion). 빛 웅덩이와 실제 빛이 자동으로 생긴다. **환경 코드에서 PointLight를 직접 만들지 않는다.**
- **`pipeline.flash(color, intensity=1)`**: 하늘·지면·화면을 그 색으로 잠깐 물들인다(0.5초 감쇠). `fx/index.mjs`가 불꽃 터짐마다 0.8로 부른다(R10이 이어받음).
- 캐릭터 루트에 `userData.motionVersion`/`modelAsset`/`volumetric`이 있으면 림 라이트가 자동으로 붙고, 재질은 림용 사본으로 바뀐다(R03·R06~R09). 캐릭터 재질을 참조로 들고 나중에 바꾸는 코드는 `mesh.material`을 다시 읽어야 한다.
- emissive는 밤에 ×1.7이 되어 블룸을 받는다. 등불·포션·간판 외의 면에 강한 emissive를 쓰지 않는다.
- REMASTER-HOOK r02: `festival.mjs`(등불·노점 빛·석등·포션·포털 앵커 등록, 노점 PointLight 제거), `festival-scenery.mjs`(석등 앵커, 옛 하늘 구·별·달 제거), `fx/index.mjs`(불꽃 → flash).

### 다음 할 일
- R04(B방): 길 돌을 따뜻한 텍스처로, 줄 등불을 진짜 종이 등불 모델로(지금은 납작한 노란 공처럼 보임), NaN을 만드는 병합 장식 메시의 퇴화 노멀 정리.
- R10: 새 불꽃 파티클에서 `pipeline.flash`를 계속 부른다.
- R14: 실제 GPU에서 FPS와 위 draw calls를 다시 잰다.
