# 미즈 / 전체 동작 제작 기준 v01

## 본모습과 위장

- 신체 고정: 외눈 1개, 물 접시 1개, 등껍질 1개, 팔 2개, 발 2개, 꼬리 없음
- 본모습: 외눈과 물 접시, 등껍질을 그대로 둔 소심한 갓파. 능력 사용 시 청록색 물결이 나타난다.
- 위장 제안: 외형을 바꾸지 않는 행동 위장: 눈을 조용히 굴리고 접시의 물을 진정시키며 등껍질을 최대한 돌리지 않는다.

위장은 신체 변신이 아닌 행동 위장 기준이다. 현재 3D 동작 시안은 본모습의 동일 모델을 사용한다.

## 파일과 제작 단계

- 확정 방향의 이미지 생성 시트: `mizu_sheet_v01.png`
- 이미지 생성 기본 아트: `mizu_base_v01.png`
- 별도로 재구성한 3D 동작 시안의 기본 이미지: `mizu_base_3d_v01.png`
- 3D 원본: `mizu_motion_study_v01.blend`

이미지 시트와 기본 아트는 내장 image_gen으로 제작했다. 영상은 절차적으로 재구성한 간단한 3D 기하 모델의 동작 시안이며, 시트의 최종 게임용 모델·스킨 웨이트·의상 시뮬레이션을 자동 변환한 결과가 아니다.

## 공통 출력 기준

카메라 고정, 단독 캐릭터, 줌·전환·자막·다른 인물·배경·포털 없음. 512×512, 24fps. 투명 WebM과 투명 PNG 프레임, 밝은 단색 확인용 MP4. 걷기 시 root의 XY 이동 0. 바닥 그림자는 별도 SVG. 반복은 시작·끝의 동일 위상. 포션 마시기에서도 개인 병은 정확히 하나 유지.

## 대기

- 목적: 평상시 읽기와 플레이어 대기 표시
- 시작: 기본 위장 자세
- 끝: 동일한 기본 위장 자세
- 반복: 예
- 권장 길이: 2.4초
- 연기 포인트: 물을 쏟지 않으려고 몸을 작게 움직인다
- 파일: `mizu_idle_v01.webm` / `mizu_idle_v01_preview.mp4`

### 생성용 프롬프트

Animate 미즈 (mizu) using the approved individual sheet and neutral base image. Explicit Animal Crossing-like rounded matte 3D toy/game look. Action: gentle breathing and personality-specific micro-gestures. Acting direction: 물을 쏟지 않으려고 몸을 작게 움직인다. Anatomy locked: 외눈 1개, 물 접시 1개, 등껍질 1개, 팔 2개, 발 2개, 꼬리 없음. Same outfit colors, wrap, eye/face location, scale and one left-hip potion throughout. Fixed 30-degree downward orthographic game camera, no zoom, pan, cuts, text, other characters, festival scenery or portal. Full body and feet remain visible inside an unchanged square canvas. Root XY is fixed. Duration 2.4s at 24fps. Seamless repeat, same first and last pose and effect phase. Start: 기본 위장 자세. End: 동일한 기본 위장 자세. Prefer genuine alpha; if unsupported use a single flat color that is absent from this character's palette. Keep ground shadow in a separate output. No gore, no realistic fur texture, no extra anatomy.

## 앞 제자리 걷기

- 목적: 전방 이동용 반복 사이클
- 시작: 정면 방향 보행 기준 자세
- 끝: 같은 방향·같은 보행 위상
- 반복: 예
- 권장 길이: 1.2초
- 연기 포인트: 발을 조심스럽게 번갈아 딛고 상체를 세운다
- 파일: `mizu_walk_front_v01.webm` / `mizu_walk_front_v01_preview.mp4`

### 생성용 프롬프트

Animate 미즈 (mizu) using the approved individual sheet and neutral base image. Explicit Animal Crossing-like rounded matte 3D toy/game look. Action: looping forward-facing walk IN PLACE. Acting direction: 발을 조심스럽게 번갈아 딛고 상체를 세운다. Anatomy locked: 외눈 1개, 물 접시 1개, 등껍질 1개, 팔 2개, 발 2개, 꼬리 없음. Same outfit colors, wrap, eye/face location, scale and one left-hip potion throughout. Fixed 30-degree downward orthographic game camera, no zoom, pan, cuts, text, other characters, festival scenery or portal. Full body and feet remain visible inside an unchanged square canvas. Root XY is fixed. Duration 1.2s at 24fps. Seamless repeat, same first and last pose and effect phase. Start: 정면 방향 보행 기준 자세. End: 같은 방향·같은 보행 위상. Prefer genuine alpha; if unsupported use a single flat color that is absent from this character's palette. Keep ground shadow in a separate output. No gore, no realistic fur texture, no extra anatomy.

