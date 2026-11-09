# A방 진행 상황 — R01 기반 공사

- 브랜치: `remaster/r01-foundation` (main 직접 커밋 없음)
- 마지막 갱신: 2026-11-08 21:30 (America/Denver)
- 상태: **진행 중** — 새 모듈 작성 완료, game.js 연결 작업 중

## 끝난 것
- [x] 저장소 연결·클론, `git lfs pull`, `npm ci` → `npm run check` · `npm test`(93) · `npm run test:integration`(5) 모두 초록
- [x] 킷을 `docs/production/`과 `tools/`로 커밋 (커밋 `f894857`, 이전 시도에서 같은 내용으로 이미 푸시돼 있어 그대로 이어받음)
- [x] 작업 전 캡처 `docs/production/captures/r01/before/` (이 세션에서 Git LFS 업로드가 거부돼 LFS 대상인 `artifacts/` 대신 일반 git 경로에 둠) — 01 타이틀, 02 선택, 05·06 모델 렌더는 정상. 03 인게임은 소프트웨어 WebGL에서 "Reconnecting" 오버레이가 찍혀 비교용으로 쓸 수 없음, 04 걷기는 실패(킷 baseline에도 04 없음)
- [x] `tools/capture.py`: 04 걷기 샷이 실패해도 멈추지 않고 05·06 모델 렌더까지 계속 찍도록 수정
- [x] 동등성 검사용 렌더 지문 도구(저장소 밖 스크립트): renderer 설정, 배경·안개·환경맵, 조명 11개, 프레임당 렌더 호출 23개(SSAO→bloom→grade→SMAA→output)와 각 패스 uniform을 high·light 프로필로 기록해 둠
- [x] 새 모듈 작성(아직 game.js에 연결 전이라 게임 동작은 그대로):
  - `public/render/pipeline.mjs · lighting.mjs · post.mjs` — 렌더러·안개·환경맵·조명·후처리, `render.flash()` 자리(R02 구현 예정, 현재 no-op)
  - `public/render/quality.mjs · camera-controls.mjs · minimap.mjs · labels.mjs` — 품질 자동 조정, 기존 free-camera 입력, 미니맵, 이름표·그림자 헬퍼
  - `public/audio/engine.mjs` — 기존 사인파 효과음 그대로 + `attach(bus)` 자리(R13)
  - `public/events.mjs` — 이벤트 버스 + 스냅샷 차이 감지(요청된 22종 + 추가 5종)
  - `public/fx/index.mjs · action-effects.mjs · fireworks.mjs` — 기존 액션 이펙트·불꽃놀이를 그대로 옮김. R10 소유 폴더라 `REMASTER-HOOK r01` 주석 표시
  - `public/characters/rig-v2.mjs · actors.mjs · portraits.mjs · defs/index.json` — v2 GLB 로더(Meshopt+KTX2), 클립 선택·폴백·크로스페이드·걸음 속도 동기화·상체 레이어·소켓, defs 없거나 `?rig=legacy`면 기존 리그
  - `public/perf-overlay.mjs` — `?perf=1`: FPS·1% low·draw calls·삼각형·지오메트리·텍스처·GPU 메모리 추정·프로필

## 남은 것
1. game.js를 새 모듈로 연결(작업 중인 사본 보관 중) → 목표 크기 51 KB → 약 25 KB
2. 동등성 확인: 렌더 지문 before/after 비교 + 타이틀·선택·모델 렌더 캡처 비교 (인게임 샷은 소프트웨어 WebGL에서 계속 실패하면 생략 — 사용자 승인됨)
3. `scripts/build-production.mjs`에 v2 GLB 압축 단계(@gltf-transform/cli: meshopt + KTX2, toktx 없으면 WebP)
4. `server.mjs` 정적 파일: `.wasm`·`.ktx2` MIME 등록 (three/addons 경로는 이미 `/addons/`로 제공됨)
5. 테스트: rig-v2(클립 선택·폴백·소켓), events 버스, validate-glb 자체 테스트(최소 GLB fixture)
6. `HANDOFF.md`에 인터페이스 문서화(이벤트 payload, rig-v2 API, defs JSON 스키마)
7. 품질 게이트 전체 + `?perf=1` 수치(high·mobile) + PR 생성
8. 병합은 하지 않음 — 본부가 병합

## 예상 남은 시간
약 2~2.5시간 (game.js 연결 40분, 동등성 검증 20분, 빌드·서버 20분, 테스트 30분, 문서·PR 20분). 소프트웨어 WebGL 캡처가 느려 검증 단계는 더 걸릴 수 있음.

## 결정 사항
- 기존 액션 이펙트·불꽃놀이는 R10 소유인 `public/fx/`로 옮김. 이후 방들이 game.js를 고치지 않아도 되게 진입점(`createFx`)을 둠 → PR "다른 방 요청"에 기록 예정
- 이벤트 버스는 첫 스냅샷에서는 이벤트를 내보내지 않음(입장 시 지난 이벤트 재생 방지)
- v2 캐릭터는 기존 리그로 먼저 나타났다가 GLB 로드가 끝나면 교체, 실패하면 기존 리그 유지
- 하위 폴더 모듈은 `../../shared/`로 import (브라우저에서는 `/shared/`로, Node 테스트에서는 저장소 `shared/`로 해석됨)

## 진행 중인 job id
- 없음 (R01 Higgsfield 예산 0)

## 막힌 점(본부 확인 필요)
- 이 클라우드 세션에서는 **Git LFS 업로드가 거부된다**(LFS 저장소 S3 주소가 프록시에서 막힘). `artifacts/`·`art/`의 png/glb는 LFS 대상이라 푸시할 수 없다. R01은 캡처를 `docs/production/captures/r01/`(LFS 아님)에 둔다. 에셋을 만드는 방(C·D·E 등)은 같은 문제를 겪으므로, 본부가 허용 도메인을 추가하거나 로컬에서 푸시하는 방법을 정해야 한다.
