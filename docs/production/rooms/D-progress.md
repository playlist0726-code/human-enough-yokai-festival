# D방 진행 상황 — 캐릭터 2: 스미·네무(R07) → 아카리·카사(R08)

- 현재 브리프: **R07** · 브랜치 `remaster/r07-sumi-nemu`
- 마지막 갱신: 2026-11-13 23:10 (America/Denver)
- 상태: **스미 완성 → 사용자 승인 대기** (네무는 승인 후 시작)

## 시작 점검
- [x] 저장소 클론, `npm ci`, `npm run check`(72 files), `npm test` 137/137 통과
- [x] 게이트 A: C방 progress에 미즈 사용자 승인(11-13 00:33) 기록 확인. PR #8은 아직 열려 있음(미병합)
- [x] 읽음: ROOM_PROTOCOL · MASTER_PLAN · ART_BIBLE · ASSET_CONTRACT · R07/R08 브리프 · HANDOFF · CHARACTER_PIPELINE(PR #8) · C-progress
- [x] Higgsfield 잔액 115.33 cr (11-13 00:47)

## 결정 사항
- **브랜치 기반:** 파이프라인(`source/v2/pipeline/`, `CHARACTER_PIPELINE.md`, rig-v2 모프·formGait)이 PR #8에만 있어서, `main`(R04 병합 후) 위에 `remaster/r03-mizu-pilot`을 병합하고 시작했다(HANDOFF 충돌만 양쪽 유지로 해결). PR #8이 먼저 병합되면 R07 PR의 diff는 D방 파일만 남는다.
- **스미 머리 하나(사용자 결정, 11-13 00:44):** cast.png 정면도 사실 머리 둘(왼쪽 졸린 머리 + 오른쪽 놀란 머리)로 그려져 있음을 사용자에게 알림. 지시대로 머리 하나로 만든다: 몸 중앙에 까마귀 머리 하나(노란 큰 눈, 회갈색 굽은 부리, 깃털 볏). 졸린/놀란 표정은 얼굴 모프(`face_blink`·`face_shock`)로.
- **스미 날개 = 팔:** 팔 뼈(LeftArm/ForeArm/Hand)가 날개를 따라가고, 계약 보조 뼈 `x_wing_{L,R}_01..02`는 날개 뒤쪽 깃털 판(펄럭임 후속 동작)에 둔다.
- **범위:** R07 소유 파일은 요괴 + 리빌 소품뿐. 인간 변장(`sumi_human` 등)은 R09(E방) 소유라 만들지 않는다.
- **결과 다운로드:** 샌드박스에서 CDN 403(프록시) → 사용자 맥 내장 브라우저로 `~/Downloads/hef-r07_*`에 받고 `device_stage_files`로 가져온다(C방과 같은 방식).
- 유카타 무늬: 개별 레퍼런스(sumi-reference.png)는 꽃무늬, cast.png는 구름무늬. 생성 정면은 꽃무늬로 나왔고 레퍼런스와 일치하므로 유지.

## 스미 빌드 (11-13)
| 자산 | 삼각형 | 뼈 | 재질 | 원본 GLB | 런타임(meshopt+WebP) | validator |
|---|---|---|---|---|---|---|
| sumi_yokai | 21,998 | 26(+x_beak, x_wing_L/R_01..02) | body·eyes·cloth | 2.78 MB | 1.40 MB | PASS(player) |
| sumi_reveal (양 날개) | 2,952 | — | 1 | 0.17 MB | 0.08 MB | PASS(prop) |
- 걸음(`gait.json`): walk 2.62 / run 5.64 u/s → 서버 3.6에서 walk 1.38배속(미끄러짐 없음 범위).
- 성격 동작(`motion.py`): 깡충 걸음(두 발이 거의 함께 차고 착지 때 눌림, 날갯짓 1회/깡충, 까마귀 머리 끄덕임), 달리기는 큰 깡충 + 날갯짓, `reveal_panic`은 "이륙 실패"(미친 듯한 날갯짓, 제자리 깡충 3번, 고개 휙휙). idle에 깃털 털기.
- 정리 중 잡은 것: Tripo가 눈 흰자를 연한 크림색으로 구움 → eyes 규칙이 안 걸려 유광·모프가 없었음. 눈은 h 0.1~0.2·v≥0.8, 부리 밑동은 h≈0.07·v≤0.76로 분리해 규칙 수정 + `paint.py`로 눈 흰자만 턴어라운드 노랑(#f2e27a)으로 복원.
- 골격: 발 기준 원점이 뒤꿈치·꼬리 때문에 측정보다 0.11H 뒤에 잡혀 전체를 앞으로 옮김. 손 뼈는 날개 끝이 얇아 Bone Heat가 0 → 날개 끝 상자로 LeftHand/RightHand 고정.
- `defs/sumi.json`은 요괴 폼만. **`index.json`에는 등록하지 않음**: 인간 폼이 없으면 변장 단계에도 요괴가 보이기 때문(rig-v2 269행). R09의 `sumi_human.glb`가 나오면 forms.human + formGait를 추가하고 본부가 index에 등록.
- 검수: `captures/r07/review/`(game_distance, closeup, turn 4방향, concept_compare, walk GIF 2개, studio, portrait).
- 남은 다듬을 거리: 유카타 크림 꽃무늬가 Tripo 텍스처에서 약간 탁한 황갈색으로 구워짐(무늬 자체는 선명). 원하면 paint.py로 크림색 복원.

## 파이프라인 개선(CHARACTER_PIPELINE.md에 추가 예정)
- `reveal_prop.py`: `select.regions`(상자 여러 개) 지원 — 스미 양 날개처럼 떨어진 부위를 한 소품으로.
- `review_capture.py`: 인간 폼이 없는 def면 인간·리빌 샷을 건너뜀.
- `npm run build`가 main의 R04 환경 GLB 9개(압축 안 된 채 커밋됨)도 압축해 버림 → D방은 되돌리고 커밋하지 않음(본부/B방에 알림).
- 내장 브라우저 다운로드: 패널이 숨겨져 있으면 `fetch→blob` 다운로드가 조용히 실패함. **같은 출처 URL을 `<a download>`로 한 번에 하나씩** 클릭하면 됨(4초 간격). Downloads 폴더 연결 필요.

## 크레딧 사용 기록
| 날짜 | 항목 | 모델 | 크레딧 | job id |
|---|---|---|---|---|
| 11-13 | 스미 정면 2k high | gpt_image_2_6 | 2.75 | cddb7482-7676-43af-923a-198b0f13ff39 |
| 11-13 | 스미 좌·후·우·3/4 | gpt_image_2_6 | 11.0 | ae22b082-5951-44df-adcc-942ec5ecc998, b45b29ec-e2f3-48e3-950f-f1179c157b9d, 8fedd7bc-245b-4b6f-b555-d0db43425cb6, 07b0ff2e-4596-4148-afa3-2093305c0218 |
| 11-13 | 스미 3D | tripo_h3_1_multiview_to_3d (face_limit 400k) | 18 | 8c5da796-afd4-452b-b058-b23de64f47f4 |
| | **스미 합계** | | **31.75** | 잔액 88.83 → 70.83 (중간에 다른 방 사용분 있음) |

## 다음 단계
1. ~~스미 4뷰 → 3D → clean/rig/animate/export → review~~ 완료 → **사용자 승인 대기**
2. 네무 → 승인 → R07 PR
3. R08(아카리 → 승인 → 카사). 크레딧: R07 후 잔액 약 50 → R08에 약 64 필요, 충전 요청 예정

## 진행 중인 job id
- (없음)