## 뒤 제자리 걷기

- 목적: 후방 이동용 반복 사이클
- 시작: 후면 방향 보행 기준 자세
- 끝: 같은 방향·같은 보행 위상
- 반복: 예
- 권장 길이: 1.2초
- 연기 포인트: 발을 조심스럽게 번갈아 딛고 상체를 세운다
- 파일: `mizu_walk_back_v01.webm` / `mizu_walk_back_v01_preview.mp4`

### 생성용 프롬프트

Animate 미즈 (mizu) using the approved individual sheet and neutral base image. Explicit Animal Crossing-like rounded matte 3D toy/game look. Action: looping backward-facing walk IN PLACE. Acting direction: 발을 조심스럽게 번갈아 딛고 상체를 세운다. Anatomy locked: 외눈 1개, 물 접시 1개, 등껍질 1개, 팔 2개, 발 2개, 꼬리 없음. Same outfit colors, wrap, eye/face location, scale and one left-hip potion throughout. Fixed 30-degree downward orthographic game camera, no zoom, pan, cuts, text, other characters, festival scenery or portal. Full body and feet remain visible inside an unchanged square canvas. Root XY is fixed. Duration 1.2s at 24fps. Seamless repeat, same first and last pose and effect phase. Start: 후면 방향 보행 기준 자세. End: 같은 방향·같은 보행 위상. Prefer genuine alpha; if unsupported use a single flat color that is absent from this character's palette. Keep ground shadow in a separate output. No gore, no realistic fur texture, no extra anatomy.

## 왼쪽 제자리 걷기

- 목적: 좌측 이동용 반복 사이클
- 시작: 왼쪽 방향 보행 기준 자세
- 끝: 같은 방향·같은 보행 위상
- 반복: 예
- 권장 길이: 1.2초
- 연기 포인트: 발을 조심스럽게 번갈아 딛고 상체를 세운다
- 파일: `mizu_walk_left_v01.webm` / `mizu_walk_left_v01_preview.mp4`

### 생성용 프롬프트

Animate 미즈 (mizu) using the approved individual sheet and neutral base image. Explicit Animal Crossing-like rounded matte 3D toy/game look. Action: looping left-facing walk IN PLACE. Acting direction: 발을 조심스럽게 번갈아 딛고 상체를 세운다. Anatomy locked: 외눈 1개, 물 접시 1개, 등껍질 1개, 팔 2개, 발 2개, 꼬리 없음. Same outfit colors, wrap, eye/face location, scale and one left-hip potion throughout. Fixed 30-degree downward orthographic game camera, no zoom, pan, cuts, text, other characters, festival scenery or portal. Full body and feet remain visible inside an unchanged square canvas. Root XY is fixed. Duration 1.2s at 24fps. Seamless repeat, same first and last pose and effect phase. Start: 왼쪽 방향 보행 기준 자세. End: 같은 방향·같은 보행 위상. Prefer genuine alpha; if unsupported use a single flat color that is absent from this character's palette. Keep ground shadow in a separate output. No gore, no realistic fur texture, no extra anatomy.

## 오른쪽 제자리 걷기

- 목적: 우측 이동용 반복 사이클
- 시작: 오른쪽 방향 보행 기준 자세
- 끝: 같은 방향·같은 보행 위상
- 반복: 예
- 권장 길이: 1.2초
- 연기 포인트: 발을 조심스럽게 번갈아 딛고 상체를 세운다
- 파일: `mizu_walk_right_v01.webm` / `mizu_walk_right_v01_preview.mp4`

### 생성용 프롬프트

