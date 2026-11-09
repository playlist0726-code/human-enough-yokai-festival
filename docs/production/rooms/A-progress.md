# A방 진행 상황 — R01 기반 공사

- 브랜치: `remaster/r01-foundation` (main 직접 커밋 없음)
- 마지막 갱신: 2026-11-08 22:30 (America/Denver)
- 상태: **PR 제출, 본부 병합 대기** — 병합은 본부가 한다

## 끝난 것
- [x] 저장소 연결·클론, LFS pull, `npm ci`, 시작 전 check·test(93)·integration(5) 초록
- [x] 킷을 `docs/production/`·`tools/`로 커밋
- [x] game.js 51.5 KB → 26.4 KB(51%). render/·audio/·events·fx/·hud·characters/·perf-overlay로 분리
- [x] 동등성 확인: 렌더 상태 지문(high·light) 동일, 타이틀·선택·모델 렌더 캡처 픽셀 동일(`docs/production/captures/r01/before|after`)
- [x] 이벤트 버스(22종 + 추가 5종), rig-v2(로더·클립 선택·폴백·크로스페이드·걸음 동기화·상체 레이어·소켓·defs), `?rig=legacy`, `?perf=1` 오버레이
- [x] `build-production.mjs` v2 GLB 압축(Meshopt + KTX2, toktx 없으면 WebP), `server.mjs` MIME
- [x] 테스트 111개 통과(+18), integration 5개 통과, `npm run build` 정상
- [x] `HANDOFF.md`에 인터페이스 문서화
- [x] 성능 기준치 기록(high·mobile·light)

## 남은 것
- 본부: PR 검토·병합
- 인게임 before/after와 FPS는 실제 GPU 브라우저에서 확인 필요(샌드박스는 2초에 1프레임)

## 결정 사항
- 기존 액션 이펙트·불꽃놀이 → `public/fx/`(R10 소유, `REMASTER-HOOK r01`), HUD·로비 DOM → `public/hud.mjs`(R05용, `REMASTER-HOOK r01`). game.js를 고치지 않고 각 방이 작업할 수 있게 하려는 것
- `HANDOFF.md`는 저장소 루트에 새로 만듦(ROOM_PROTOCOL이 경로 없이 `HANDOFF.md`로 부름)
- 압축은 로컬에서 하고 결과 GLB를 커밋(배포 빌드는 개발 의존성이 없음)
- 이벤트 버스는 첫 스냅샷에서는 이벤트를 내보내지 않음

## 막힌 점(본부 확인 필요)
- 이 클라우드 세션에서는 **Git LFS 업로드가 거부된다**(LFS 저장소 S3 주소가 프록시에서 막힘). `artifacts/`·`art/`의 png/glb는 LFS 대상이라 푸시할 수 없다. R01은 캡처를 `docs/production/captures/r01/`(LFS 아님)에 둔다. 에셋을 만드는 방(C·D·E 등)은 같은 문제를 겪으므로, 본부가 허용 도메인을 추가하거나 로컬에서 푸시하는 방법을 정해야 한다.

## 진행 중인 job id
- 없음 (R01 Higgsfield 예산 0)
