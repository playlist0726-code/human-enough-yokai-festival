# C방 진행 상황 — 캐릭터 1: 미즈 파일럿(R03) → 폰·콘(R06)

- 현재 브리프: **R03** · 브랜치 `remaster/r03-mizu-pilot`
- 마지막 갱신: 2026-11-08 23:40 (America/Denver)
- 상태: 진행 중 — 3D 비교 끝(Tripo 채택), Blender 파이프라인 작성 중. **CDN 허용 대기**

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
- Higgsfield 결과 GLB/PNG를 작업 공간으로 받을 수 없음(CDN 차단). 허용 도메인 추가 전까지는 생성·평가는 Higgsfield 쪽에서, Blender 스크립트 작성은 로컬에서 진행.

## 다음 단계
1. (CDN 허용 후) Tripo 원본을 `build/`로 받아 clean → rig → animate → export
2. 파이프라인은 그동안 기존 `mizu_yokai.glb`(185k 삼각형, 109파츠)를 대역으로 시험

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
| | **R03 누계** | | **69.75** | |