Animate 미즈 (mizu) using the approved individual sheet and neutral base image. Explicit Animal Crossing-like rounded matte 3D toy/game look. Action: looping right-facing walk IN PLACE. Acting direction: 발을 조심스럽게 번갈아 딛고 상체를 세운다. Anatomy locked: 외눈 1개, 물 접시 1개, 등껍질 1개, 팔 2개, 발 2개, 꼬리 없음. Same outfit colors, wrap, eye/face location, scale and one left-hip potion throughout. Fixed 30-degree downward orthographic game camera, no zoom, pan, cuts, text, other characters, festival scenery or portal. Full body and feet remain visible inside an unchanged square canvas. Root XY is fixed. Duration 1.2s at 24fps. Seamless repeat, same first and last pose and effect phase. Start: 오른쪽 방향 보행 기준 자세. End: 같은 방향·같은 보행 위상. Prefer genuine alpha; if unsupported use a single flat color that is absent from this character's palette. Keep ground shadow in a separate output. No gore, no realistic fur texture, no extra anatomy.

## 포션 마시기

- 목적: 능력 게이지를 충전하는 행동
- 시작: 병이 왼쪽 허리에 있는 기본 자세
- 끝: 병을 같은 허리에 돌려놓은 기본 자세
- 반복: 아니오
- 권장 길이: 2.4초
- 연기 포인트: 포션을 입으로 조심스럽게 기울이고 병을 다시 왼쪽 허리에 둔다
- 파일: `mizu_drink_v01.webm` / `mizu_drink_v01_preview.mp4`

### 생성용 프롬프트

Animate 미즈 (mizu) using the approved individual sheet and neutral base image. Explicit Animal Crossing-like rounded matte 3D toy/game look. Action: take exactly one personal potion from left hip, drink with anatomically correct mouth location, return bottle to identical hip and rest pose. Acting direction: 포션을 입으로 조심스럽게 기울이고 병을 다시 왼쪽 허리에 둔다. Anatomy locked: 외눈 1개, 물 접시 1개, 등껍질 1개, 팔 2개, 발 2개, 꼬리 없음. Same outfit colors, wrap, eye/face location, scale and one left-hip potion throughout. Fixed 30-degree downward orthographic game camera, no zoom, pan, cuts, text, other characters, festival scenery or portal. Full body and feet remain visible inside an unchanged square canvas. Root XY is fixed. Duration 2.4s at 24fps. One shot with controlled start and end pose. Start: 병이 왼쪽 허리에 있는 기본 자세. End: 병을 같은 허리에 돌려놓은 기본 자세. Prefer genuine alpha; if unsupported use a single flat color that is absent from this character's palette. Keep ground shadow in a separate output. No gore, no realistic fur texture, no extra anatomy.

## 홀리기 시작

- 목적: 능력 발동을 읽을 수 있는 짧은 예비 동작
- 시작: 기본 자세, 효과 꺼짐
- 끝: 홀림 유지의 시작 자세, 효과 켜짐
- 반복: 아니오
- 권장 길이: 1.2초
- 연기 포인트: 망설임 뒤 두 손을 내밀며 물결을 발동한다
- 파일: `mizu_charm_start_v01.webm` / `mizu_charm_start_v01_preview.mp4`

### 생성용 프롬프트

Animate 미즈 (mizu) using the approved individual sheet and neutral base image. Explicit Animal Crossing-like rounded matte 3D toy/game look. Action: brief anticipation, then start yokai charm power and end at charm-loop entry pose. Acting direction: 망설임 뒤 두 손을 내밀며 물결을 발동한다. Anatomy locked: 외눈 1개, 물 접시 1개, 등껍질 1개, 팔 2개, 발 2개, 꼬리 없음. Same outfit colors, wrap, eye/face location, scale and one left-hip potion throughout. Fixed 30-degree downward orthographic game camera, no zoom, pan, cuts, text, other characters, festival scenery or portal. Full body and feet remain visible inside an unchanged square canvas. Root XY is fixed. Duration 1.2s at 24fps. One shot with controlled start and end pose. Start: 기본 자세, 효과 꺼짐. End: 홀림 유지의 시작 자세, 효과 켜짐. Prefer genuine alpha; if unsupported use a single flat color that is absent from this character's palette. Keep ground shadow in a separate output. No gore, no realistic fur texture, no extra anatomy.

## 홀림 유지

- 목적: 인간을 제단까지 유혹하는 능력 유지
- 시작: 홀림 손짓 기준 자세
- 끝: 동일한 손짓·효과 위상
- 반복: 예
- 권장 길이: 2.0초
- 연기 포인트: 작게 손짓하며 물결의 일정한 리듬을 지킨다
- 파일: `mizu_charm_loop_v01.webm` / `mizu_charm_loop_v01_preview.mp4`

