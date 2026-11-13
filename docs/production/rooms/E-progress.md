# E방 진행 상황 — 인간 캐스트 + 데몬킹 (R11 → R09)

- 현재 브리프: **R11** 데몬킹 보스·미니언 · 브랜치 `remaster/r11-demon-king`
- 마지막 갱신: 2026-11-13 (America/Denver)
- 상태: 시작 — 디자인 시트 생성 전

## 시작 점검
- [x] 저장소 클론, `npm ci`·`npm run check`(72 files)·`npm test` 통과(main 기준 134, main+#8 기준 137)
- [x] bpy venv(`bpy` 5.3.0 설치됨 — 파이프라인 문서는 5.2 기준)
- [x] ROOM_PROTOCOL · MASTER_PLAN · ART_BIBLE · ASSET_CONTRACT · R11/R09 브리프 · HANDOFF · CHARACTER_PIPELINE(PR #8) · DEMON_KING.md 읽음
- [x] before 캡처 `docs/production/captures/r11/before`(01·02. 인게임은 샌드박스 소프트웨어 WebGL에서 세션 끊김 — R01·R03과 같은 한계)
- [x] 맥 `~/Downloads` 폴더 접근 허용(내장 브라우저로 결과 받기)
- Higgsfield 잔액 **115.33** (11-13 시작 시점)

## 결정 사항
- **브랜치 기반:** 파이프라인(`source/v2/pipeline/`, `CHARACTER_PIPELINE.md`)이 아직 PR #8에만 있어서, R11은 `main` + `remaster/r03-mizu-pilot` 병합 커밋 위에서 시작한다. #8 병합 후 R11 커밋만 main 위로 rebase한다. R09는 사용자 지시대로 #8 병합 후 main에서 시작한다.
- 디자인 레퍼런스: 트레일러의 데몬킹(`artifacts/demon-king/trailer-contact-sheet.jpg` 두 컷 → `source/v2/characters/demon_king/reference/trailer_king.png`) + 게임 스타일(`cast.png` 크롭).

## 다음 단계
1. 데몬킹 정면 턴어라운드 → 대표 승인
2. 좌·후·우·3/4 + 표정 시트

## 진행 중인 job id
- (없음)

## 크레딧 사용 기록
| 날짜 | 항목 | 모델 | 크레딧 | job id |
|---|---|---|---|---|
