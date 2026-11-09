# F방 진행 상황 — UI · VFX · 사운드 (R05 → R10 → R13)

- 마지막 갱신: 2026-11-08 (America/Denver)
- 현재 브리프: **R05 UI · HUD · 2D 아트** — 브랜치 `remaster/r05-ui`
- 상태: **대표 결과물 승인 대기** (HUD 1280×720 + 포션 아이콘 + 토큰)

## R05 끝난 것
- [x] 시작 점검: `npm ci`, check, test 112, integration 5 모두 초록
- [x] before 캡처: `docs/production/captures/r05/before`(1280×720), `before-phone`(390×844)
- [x] UI 텍스처(절차적, 크레딧 0): `source/v2/ui/build_ui_textures.py` → `public/assets/ui/{paper-tile.webp, panel-paper.png, wood-tile.webp, plaque-wood.png}` (합계 약 33 KB, 그림자 9-slice에 구움)
- [x] 로컬 폰트(OFL): Fredoka(제목·숫자) + Nunito(본문) → `public/assets/ui/fonts/`, `server.mjs`에 woff2 MIME(`REMASTER-HOOK r05`)
- [x] 아이콘 패밀리 기준 1개: `public/assets/ui/icons/potion.svg` (64 그리드, 3px 먹선, 크림 다이컷 테두리, 좌상단 광원)
- [x] HUD 테마 레이어(`style.css` 끝): 시계 나무패 · 목표 종이표 · 상태 패널(초상 메달·영력 홈·포션 아이콘) · 나무 키 바 · 장면 위 텍스트는 먹 태그
- [x] `hud.mjs`: 인라인 색 → 클래스(`.meter.low`, `.team-pill`)
- [x] 리뷰 보드: `docs/production/captures/r05/review/r05-representative-board.png`

## 결정 사항
- 아이콘은 생성 이미지 대신 **손으로 그린 SVG**(skills-ref create-game-assets: "단순한 기호는 SVG"). 선 두께·광원·테두리를 코드로 고정해 패밀리 일관성이 보장되고 크레딧이 들지 않는다.
- 패널 그림자는 CSS `filter` 대신 9-slice PNG에 구워 넣음(매 프레임 합성 비용 0).
- 레이아웃 앵커는 R01 그대로 두고 표면만 바꿈(휴대폰 레이아웃 회귀 위험 최소화). 정보 우선순위: 시간(좌상단 가장 큰 숫자) → 목표 → 영력 → 포션.
- 샌드박스 소프트웨어 WebGL은 1280×720에서 소켓이 자주 끊김 → 리뷰 캡처는 `source/v2/ui/capture_hud.py`(rAF 간격 늘림, 재연결 베일 숨김). 밤 화면은 R02 전까지 오프라인 그레이드로 **흉내만** 냄(출시물 아님).

## 다음 단계(승인 후)
1. UX 감사 문서, `docs/production/UI_KIT.md`
2. 아이콘 패밀리(홀리기, 결계, 점프, 공유, 넘기기, 도움, 스탬프 6, 하트, 손님) → 키 바·터치 버튼에 적용
3. 터치 버튼·조이스틱 외형, 휴대폰 390×844 정리(겹침 해결)
4. 타이틀/선택/로비/메뉴/결과/대화 화면 테마, 로고 워드마크(투명), 초상화 자리, 로딩 화면(50초 서버 깨우기)
5. 품질 게이트 → PR → HANDOFF

## 진행 중인 job id
- 없음 (R05 Higgsfield 사용 0)