### 생성용 프롬프트

Animate 미즈 (mizu) using the approved individual sheet and neutral base image. Explicit Animal Crossing-like rounded matte 3D toy/game look. Action: repeat a subtle beckoning charm gesture with character-specific rounded magical motes. Acting direction: 작게 손짓하며 물결의 일정한 리듬을 지킨다. Anatomy locked: 외눈 1개, 물 접시 1개, 등껍질 1개, 팔 2개, 발 2개, 꼬리 없음. Same outfit colors, wrap, eye/face location, scale and one left-hip potion throughout. Fixed 30-degree downward orthographic game camera, no zoom, pan, cuts, text, other characters, festival scenery or portal. Full body and feet remain visible inside an unchanged square canvas. Root XY is fixed. Duration 2.0s at 24fps. Seamless repeat, same first and last pose and effect phase. Start: 홀림 손짓 기준 자세. End: 동일한 손짓·효과 위상. Prefer genuine alpha; if unsupported use a single flat color that is absent from this character's palette. Keep ground shadow in a separate output. No gore, no realistic fur texture, no extra anatomy.

## 동료 가려주기

- 목적: 동료가 있을 위치의 시선을 가리는 협동 연기
- 시작: 기본 자세
- 끝: 몸과 소품을 회수한 기본 자세
- 반복: 아니오
- 권장 길이: 2.0초
- 연기 포인트: 몸을 돌려 등껍질로 동료가 있을 자리를 가린다
- 파일: `mizu_cover_v01.webm` / `mizu_cover_v01_preview.mp4`

### 생성용 프롬프트

Animate 미즈 (mizu) using the approved individual sheet and neutral base image. Explicit Animal Crossing-like rounded matte 3D toy/game look. Action: use the defining body part to obscure an empty adjacent ally position, then return to rest; no second character. Acting direction: 몸을 돌려 등껍질로 동료가 있을 자리를 가린다. Anatomy locked: 외눈 1개, 물 접시 1개, 등껍질 1개, 팔 2개, 발 2개, 꼬리 없음. Same outfit colors, wrap, eye/face location, scale and one left-hip potion throughout. Fixed 30-degree downward orthographic game camera, no zoom, pan, cuts, text, other characters, festival scenery or portal. Full body and feet remain visible inside an unchanged square canvas. Root XY is fixed. Duration 2.0s at 24fps. One shot with controlled start and end pose. Start: 기본 자세. End: 몸과 소품을 회수한 기본 자세. Prefer genuine alpha; if unsupported use a single flat color that is absent from this character's palette. Keep ground shadow in a separate output. No gore, no realistic fur texture, no extra anatomy.

## 정체 노출

- 목적: 특이 신체 구조의 통제 실패를 표시
- 시작: 기본 자세
- 끝: 특징을 진정시킨 기본 자세
- 반복: 아니오
- 권장 길이: 1.6초
- 연기 포인트: 접시와 물이 흔들리며 소심한 균형을 잃는다
- 파일: `mizu_reveal_v01.webm` / `mizu_reveal_v01_preview.mp4`

### 생성용 프롬프트

Animate 미즈 (mizu) using the approved individual sheet and neutral base image. Explicit Animal Crossing-like rounded matte 3D toy/game look. Action: defining odd anatomy briefly becomes uncontrolled, then recovers without adding body parts. Acting direction: 접시와 물이 흔들리며 소심한 균형을 잃는다. Anatomy locked: 외눈 1개, 물 접시 1개, 등껍질 1개, 팔 2개, 발 2개, 꼬리 없음. Same outfit colors, wrap, eye/face location, scale and one left-hip potion throughout. Fixed 30-degree downward orthographic game camera, no zoom, pan, cuts, text, other characters, festival scenery or portal. Full body and feet remain visible inside an unchanged square canvas. Root XY is fixed. Duration 1.6s at 24fps. One shot with controlled start and end pose. Start: 기본 자세. End: 특징을 진정시킨 기본 자세. Prefer genuine alpha; if unsupported use a single flat color that is absent from this character's palette. Keep ground shadow in a separate output. No gore, no realistic fur texture, no extra anatomy.

## 당황

