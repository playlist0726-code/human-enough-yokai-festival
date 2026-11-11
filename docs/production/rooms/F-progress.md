# F방 진행 상황 — UI · VFX · 사운드 (R05 → R10 → R13)

- 마지막 갱신: 2026-11-08 (America/Denver)
- 현재 브리프: **R10 VFX · 게임필** — 브랜치 `remaster/r10-vfx` (R05는 PR #2)
- 상태: **R10 PR #3 제출(본부 병합 대기)** → 다음 R13

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

## R05 승인 이후 끝난 것(2026-11-09)
- [x] 사용자 승인: "승인, 이대로 양산"
- [x] UX 감사 `UI_UX_AUDIT.md`, `UI_KIT.md`, `CREDITS.md`(UI 항목)
- [x] 아이콘 17종(`build_icons.py`), 키 바·터치·인벤토리·일지 적용
- [x] 로고 워드마크(`build_logo.py`), 로딩 화면, 재연결 화면, 모달 종이화, 선택 카드
- [x] 휴대폰 세로/가로 터치 레이아웃 수정, 초상화 슬롯, `tests/ui-kit.test.mjs`
- [x] 게이트: check, test 116, integration 5, after 캡처, perf(high 2,473 draw calls / 텍스처 127, 기준과 같음)

## (기록) 승인 전 계획
1. UX 감사 문서, `docs/production/UI_KIT.md`
2. 아이콘 패밀리(홀리기, 결계, 점프, 공유, 넘기기, 도움, 스탬프 6, 하트, 손님) → 키 바·터치 버튼에 적용
3. 터치 버튼·조이스틱 외형, 휴대폰 390×844 정리(겹침 해결)
4. 타이틀/선택/로비/메뉴/결과/대화 화면 테마, 로고 워드마크(투명), 초상화 자리, 로딩 화면(50초 서버 깨우기)
5. 품질 게이트 → PR → HANDOFF

## 진행 중인 job id
- 없음 (R05 Higgsfield 사용 0)

---

# R10 VFX · 게임필 (`remaster/r10-vfx`)

## 끝난 것
- [x] 대표 효과(변신 오프닝) 1차 → 사용자 피드백 "관절이나 다 너무 굳어있다" → 수정본 승인("승인, 이대로 양산")
  - 수정: 리그 포즈(마법 손 → 짜잔), 캐릭터별 위상 다른 흔들림·몸 돌림, 웅크림 → 깡충 + 젤리 출렁임, 플립북 프레임 블렌딩, 부드러운 카메라 흔들림
  - 관절(팔꿈치·무릎) 자체는 모델 뼈대 문제 → R03 이후 캐릭터 방 새 리그가 해결(사용자에게 안내함)
- [x] 파티클 풀(`fx/particles.mjs`, 인스턴스 빌보드, 풀 2개 = 드로우콜 2), 메시 효과(`fx/meshes.mjs`), 게임필(`fx/feel.mjs`)
- [x] 이벤트 → 효과 표 `fx/recipes.mjs` + `docs/production/VFX_LIST.md`(사운드 큐 이름 포함, R13이 사용)
- [x] 불꽃놀이 재작성(로켓 꼬리, 피오니·링·하트·버드나무), 액션 라벨은 라벨만(효과마다 PointLight 제거)
- [x] 효과 랩 `public/fx/lab.html` + `source/v2/fx/record_lab.py`, GIF 9종 `captures/r10/`
- [x] 테스트 `tests/fx-map.test.mjs`(5개: 매핑·예산·NaN·모바일 절반·드로우콜·카메라 복원), 총 117 통과
- [x] 게임 안 확인: 오프닝·플레이 오류 0, light 프로필 드로우콜 849(R01 기준과 같음)

## 결정 사항
- 연기는 생성 영상 대신 **절차적 만화풍 플립북**(크레딧 0, 그라데이션 맵으로 연기·먼지·봉인 연기를 한 장으로).
- 히트스톱은 게임 시간(game.js, 본부)이 필요해서 넣지 않음 → 본부에 `timeScale` 훅 제안.
- 흔들림은 렌더하는 동안에만 카메라에 더하고 즉시 되돌림(카메라 추적 코드에 영향 없음).
- `actors.mjs`(R03)에 오프닝 포즈 훅 1곳(`REMASTER-HOOK r10`).

## 진행 중인 job id
- 없음 (R10 Higgsfield 사용 0)
