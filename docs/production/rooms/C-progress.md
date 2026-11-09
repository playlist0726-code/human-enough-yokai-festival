# C방 진행 상황 — 캐릭터 1: 미즈 파일럿(R03) → 폰·콘(R06)

- 현재 브리프: **R03** · 브랜치 `remaster/r03-mizu-pilot`
- 마지막 갱신: 2026-11-08 23:40 (America/Denver)
- 상태: 진행 중 — 턴어라운드 생성 단계

## 시작 점검
- [x] 저장소 클론, `npm ci`, `npm run check`, `npm test` 112개 통과
- [x] R01 병합 확인(main `1435624`), Higgsfield 잔액 1,217.92 → R03 시작 조건 충족
- [x] MASTER_PLAN · ART_BIBLE · ASSET_CONTRACT · R03/R06 브리프 · HANDOFF · 참고 스킬 읽음
- [x] before 캡처 `docs/production/captures/r03/before` (01·02·05·06. 03은 샌드박스 소프트웨어 WebGL 재접속 화면, 04는 건너뜀 — R01과 같은 한계)

## 결정 사항
- 레퍼런스 업로드: 샌드박스에서 `upload.higgsfield.ai`가 막혀 있어, 레퍼런스는 GitHub raw URL → `media_import_url`로 넣는다.
- 결과 다운로드: 샌드박스에서 Higgsfield CDN(`*.cloudfront.net`)이 막혀 있음 → 사용자에게 허용 도메인 추가 요청(아래 "막힌 것").

## 막힌 것
- Higgsfield 결과 GLB/PNG를 작업 공간으로 받을 수 없음(CDN 차단). 허용 도메인 추가 전까지는 생성·평가는 Higgsfield 쪽에서, Blender 스크립트 작성은 로컬에서 진행.

## 다음 단계
1. A-pose 턴어라운드(정면 → 측면·후면·3/4)
2. Tripo H3.1 multiview vs Meshy 7 비교

## 진행 중인 job id
- (없음)

## 크레딧 사용 기록
| 날짜 | 항목 | 모델 | 크레딧 | job id |
|---|---|---|---|---|
