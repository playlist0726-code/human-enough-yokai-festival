# C방 진행 상황 — 캐릭터 1: 미즈 파일럿(R03) → 폰·콘(R06)

- 현재 브리프: **R06 완료** · 브랜치 `remaster/r06-pon-kon` (R03 PR #8 위에 쌓음 — #8이 먼저 병합돼야 함)
- 마지막 갱신: 2026-11-13 00:30 (America/Denver)
- 상태: **R03 완료** — 사용자 승인(11-13 00:33), PR #8 https://github.com/playlist0726-code/human-enough-yokai-festival/pull/8

## 시작 점검
- [x] 저장소 클론, `npm ci`, `npm run check`, `npm test` 112개 통과
- [x] R01 병합 확인(main `1435624`), Higgsfield 잔액 1,217.92 → R03 시작 조건 충족
- [x] MASTER_PLAN · ART_BIBLE · ASSET_CONTRACT · R03/R06 브리프 · HANDOFF · 참고 스킬 읽음
- [x] before 캡처 `docs/production/captures/r03/before` (01·02·05·06. 03은 샌드박스 소프트웨어 WebGL 재접속 화면, 04는 건너뜀 — R01과 같은 한계)

## 결정 사항
- 레퍼런스 업로드: 샌드박스에서 `upload.higgsfield.ai`가 막혀 있어, 레퍼런스는 GitHub raw URL → `media_import_url`로 넣는다.
- 결과 다운로드: 샌드박스에서 Higgsfield CDN(`d2ol7oe51mr4n9`·`d8j0ntlcm91z4.cloudfront.net`)이 막혀 있음 → 사용자에게 허용 도메인 추가 요청. 평가 렌더는 Higgsfield 샌드박스(three.js + 헤드리스 Chromium)에서 함.
- 턴어라운드에서 떠 있는 물방울과 포션 병은 뺐다: 물방울은 이펙트(R10)·텍스처로, 포션은 `socket_hip_L`/`socket_hand_R` 소품으로 붙는다. 디자인 변경이 아니라 메시 분리.

## 막힌 것
- (해결) CDN 차단 → 본부 지시대로 사용자 맥의 내장 브라우저로 결과 12개를 `~/Downloads/hef-r03/`에 받고 작업 공간으로 스테이징(크기 일치 확인). 맥 셸도 같은 허용 목록이라 curl은 실패.

## 끝난 것(파이프라인)
- [x] `source/v2/pipeline/`: charkit, clean_character, rig_contract, motion_lib, animate_contract, export_contract, reveal_prop, preview, build_character
- [x] 대역(기존 mizu_yokai.glb)으로 전 단계 실행 → validator PASS(player), `npm run build` 압축 후 rig-v2에서 14클립·소켓·모프·높이 2.85 확인
- [x] 버그 수정: 클립 길이 1.25배(Blender 24fps) → 30fps 고정
- [x] rig-v2: 얼굴 모프(깜빡임·놀람·봉인 시 반쯤 감김) + 테스트
- [x] human-base(공용 인간 몸: base.json·motion.py·정면 레퍼런스), 미즈 human.json·reveal.json·motion.py·motion_human.py·build.py
- [x] CHARACTER_PIPELINE.md 초안

## R03 실제 빌드 (11-11~13)
| 자산 | 삼각형 | 뼈 | 재질 | 원본 GLB | 런타임(meshopt+WebP) | validator |
|---|---|---|---|---|---|---|
| mizu_yokai | 22,000 | 23(+x_dish, x_shell) | body·eyes·cloth | 2.55 MB | 1.18 MB | PASS(player) |
| mizu_human | 13,499 | 21 | body·eyes·cloth | 1.92 MB | 1.00 MB | PASS(disguise) |
| mizu_reveal | 4,499 | — | 1 | 0.25 MB | 0.12 MB | PASS(prop) |
- 걸음 실측(`gait.json`): 요괴 walk 2.59 / run 5.02, 인간 walk 2.33 / run 4.27 (u/s). 서버 3.6에서 배속 1.39 / 1.54 → 발 미끄러짐 없음. `defs/mizu.json`에 `formGait`로 등록.
- R10 요청: `actors.mjs`의 오프닝 훅은 R10이 이미 넣었고, v2 쪽을 받게 했다 — `openingClip(p)`: `cover>0`(타다) → `victory`, `charm` → 상체 `charm_cast`. 폼 전환은 0.51(같은 타임라인). 테스트 추가.
- R05 요청: `public/assets/ui/portraits/mizu.webp`(512², 투명, 머리·어깨, 키아트 조명) + `index.json` 등록 → 선택 화면에 표시 확인(`captures/r03/after/02_select.png`).
- rig-v2: 폼별 걸음(`formGait`), 오프닝 클립, 얼굴 모프. 테스트 136 → 137.

### 실제 빌드에서 잡은 결함(모두 파이프라인에 반영)
1. Blender 5는 새 셰이프 키를 1.0으로 만든다 → 눈이 찌그러짐. 0으로 고정.
2. 인간 눈동자가 검정이 아니라 진갈색(명도 0.3) → eyes 규칙 `v_max 0.42, h_max 0.16`.
3. Blender 내보내기가 JPEG 품질을 무시 → export 후 GLB 안 텍스처를 직접 재인코딩(+ 형태별 normal/ORM 512).
4. ORM 파란 채널이 JPEG/WebP 뒤 0이 아님 × metallicFactor 기본 1 → 금속처럼 번들거림. `metallicFactor: 0` 고정, 시트 색을 cloth_sheen으로.
5. 눈 노멀맵 압축 노이즈 + 거칠기 0.12 → 눈 테두리 반짝임. 눈은 노멀맵 제거, 거칠기 0.25.
6. 머리카락 아래 AO가 얼굴에 회색 얼룩 → `ao_strength`(인간 0.4, 요괴 0.75).
7. 리빌 소품이 머리 위에 떠 있음 → 미즈 `socket_reveal` 0.86H, 폭 0.86 m.
8. 인간 걸음이 서버 속도에 비해 느림(배속 2.7) → 보폭 0.28/0.26, 11프레임.
9. 인간 GLB 2.01 MB(한도 2.0) → 3번으로 해결.

### 검수 캡처
- `docs/production/captures/r03/review/` — `review_capture.py`(게임의 rig-v2 + R02 조명 + 게임 카메라, SwiftShader로 동작): game_distance, closeup_pair, concept_compare, turn_sheet, walk_yokai/human/game.gif, studio_*.png, portrait.png
- 전체 게임 인게임 캡처는 샌드박스 소프트웨어 WebGL에서 세션이 끊김(R01과 같은 한계) → 실제 GPU 확인은 사용자/R14.

## 다음 단계
1. ~~사용자 승인(게이트 A) → PR~~ 완료: PR #8
2. R06(폰 → 승인 → 콘) — 브랜치 `remaster/r06-pon-kon`(R03 위에 쌓음)

## 진행 중인 job id
- (없음 — 아래 완료 job들은 결과 URL에서 다시 받을 수 있음)

## 3D 생성 비교 (R03 작업 2)
| | Tripo H3.1 multiview (4뷰) | Meshy 7 (정면 1장, PBR, A-pose, symmetry on) |
|---|---|---|
| 비용 | 18 cr | 38 cr |
| 원본 | 1,985,382 삼각형, 65 MB, 텍스처 3장(base·MR·normal) | 60,900 삼각형, 10.8 MB, 텍스처 3장 |
| 정면 | 컨셉과 일치, 눈·볼·입 깨끗 | 좋음 |
| 측면·후면 | 등껍질 육각 무늬·뒤통수·잎 왕관 입체가 턴어라운드와 일치 | 뒤통수에 등껍질 무늬가 번짐, 등껍질에 덩어리, 눈이 옆으로 튀어나옴 |
| 방향 | 정면이 +X(glTF) → `yaw_deg: -90` | 정면 +Z |
| **선택** | **채택** — 멀티뷰가 뒷모습을 지켜 줌. 리메시·베이크는 우리 파이프라인이 하므로 원본 밀도는 문제 없음 | 탈락 |

## 크레딧 사용 기록
| 날짜 | 항목 | 모델 | 크레딧 | job id |
|---|---|---|---|---|
| 11-08 | 턴어라운드 정면 2k high | gpt_image_2_6 | 2.75 | 0516dc71-ea43-4027-8b49-f9ebe92fab5c |
| 11-08 | 턴어라운드 좌·후·우·3/4 | gpt_image_2_6 | 11.0 | 161a0106-c1f7-44d4-a4d4-08b337fa938e, 72305d8c-957c-4371-9595-fce026a49fed, 1aa68b13-1364-41e3-b0eb-ab3b6b16091c, 1c208edc-8732-4b46-ae29-ddb3d55c3c8c |
| 11-08 | 3D 비교 A | tripo_h3_1_multiview_to_3d (detailed/detailed, pbr) | 18 | 2b14b19a-0df8-4a11-8b8a-c392470a8283 |
| 11-08 | 3D 비교 B | meshy_v7_image_to_3d (pbr, a-pose, symmetry on, 60k) | 38 | 55fee2dd-12b6-4e29-997f-553f77aa333f |
| 11-08 | 인간 기본 몸(human-base) 정면 | gpt_image_2_6 | 2.75 | d0bc7162-c94e-4eca-b5cb-d67223c8664f |
| 11-08 | 미즈 인간 변장 정면 | gpt_image_2_6 | 2.75 | 42792cc9-d544-4585-b53f-59ebda81ee23 |
| 11-08 | 미즈 인간 변장 좌·후·우 | gpt_image_2_6 | 8.25 | a27d3d00-6d7f-456b-925e-7fd698b42bd4, 4f92e300-d588-476f-826c-9ac63c3aacd1, 2ff50525-20bb-42c2-9c25-ef86a101490c |
| 11-08 | 미즈 인간 변장 3D | tripo_h3_1_multiview_to_3d (face_limit 400k) | 18 | b62f8d03-c414-4dfd-865e-80d6836211dd |
| | **R03 누계** | | **101.5** (요괴 3D 비교 56 포함, 리빌 소품은 생성 없이 잘라냄) | |

---
# R06 폰·콘 (11-13 시작)

## 시작 점검
- [x] 게이트 A: 사용자 승인(11-13 00:33), R03 PR #8
- [x] 브리프 r06 읽음. 인간 변장(pon_human·kon_human)은 R09 소유 → R06은 요괴 + 리빌 소품 + defs

## 결정 사항
- **index.json 등록은 보류**: rig-v2는 def가 있으면 리그 전체를 v2로 바꾸는데, 폰·콘은 인간 폼이 아직 없어 변장 단계에서 요괴가 보이게 된다. `defs/pon.json`·`kon.json`은 만들되 `index.json`에는 R09의 `*_human.glb`가 들어올 때 넣는다. 게임 확인은 `review_capture.py`(defs를 직접 읽음)로 한다. 본부 요청: v2 요괴 + 기존 인간을 섞는 하이브리드가 필요하면 rig-v2에 추가(C방이 할 수 있음).
- 손에 든 간식·포션은 메시에서 뺀다(미즈와 같은 규칙).

## 크레딧 (R06)
| 날짜 | 항목 | 모델 | 크레딧 | job id |
|---|---|---|---|---|
| 11-13 | 폰 턴어라운드 정면 | gpt_image_2_6 | 2.75 | 66a7df83-2d10-4f58-902b-414a891bb7b6 |
| 11-13 | 폰 턴어라운드 좌·후·우 | gpt_image_2_6 | 8.25 | 04977bdc-8e85-4a72-95a2-58afe6188e52, 2f210ddc-4a86-405f-ac7a-162e9f4db033, 6e9b64d8-dfb9-4b76-95f8-1b380df8b635 |
| 11-13 | 폰 3D | tripo_h3_1_multiview_to_3d (face_limit 400k) | 18 | 83a65522-16ba-4f98-9b9b-4cbdd97aa7ea |

## 폰 결과 (11-13)
| 자산 | 삼각형 | 원본 | 런타임 | validator |
|---|---|---|---|---|
| pon_yokai | 22,000 · 27뼈(+x_belly_jaw, x_tail_01~03) | 2.46 MB | 1.20 MB | PASS(player) |
| pon_reveal(꼬리) | 4,499 | 0.19 MB | 0.09 MB | PASS(prop) |
- 걸음: walk 2.05 / run 3.80 u/s → 서버 3.6/4.86에서 1.76×/1.28×. 다리가 약 11 cm라 보폭을 다리 한계 안에 두고, 뒤뚱거림은 몸 굴림(roll 11°)·좌우 이동·팔 균형·꼬리 반대 흔들림으로 표현.
- 배의 입: `x_belly_jaw`(아래턱 = 배). idle에 가끔 덥석, reveal_panic에 빠르게 덥석덥석, 달리기에 헐떡(크게 벌림), 포션은 입에 그대로 붓기. 오비는 Spine에 고정(턱에 끌려 올라가지 않게).
- 꼬리: 3마디 체인 + 끝 후속 동작, reveal_panic에 부풀기(스케일).
- 파이프라인 개선: 같은 재질 클래스를 여러 영역으로(체크무늬 두 톤), 작은 눈은 평활화 제외(`material_keep`), 깊은 입안 베이크용 `cage`·`max_ray`.
- 사용자 지시("승인 해줄게 바로 해주라", 11-13 22:46)에 따라 폰 결과를 보여주고 콘으로 바로 진행.
- 리빌: 꼬리를 요괴 메시에서 잘라냄. **R09에게**: pon_human의 `socket_reveal`을 허리 뒤(Hips, 약 [0, 0.1, 0.3]×키)에.

## 콘 (11-14)
| 날짜 | 항목 | 모델 | 크레딧 | job id |
|---|---|---|---|---|
| 11-14 | 콘 턴어라운드 정면 | gpt_image_2_6 | 2.75 | d3efe78a-2c1a-43e0-94b3-59641fd929d6 |
| 11-14 | 콘 턴어라운드 좌·후·우 | gpt_image_2_6 | 8.25 | 047f3eaa-f80a-4dc7-8dfb-e5401e131a36, 180772a1-6ab3-4658-bb74-81263b7a7618, 93292993-2114-45fd-8647-9eadaa9281c7 |
| 11-14 | 콘 3D | tripo_h3_1_multiview_to_3d (face_limit 400k) | 18 | fe2d1e05-e937-47cc-808b-0f7dbb17ca97 |
| | **R06 누계** | | **58** (예산 110~200 안) | |

| 자산 | 삼각형 | 원본 | 런타임 | validator |
|---|---|---|---|---|
| kon_yokai | 22,000 · 31뼈(+x_neck_01~04, x_ear_L/R, x_tail_L/R_01~03) · 4재질(body·eyes·onibi 발광·cloth) | 2.80 MB | 1.47 MB | PASS(player) |
| kon_reveal(쌍꼬리) | 4,499 | 0.24 MB | 0.13 MB | PASS(prop) |
- 걸음: walk 2.20 / run 4.52 u/s → 서버에서 1.64×/1.07×.
- 목이 먼저: `x_neck_01~04`(Spine1 → … → Neck, `reparent`), 머리 쪽 마디가 먼저 움직이고 아래로 늦게 전파(`neck_wave`). 걷기 S파 + 머리 수평 유지, idle 둘러보기, reveal_panic 목 곧게 뻗기 → 휘두르기 → 움츠림.
- 수정: 목 스케일이 체인에 누적돼 머리가 ~1.9배 → 스케일 대신 S자 펴기 회전. 꼬리 부풀기도 뿌리 뼈만(폰 포함).
- 수정: 꼬리가 바닥까지 내려와 발 중심 계산이 뒤로 밀림 → `feet_band: 0.04`.
- 수정: 남색 유카타가 도깨비불 규칙에 걸림(HSV 확인 결과 h0.7 s0.2 v0.7) → 밝기로 분리. 색 확인 도구 `probe_colors.py` 추가.
- R09에게: kon_human `socket_reveal`은 허리 뒤(Hips, 약 [0, 0.1, 0.12]×키).

## R06 상태
- 폰·콘 요괴 + 리빌 완료, `defs/pon.json`·`defs/kon.json` 작성(인덱스 등록은 R09 인간 폼 뒤). PR 생성.
