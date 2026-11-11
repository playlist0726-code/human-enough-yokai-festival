# VFX 연출표 (R10) — 이벤트 → 효과 → 사운드 큐

코드의 정본은 `public/fx/recipes.mjs`의 `FX_MAP`이다(이 표와 테스트 `tests/fx-map.test.mjs`가 같은 목록을 검사). R13은 **사운드 큐 이름**을 그대로 쓴다.

## 체계
- **풀 2개 = 드로우콜 2개**: `smoke`(만화풍 연기 플립북 4×4, 그라데이션 맵 셰이딩, 프레임 사이 블렌딩) · `glow`(가산 합성: 점·반짝이·하트·링). 비어 있으면 그리지 않음.
- **메시 효과**(`fx/meshes.mjs`): 바닥 링/충격파, 결계 돔(부적 띠 + 프레넬 + 스캔 라인), 빛 기둥. 조명 없음, 가산 합성.
- **게임필**(`fx/feel.mjs`): 트라우마 흔들림(trauma² · 1.6/s 감쇠, 렌더하는 동안에만 카메라를 움직이고 바로 되돌림), 화면 섬광(DOM, 최대 0.6), HUD 펄스. `prefers-reduced-motion`이면 흔들림 25%, 섬광 30%.
- **등급(tier)**: small(흔들림 0) · medium(0.22, 섬광 0.12) · large(0.55, 0.3). 흔들림은 대부분 **내 캐릭터 이벤트(local)** 에만.
- **예산**: 용량 glow 1,600 · smoke 280. 방출량은 프로필별 배율 high 1 · balanced 0.8 · **mobile 0.5** · light 0.5(캔버스 `data-quality`).
- **히트스톱**: 게임 시간은 game.js(본부) 소관이라 넣지 않았다. 필요하면 본부가 `timeScale` 훅을 열어 주면 `feel.hitstop()`으로 연결한다.

## 이벤트별 연출
| 이벤트 | 등급 | 파티클·메시 | 카메라·화면·UI | 사운드 큐 |
|---|---|---|---|---|
| (오프닝) 변신 | — | 기운 나선 → 연기 기둥 + 중심 연기 → 펑(별 불꽃·링·섬광) → 연기 걷힘·색종이 | 천천히 밀기 → 웅크림 떨림 → 펑에 킥 → 빠지기. 캐릭터: 마법 손 → 웅크림 → 깡충+젤리 → 짜잔 | `transform_gather` `transform_pop` `transform_reveal` |
| `potion_pickup` | small | 포션색 반짝이 분출 + 작은 나선 + 바닥 링 | — | `potion_pickup` |
| `potion_drink` | small | 몸을 감고 오르는 나선 44 + 반짝이 기둥 + 2중 링 | 영력 게이지 펄스(내 캐릭터) | `potion_drink` |
| `charm_cast` | medium | 시전자 손 나선 → 분홍·보라 리본이 손님 머리로 호(0.6초, 선두 구슬) → 하트 8개 + 링 | — | `charm_cast` |
| `charm_end` | small | expired: 연기 한 줌 + 회색 하트 낙하 · transferred: 금 반짝이 | — | `charm_end` |
| `cover_ward` | medium | 결계 돔(반경 3.2 = 규칙 범위, 플레이어를 따라감, 2.2초) + 펼침 링 + 부적 반짝이 10개 공전 | — | `cover_ward` |
| `reveal_start` | medium | 머리 위 "뿅": 연기 8 + 별 16 + 반짝 섬광 + 링 | 흔들림 0.25(내 캐릭터) | `reveal_pop` |
| `reveal_end` | small | 연기 한 줌 | — | `reveal_hide` |
| `guest_delivered` | large | 신사 빛 기둥(8 m) + 2중 링 + 위로 오르는 등불 불티 30 | 섬광 0.18(내가 배달) | `guest_delivered` |
| `stall_win` / `stall_fail` / `stall_reward` | medium/small | 색종이 반짝이 / 회색 연기 / 금 반짝이 | — | `stall_win` `stall_fail` `stall_reward` |
| `stall_enter` | none | (UI 전환) | — | `stall_enter` |
| `hit` | medium | 분홍 충격 별 + 불티 | 흔들림 0.45(내 캐릭터). 화면 가장자리 붉음은 기존 `combat-hit`(R11) | `hit` |
| `sealed` | medium | 보라 연기 고리 + 보라 링 | 흔들림 0.4 | `sealed` |
| `rescued` | medium | 금빛 상승 나선 + 링 | — | `rescued` |
| `boss_omen` | medium | 보라 충격파(7 m) + 주황 경고 링 + 검보라 연기 | 흔들림 0.18(모두) | `boss_omen` |
| `spirit_bolt` | small | 파란 불꽃 투사체(0.28초, 꼬리) → 수정 명중 분출. 콤보는 더 크게 | 명중 흔들림 0.12 / 콤보 0.3 | `spirit_bolt` |
| `ward_block` | small | 금 불티 + 짧은 링 | — | `ward_block` |
| `seal_break` | medium | 보라 파편 + 연기 | 흔들림 0.2 | `seal_break` |
| `boss_banished` | large | 대형 분출 70 + 연기 12 + 링 9 m + 빛 기둥 12 m | 섬광 0.35 + 흔들림 0.65 | `boss_banished` |
| `ping` | small | 청록 빛 기둥 + 3중 링 | — | `ping` |
| `footstep` | small | 발밑 먼지 한 점(카메라 16 m 안 또는 내 캐릭터) | — | `footstep` |
| `jump` / `land` | small | 먼지 고리 5 / 8 + 착지 링 | — | `jump` `land` |
| `round_start` | medium | 불꽃 3발 동시 | — | `round_start` |
| `round_end` | large | 승리: 불꽃 6발 + 섬광 | — | `round_end` (+ 결과별 스팅어는 R13) |
| `firework` | small | 로켓 꼬리 → 피오니·링·하트·버드나무 + 늦은 반짝임 | 하늘 섬광 0.05(+ R02 `pipeline.flash`) | `firework` |

## 보스 예고(R11과 협업)
경고 원(주황)과 충격파(보라)의 **판정 모양 자체**는 `encounter-view.mjs`(R11 소유)가 그린다. R10은 `boss_omen` 순간의 충격파·경고 링·연기와 흔들림만 더한다. R11이 판정 원을 다시 그릴 때 `fx/meshes.mjs`의 `ring()`을 그대로 쓸 수 있다(같은 셰이더, 반경·색·수명 인자).

## 검수 도구
- `public/fx/lab.html` — 효과를 프레임 단위로 렌더(게임과 같은 파이프라인·블룸). `?mode=transform&chars=mizu,pon,kon` / `?mode=world&effect=charm|ward|potion|reveal|delivery|boss|feet|fireworks&profile=high|mobile`
- `source/v2/fx/record_lab.py` — 위 페이지를 GIF로 기록(소프트웨어 WebGL에서도 실제 타이밍).
- 텍스처: `source/v2/fx/build_fx_textures.py` → `public/assets/fx/smoke-atlas.png`(37 KB), `glow-atlas.png`(18 KB). 크레딧 0.
