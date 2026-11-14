# E방 진행 상황 — 인간 캐스트 + 데몬킹 (R11 → R09)

- 현재 브리프: **R11** 데몬킹 보스·미니언 · 브랜치 `remaster/r11-demon-king`
- 마지막 갱신: 2026-11-13 22:50 (America/Denver)
- 상태: 데몬킹 정면 턴어라운드 완료 → **사용자 승인 대기**

## 시작 점검
- [x] 저장소 클론, `npm ci`·`npm run check`(72 files)·`npm test` 통과(main 기준 134, main+#8 기준 137)
- [x] bpy venv(`bpy` 5.3.0 설치됨 — 파이프라인 문서는 5.2 기준)
- [x] ROOM_PROTOCOL · MASTER_PLAN · ART_BIBLE · ASSET_CONTRACT · R11/R09 브리프 · HANDOFF · CHARACTER_PIPELINE(PR #8) · DEMON_KING.md 읽음
- [x] before 캡처 `docs/production/captures/r11/before`(01·02. 인게임은 샌드박스 소프트웨어 WebGL에서 세션 끊김 — R01·R03과 같은 한계)
- [x] 맥 `~/Downloads` 폴더 접근 허용(내장 브라우저로 결과 받기)
- Higgsfield 잔액 **115.33** (11-13 시작 시점) → 88.83 (11-13 22:46, 다른 방 사용분 포함)

## 결정 사항
- **브랜치 기반:** 파이프라인(`source/v2/pipeline/`, `CHARACTER_PIPELINE.md`)이 아직 PR #8에만 있어서, R11은 `main` + `remaster/r03-mizu-pilot` 병합 커밋 위에서 시작한다. #8 병합 후 R11 커밋만 main 위로 rebase한다. R09는 사용자 지시대로 #8 병합 후 main에서 시작한다.
- 디자인 레퍼런스: 트레일러의 데몬킹(`artifacts/demon-king/trailer-contact-sheet.jpg` 두 컷 → `source/v2/characters/demon_king/reference/trailer_king.png`) + 게임 스타일(`cast.png` 크롭).

## 디자인 메모
- 정면(`source/v2/characters/demon_king/turnaround/front.png`): 트레일러 데몬킹(회보라 피부·검은 갈기·상아 뿔·붉은 눈·이빨 웃음·턱수염)을 게임의 매트 비닐 토이 스타일로. 남색 로브+금 테두리·보라 별무늬·금 허리띠, 로브 자락이 종 모양으로 발을 가림(떠 있는 보스).
- 수정구는 메시에 넣지 않는다: 지금처럼 런타임 유리·발광 구체(+궤도 고리)를 `x_crystal` 뼈에 붙인다(반투명·발광은 베이크 텍스처로 안 됨).

## 막힌 것
- (해결) 내장 브라우저 다운로드: 창이 숨겨진 상태에서는 `<a download>` 클릭이 바로 저장되지 않는 경우가 있었음 — 다시 실행하자 저장됨. 파일 크기로 확인한다.
- Chrome(Control_Chrome)은 실행 중이 아니라 못 씀.

## 다음 단계
1. ~~데몬킹 정면 턴어라운드~~ → 대표 승인 대기
2. 좌·후·우·3/4 + 표정 시트

## 진행 중인 job id
- (없음)

## 크레딧 사용 기록
| 날짜 | 항목 | 모델 | 크레딧 | job id |
|---|---|---|---|---|
| 11-13 | 데몬킹 정면 2k high | gpt_image_2_6 | 2.75 | 10937a37-cf4b-4cd6-a59a-78d2277246f5 |
