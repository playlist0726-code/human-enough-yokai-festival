# UI Kit v1 — "축제 종이와 나무패" (R05)

승인: 2026-11-08 사용자(대표 결과물 `captures/r05/review/r05-representative-board.png`).
원칙: 화면 위의 모든 UI는 **종이**(정보) 아니면 **나무패**(시간·조작·버튼) 둘 중 하나다. 3D 장면 위에 맨 글자를 두지 않는다(먹 태그를 깐다).

## 1. 토큰(`public/style.css` 맨 위 `:root`)
| 토큰 | 값 | 용도 |
|---|---|---|
| `--paper` / `-2` / `-3` | `#f4efe6` `#ebe1cf` `#dccdb2` | 패널 바탕 / 알약·입력 / 구분선 |
| `--ink` / `-2` / `-3` | `#2b2622` `#5a4c40` `#6e5a4a` | 본문 / 보조 / 캡션 |
| `--vermilion` | `#e8603c` | 장식 채움(등불, 스탬프). **글자에 쓰지 않음**(대비 2.97) |
| `--vermilion-ink` | `#a83c24` | 종이 위 강조 글자, 기본 버튼 바탕 |
| `--gold` / `--gold-deep` | `#e9b765` `#b98a3e` | 나무패 위 라벨, 포커스 링, 선택 테 |
| `--wood` / `--wood-2` | `#4a3124` `#2f1f17` | 나무패 |
| `--night` / `-2` / `-3` | `#191a29` `#1d2744` `#25355e` | 먹 태그, 메달 배경, 로딩 |
| `--lantern` | `#ffb066` | 빛·발광(진행률, 선택 글로우) |
| `--spirit` / `--spirit-hi` | `#a98cff` `#e4dbff` | 영력 게이지 |
| `--danger` | `#c4485a` | 영력 부족, 노출 |
| `--font-display` | Fredoka 300–700 | 제목, 숫자(시간·점수·방 코드), 이름표 |
| `--font-body` | Nunito 200–1000 | 본문, 버튼, 라벨 |

## 2. 대비(WCAG 2.1, 본문 4.5:1 이상)
| 글자 / 바탕 | 대비 |
|---|---|
| ink / paper | 13.07 |
| ink-2 / paper | 7.21 |
| ink-3 / paper | 5.69 |
| vermilion-ink / paper | 5.50 |
| ink-2 / paper-2 | 6.37 |
| paper / wood | 10.44 |
| gold / wood | 6.51 |
| #fff6e6 / vermilion-ink(버튼) | 5.87 |
| paper / night 태그 | 13+ |
| #e6c993 / night(텍스트 버튼) | 10.76 |

## 3. 표면
| 클래스 | 만드는 법 | 쓰는 곳 |
|---|---|---|
| 종이 `.ui-paper` | `border: 11px` + `border-image: panel-paper.png 30 / 11px round`, 안쪽은 `paper-tile.webp` 반복(`background-clip: padding-box`) | 목표, 상태, 지도, 상호작용, 토스트, 대화, 모든 모달(`.lobby-card`는 14px) |
| 나무패 `.ui-wood` | `border: 9px` + `plaque-wood.png 26 / 9px round`, 안쪽 `wood-tile.webp` | 시계, 키 바 |
| 작은 나무 버튼 | `--wood-panel` 배경 + 1px `#1c120d` 테 + `0 2–3px 0 #1c120d` | 방 버튼, 보기 칩, `.secondary`, 방 코드 |
| 먹 태그 | `#191a29c4`, 반경 8px, 크림 글자 | 장면 위의 상태 줄 |
| 기본 버튼 `.primary` | 주홍 옻칠 그라데이션 + 금테 + `0 4px 0 #5b1f12` | 시작, 방 만들기, 다시 하기 |
| 키 캡 `kbd` | 종이 바탕 + 먹 글자 + `0 2px 0 #9a7b55` | 키 바 |

9-slice 원본은 `source/v2/ui/build_ui_textures.py`(시드 고정, 다시 실행하면 같은 파일). 그림자를 PNG에 구워서 CSS `filter`를 쓰지 않는다(매 프레임 합성 비용 0).

## 4. 아이콘
- 규칙: 64 그리드, 크림(`#f4efe6`) 다이컷 테두리 9px, 먹선 3px(`#2b2622`), 둥근 이음, 좌상단 광원(흰 하이라이트 1개), 팔레트 안의 평면 채움.
- 원본: `potion.svg`(손으로 그린 기준), 나머지는 `source/v2/ui/build_icons.py`가 같은 상수로 생성.
- 목록(`public/assets/ui/icons/`): potion, interact, charm, ward, jump, share, handoff, help, strike, heart, guest, stamp-shoot · fish · ring · cook · fortune · ice.
- 크기: 키 바 20px, 터치 24px(가로 20px), 인벤토리 22px, 스탬프 40px. SVG라 128/64/32 어느 크기든 선명하다.
- 새 아이콘은 `build_icons.py`에 추가한다. 손으로 따로 그리지 않는다(패밀리가 흐트러짐).

## 5. 로고·초상화
- 워드마크: `logo-wordmark.webp`(1200), `logo-wordmark-600.webp`. 키아트 로고를 따뜻함 키로 분리(`source/v2/ui/build_logo.py`), 디자인은 원본 그대로. 밤색 후광을 넣어 어떤 바탕에서도 읽힌다.
- 초상화 슬롯: `/assets/ui/portraits/<id>.webp`(512², 투명, 머리와 어깨, 키아트 조명) + `index.json`의 `portraits`에 id 추가 → 선택 화면·로비·HUD 메달이 자동 교체. 없으면 레퍼런스 PNG.

## 6. 레이아웃 규칙
- 앵커: 좌상단 시계 → 그 아래 방 코드·메뉴 → 보기 칩 / 우상단 목표 / 좌하단 상태 / 우하단 지도 / 하단 중앙 키 바(데스크톱) 또는 좌 조이스틱·우 터치 그리드(휴대폰).
- 휴대폰 엄지 영역: 행동 버튼은 오른쪽 아래 3열(세로) 또는 5열(가로), 최소 44px. 조이스틱은 왼쪽 아래.
- 안전 영역: 모든 모서리 요소는 `env(safe-area-inset-*)`를 더한다(R01 규칙 유지).
- 글자 최소: 데스크톱 10px(라벨 대문자), 본문 11–14px. 휴대폰 9.5px 라벨은 아이콘과 함께일 때만.

## 7. 움직임
- 등불 흔들림 2.2–2.4s, 선택 카드 도착 0.35s, 스탬프 획득 −8° 회전. 모두 `prefers-reduced-motion: reduce`에서 끈다.

## 8. 다른 방이 쓸 때
- R10(VFX): 화면 플래시·UI 반응은 토큰 색(`--lantern`, `--spirit`, `--vermilion`)을 쓴다. HUD 요소에 CSS 클래스(`.pressed` 등)를 붙이는 방식으로 반응한다.
- R11(보스): `encounter-view.mjs`의 보스 카드는 아직 보라 카드다. 종이/나무 표면으로 바꾸려면 이 문서의 표면 클래스를 쓴다.
- R13(사운드): 설정 메뉴 `Settings` 블록에 볼륨 슬라이더를 넣을 때 `.settings-grid`의 2열 그리드를 따른다.