- 목적: 들킬 위험에 대한 짧은 반응
- 시작: 기본 자세
- 끝: 진정한 기본 자세
- 반복: 아니오
- 권장 길이: 1.0초
- 연기 포인트: 외눈이 커지고 양손으로 접시를 지키려 한다
- 파일: `mizu_panic_v01.webm` / `mizu_panic_v01_preview.mp4`

### 생성용 프롬프트

Animate 미즈 (mizu) using the approved individual sheet and neutral base image. Explicit Animal Crossing-like rounded matte 3D toy/game look. Action: short startled reaction, then settle into identical rest pose. Acting direction: 외눈이 커지고 양손으로 접시를 지키려 한다. Anatomy locked: 외눈 1개, 물 접시 1개, 등껍질 1개, 팔 2개, 발 2개, 꼬리 없음. Same outfit colors, wrap, eye/face location, scale and one left-hip potion throughout. Fixed 30-degree downward orthographic game camera, no zoom, pan, cuts, text, other characters, festival scenery or portal. Full body and feet remain visible inside an unchanged square canvas. Root XY is fixed. Duration 1.0s at 24fps. One shot with controlled start and end pose. Start: 기본 자세. End: 진정한 기본 자세. Prefer genuine alpha; if unsupported use a single flat color that is absent from this character's palette. Keep ground shadow in a separate output. No gore, no realistic fur texture, no extra anatomy.

## 등장

- 목적: 인간 세계 도착의 개별 착지 연기
- 시작: 발 기준점 위에서 착지 준비
- 끝: 발 기준점에 선 기본 자세
- 반복: 아니오
- 권장 길이: 1.8초
- 연기 포인트: 포털 효과 없이 조심스럽게 착지하고 균형을 잡는다
- 파일: `mizu_arrive_v01.webm` / `mizu_arrive_v01_preview.mp4`

### 생성용 프롬프트

Animate 미즈 (mizu) using the approved individual sheet and neutral base image. Explicit Animal Crossing-like rounded matte 3D toy/game look. Action: short vertical arrival landing and settle; NO portal or environment. Acting direction: 포털 효과 없이 조심스럽게 착지하고 균형을 잡는다. Anatomy locked: 외눈 1개, 물 접시 1개, 등껍질 1개, 팔 2개, 발 2개, 꼬리 없음. Same outfit colors, wrap, eye/face location, scale and one left-hip potion throughout. Fixed 30-degree downward orthographic game camera, no zoom, pan, cuts, text, other characters, festival scenery or portal. Full body and feet remain visible inside an unchanged square canvas. Root XY is fixed. Duration 1.8s at 24fps. One shot with controlled start and end pose. Start: 발 기준점 위에서 착지 준비. End: 발 기준점에 선 기본 자세. Prefer genuine alpha; if unsupported use a single flat color that is absent from this character's palette. Keep ground shadow in a separate output. No gore, no realistic fur texture, no extra anatomy.

## 성공

- 목적: 문이 열린 후 짧은 팀 성공 표현
- 시작: 기본 자세
- 끝: 축하를 마친 기본 자세
- 반복: 아니오
- 권장 길이: 1.8초
- 연기 포인트: 물 접시를 지키면서 양손을 짧게 든다
- 파일: `mizu_success_v01.webm` / `mizu_success_v01_preview.mp4`

### 생성용 프롬프트

Animate 미즈 (mizu) using the approved individual sheet and neutral base image. Explicit Animal Crossing-like rounded matte 3D toy/game look. Action: short personality-specific celebration, then rest. Acting direction: 물 접시를 지키면서 양손을 짧게 든다. Anatomy locked: 외눈 1개, 물 접시 1개, 등껍질 1개, 팔 2개, 발 2개, 꼬리 없음. Same outfit colors, wrap, eye/face location, scale and one left-hip potion throughout. Fixed 30-degree downward orthographic game camera, no zoom, pan, cuts, text, other characters, festival scenery or portal. Full body and feet remain visible inside an unchanged square canvas. Root XY is fixed. Duration 1.8s at 24fps. One shot with controlled start and end pose. Start: 기본 자세. End: 축하를 마친 기본 자세. Prefer genuine alpha; if unsupported use a single flat color that is absent from this character's palette. Keep ground shadow in a separate output. No gore, no realistic fur texture, no extra anatomy.
