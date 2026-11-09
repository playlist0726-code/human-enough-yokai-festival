# 캐릭터 파이프라인 v1 (R03 미즈 파일럿에서 확정)

> 이 문서만 보고 다른 캐릭터 방(R06~R09, R11)이 같은 품질·같은 규격으로 캐릭터를 만들 수 있어야 한다.
> 새 방법을 만들지 말고 이 순서를 따른다. 막히는 부분만 고쳐서 이 문서에 추가한다(맨 아래 "개선 기록").

## 0. 한눈에 보기

```
컨셉(public/assets/<id>-reference.png, cast.png 열)
  → [Higgsfield gpt_image_2_6] A-pose 턴어라운드: 정면 → 좌·후·우(+3/4)        ≈ 14 cr
  → [Higgsfield tripo_h3_1_multiview_to_3d] 4뷰 → 고해상도 GLB                    18 cr
  → [bpy] clean_character.py  정리·데시메이트·UV·베이크(baseColor/normal/ORM)·재질 분류
  → [bpy] rig_contract.py     계약 뼈대 + x_ 보조 뼈 + 웨이트 + 소켓 + 얼굴 모프
  → [bpy] animate_contract.py 14개 클립(motion_lib + 캐릭터 motion.py) + gait.json
  → [bpy] export_contract.py  GLB(JPEG 텍스처) → validator PASS → public/assets/models/v2/
  → [bpy] reveal_prop.py      요괴 메시에서 리빌 소품 잘라내기(prop 프로필)
  → npm run build             Meshopt + KTX2/WebP 압축(런타임 사본)
  → public/characters/defs/<id>.json + index.json 등록 → rig-v2가 재생
```

캐릭터 하나(요괴 + 인간 변장 + 리빌 소품)의 실제 크레딧: **아래 4장 표** 참조(미즈 실측).

## 1. 준비

```bash
python3 -m venv .venv-bpy && .venv-bpy/bin/pip install bpy        # 헤드리스 Blender 5.2
npm ci && npm run check && npm test
```
- 중간 파일은 `build/v2/<id>/`(git 무시)에 생긴다: `clean.blend` → `rigged.blend` → `animated.blend`, 텍스처 PNG, `preview/`, `gait.json`.
- 커밋하는 것: `source/v2/characters/<id>/`의 설정(`character.json`·`human.json`·`reveal.json`), `motion.py`, `build.py`, `turnaround/*.webp`, `export/*.glb`(+ `.validate.txt`), `provenance.json`, `prompt.txt`. 원본 생성 GLB는 크기가 커서(트리포 65 MB) 커밋하지 않고 `raw_url` + job id로 다시 받는다.
- **클라우드 세션 주의:** 샌드박스에서 Higgsfield CDN(`*.cloudfront.net`, `upload.higgsfield.ai`)이 막혀 있으면 결과를 받을 수 없다. 사용자에게 claude.ai **Settings > Capabilities** 허용 도메인 추가를 요청한다(`d8j0ntlcm91z4.cloudfront.net`, `d2ol7oe51mr4n9.cloudfront.net`, `upload.higgsfield.ai`). 레퍼런스 업로드는 GitHub raw URL을 `media_import_url`로 넣으면 막히지 않는다. 평가 렌더는 Higgsfield `sandbox_exec`(헤드리스 Chromium + three.js)에서 할 수 있다(8장).

## 2. 턴어라운드(이미지)

모델: `gpt_image_2_6`, `quality: high`, `resolution: 2k`, `1:1`(장당 2.75 cr). 레퍼런스는 `<id>-reference.png`와 `cast.png`에서 잘라낸 캐릭터 열.

1. **정면 먼저.** 아래 템플릿에서 `<...>`만 채운다. 결과를 눈으로 확인하고(디자인이 바뀌지 않았는가) 다음으로 간다.
2. **좌·후·우(+3/4)는 정면 job id를 첫 번째 레퍼런스로** 넣어 한 번에 배치로 만든다. 같은 크기·같은 발 위치를 요구한다.
3. 4장을 나란히 놓고 키·머리 크기·무늬 위치가 맞는지 확인한다. 어긋난 뷰만 다시 만든다.

정면 프롬프트 템플릿:
```
Production character turnaround reference for a 3D game model. Character: <NAME>, the exact same design
as the reference images (do not redesign): <컨셉 시트를 보고 형태·색·무늬를 구체적으로 나열>.
Proportions: <머리:몸 비율, 손발 크기>.
VIEW: straight FRONT view, orthographic, camera at chest height, full body centered with margin on all sides.
POSE: neutral A-pose for rigging: arms held straight out and down at about 45 degrees away from the body,
hands open and empty, fingers relaxed, legs straight and slightly apart, feet flat, facing the camera,
neutral calm expression.
STYLE: soft matte vinyl toy / clay 3D render, smooth rounded forms, no sharp edges, even soft studio
lighting, no strong shadows, no rim light.
BACKGROUND: flat uniform light gray (#c8c8c8), no floor, no shadow on ground.
EXCLUDE: no potion bottle, nothing held in hands, no floating <물방울·불꽃 등 떠 있는 효과>, no text,
no labels, no extra characters, no props, nothing cropped.
```
측면 템플릿(좌): `Same character, same A-pose, same scale, same framing, same lighting and same flat light gray (#c8c8c8) background as the first reference image (the front view). Change ONLY the camera angle: exact orthographic LEFT SIDE PROFILE view — the character is turned 90 degrees so its face points toward the LEFT edge of the image. Show <측면에서 보여야 할 특징>. Character height and foot position must match the front view exactly. ...` (우: RIGHT, 후: BACK view, camera directly behind)

규칙:
- 떠 있는 효과(물방울, 도깨비불, 불꽃)와 손에 든 소품은 **메시에 넣지 않는다.** 효과는 R10, 포션은 소켓 소품이다. 이것은 디자인 변경이 아니라 분리다(progress에 적는다).
- 인간 변장은 **`human-base` 정면(`source/v2/characters/human-base/turnaround/base_front.webp`, job `d0bc7162-…`)을 첫 레퍼런스로**, 요괴 정면을 두 번째로 넣어 같은 몸 비율을 강제한다(6장).

## 3. 이미지 → 3D: 모델 선택 기준

| 기준 | Tripo H3.1 multiview (18 cr) | Meshy 7 image (38 cr) |
|---|---|---|
| 입력 | 정면·좌·후·우 4장(순서 그대로) | 정면 1장 |
| 뒷모습·옆모습 | 턴어라운드를 따른다 | 추측한다(미즈: 뒤통수에 등껍질 무늬가 번짐) |
| 원본 밀도 | 기본 ~200만 삼각형(65 MB). `face_limit: 400000` 권장 | 6만(리메시) |
| 정면 방향 | glTF **+X** → 설정 `yaw_deg: -90` | +Z → `yaw_deg: 0` |
| 결론 | **기본값.** 리메시·베이크는 우리 파이프라인이 하므로 원본이 무거워도 된다 | 턴어라운드를 못 만드는 경우에만 |

파라미터(Tripo): `texture_quality: detailed`, `geometry_quality: detailed`, `pbr: true`, `face_limit: 400000`.
Meshy의 자동 리깅(`3d_rigging`)은 쓰지 않는다: 계약 뼈 이름·보조 뼈·소켓을 우리가 정확히 통제해야 하고, 다리가 짧은 치비 체형에서 자동 리그가 잘 맞지 않는다. Blender 쪽 웨이트(4장)가 결정적이고 다시 돌릴 수 있다.

## 4. 캐릭터 설정 `source/v2/characters/<id>/character.json`

미즈 파일(`source/v2/characters/mizu/character.json`)을 복사해 고친다. 좌표는 모두 **키에 대한 비율**, 축은 Blender 기준(캐릭터가 −Y를 봄, **+X = 캐릭터의 왼쪽**, +Z 위).

| 키 | 뜻 | 정하는 법 |
|---|---|---|
| `height_m` | 실제 키(m). 요괴 1.0~1.6, 인간 1.5~1.7 | 계약 1장 |
| `yaw_deg` | 생성기 정면 보정 | Tripo −90 |
| `target_tris` | 데시메이트 목표 | player 22000, disguise 13500, guest 7500(여유 10%) |
| `materials` | 면 분류(첫 매칭 우선, 기본 body): `region` 상자 + 색 규칙(`h/s/v_min/max`, 감마 보정된 HSV) | eyes(유광) → cloth(sheen) 순. 프리뷰로 확인 |
| `skeleton` | 왼쪽 관절 16개 + 끝점(`HeadTop`, `LeftHandTip`, `LeftToeTip`) | 정면 턴어라운드에서 픽셀을 재서 `(중심-x)/키`, `(발바닥-y)/키`. `preview.py --bones`로 확인 |
| `extra_bones` | `x_` 보조 뼈. 체인은 `points`(예: 콘의 목 `x_neck_{i:02d}`), `mirror: true`면 오른쪽 자동 | 계약 4장 표 |
| `weight_overrides` | 상자 안 정점을 특정 뼈로 고정(`falloff`로 부드럽게, `strength`, `material`로 제한, `mirror`) | 치비 머리는 Head 100%, 접시·껍질·꼬리 같은 단단한 부위 |
| `sockets` | 소켓 위치와 부모 뼈 | 계약 4장 |
| `morphs` | `face_blink`/`face_shock`을 만들 눈 재질 | eyes 재질이 있으면 자동 |
| `motion_file` | 성격 모듈 | 5장 |

## 5. 스크립트 실행 순서

```bash
# 한 번에(다운로드 포함): 캐릭터 폴더의 build.py
.venv-bpy/bin/python source/v2/characters/mizu/build.py
# 단계별로(고치면서 볼 때)
P=.venv-bpy/bin/python; C=source/v2/characters/<id>/character.json
$P source/v2/pipeline/clean_character.py $C      # → build/v2/<id>/clean.blend (+ textures)
$P source/v2/pipeline/preview.py $C --views 0,90,180            # 재질·베이크 확인
$P source/v2/pipeline/rig_contract.py $C         # → rigged.blend
$P source/v2/pipeline/preview.py $C --stage rigged --bones      # 관절 위치 확인
$P source/v2/pipeline/animate_contract.py $C     # → animated.blend, gait.json
$P source/v2/pipeline/preview.py $C --stage animated --clip walk --view 90 --every 2
$P source/v2/pipeline/export_contract.py $C      # → export/<id>_<form>.glb, validator, 런타임 사본
$P source/v2/pipeline/reveal_prop.py source/v2/characters/<id>/reveal.json
npm run build   # 런타임 사본 압축(Meshopt + KTX2/WebP). 이미 압축된 파일은 건너뜀
```
`build_character.py <설정...> --from rig`처럼 중간부터 다시 돌릴 수 있다.

### 각 단계가 하는 일과 이유
- **clean**: 숨은 노드·`exclude` 제거 → 합치기 → 정면·크기·발 원점 정규화 → 떠 있는 조각 제거(`min_island`) → 용접 후 데시메이트 → Smart UV + 패킹 → 고해상도에서 **baseColor(조명 없는 색), normal, roughness, AO**를 굽는다 → ORM(R=AO 0.35~1, G=roughness를 아트 바이블 범위로 클램프, B=0) → 면 분류로 body/cloth/eyes 재질(모두 같은 텍스처를 공유, 이미지 3장).
  - eyes: roughness 0.12 + clearcoat 1(유광, 하이라이트 점은 텍스처에 이미 있음). cloth: sheen 0.35.
  - `paint.py`(선택): 베이크 후 텍스처를 numpy로 고치는 훅. 무늬·얼굴 보정 패스는 여기서 한다.
- **rig**: 관절에서 뼈를 만들고(롤: 세로 뼈는 Z가 뒤, 가로 뼈는 Z가 위), **복셀 리메시한 대리 메시에 Bone Heat → Data Transfer로 실제 메시에 옮긴다.** 생성 메시는 거의 항상 비다양체라 Bone Heat가 직접은 실패하기 때문이다. 그다음 `weight_overrides`, 4개 영향 제한·정규화. 소켓은 뼈에 붙은 Empty. 얼굴 모프는 eyes 정점으로 만든다(`face_blink` 눈을 납작하게, `face_shock` 크게).
- **animate**: Blender 의존 없는 순수 FK 계산(`P = P(parent)·R(parent)⁻¹·R(bone)·B`). 다리는 **해석적 2본 IK**(무릎은 앞+약간 바깥)라 딛는 발이 미끄러지지 않는다. `x_` 뼈는 머리 위치의 **가속도에 반대로 기우는 후속 동작**(SECONDARY: gain·lag·limit·squash). 상체 클립(drink/charm/cover)에는 Hips·다리 키를 넣지 않는다. 30 fps, 루프 클립은 마지막 프레임 = 첫 프레임. walk/run의 딛는 발 속도를 재서 `gait.json`(런타임 단위)으로 쓴다.
- **export**: JPEG 텍스처(원본 3 MB 예산 안), 스킨, 모프, 액션별 클립. validator를 돌려 FAIL이면 멈춘다.

## 6. 인간 변장과 리빌 소품
- 공용 몸: `source/v2/characters/human-base/` — `base.json`(골격 비율·소켓·`socket_reveal`·머리 고정), `motion.py`(“사람인 척” 걷기: 너무 꼿꼿하고 팔을 너무 고르게 흔든다), `turnaround/base_front.webp`. **R09는 이 파일을 그대로 쓴다.**
- 변장 설정은 `"extends": "source/v2/characters/human-base/base.json"`으로 상속하고 `id`, `raw`, `materials`, 필요하면 `sockets.socket_reveal`만 바꾼다(미즈: `source/v2/characters/mizu/human.json`).
- 변장 턴어라운드 프롬프트 핵심: "Use EXACTLY the body proportions… of the first reference image (the human base body). Dress and color it after the second reference image (<요괴>)… <요괴의 흔적 하나>". 요괴 흔적은 아트 바이블 5장(미즈: 젖은 청록 머리와 떨어지는 물방울).
- 리빌 소품은 **요괴 메시에서 잘라낸다**(`reveal.json`: 영역 + 제외 색 규칙 → 데시메이트 → 1024 재베이크 → `width_m`으로 크기 맞춤 → prop validator). 요괴와 소품이 정확히 같은 모양·색이 된다. 원점은 소품 바닥 중심이고 `socket_reveal`에 붙는다.

## 7. 게임에 넣기
1. `public/characters/defs/<id>.json` — `forms`, `reveal`, `height`, `gait`(= `build/v2/<id>/gait.json`의 `walkSpeed`·`runSpeed`).
2. `public/characters/defs/index.json`의 `characters`에 id 추가.
3. `npm run build`로 런타임 사본 압축, `npm test`.
4. 확인: 선택 화면, 변신 장면, 필드(걷기·달리기·점프·마시기·홀리기·결계·리빌), 1인칭 손. `?rig=legacy`로 기존 모습과 비교.
런타임(rig-v2)이 자동으로 하는 것: 높이 정규화, 크로스페이드, 걸음 속도 동기화, 상체 레이어, 소켓, **눈 깜빡임(2.2~5초), reveal_panic·hit에서 눈 크게, sealed에서 반쯤 감김**.

## 8. 검수(승인 전에 반드시)
- validator PASS(출력을 PR에).
- `preview.py` 3뷰 + 뼈 + 걷기 스트립을 컨셉 시트 옆에 놓고 본다: 실루엣, 색, 무늬, 얼굴.
- 게임 카메라 거리(캐릭터 화면 높이 약 120 px)에서 실루엣이 읽히는가.
- 걷기에서 발이 미끄러지지 않는가(`gait.json` 속도 × 1.0~1.4 배속이 서버 속도 3.6에 맞는가).
- Higgsfield 샌드박스 평가 렌더(CDN이 막혔을 때): `sandbox_exec`에서 `npm i three playwright-core`, `/ms-playwright/chromium-*/chrome-linux64/chrome`을 `--use-angle=swiftshader`로 띄워 GLB 4방향을 찍는다. `PYTHONPATH`에 `/root`가 있어 pip이 실패하므로 `unset PYTHONPATH; export HOME=/home/user`.

## 9. 자주 생기는 결함과 해결
| 증상 | 원인 | 해결 |
|---|---|---|
| 클립이 1.25배 길다 | Blender 기본 24 fps | animate가 30 fps로 고정(수정됨) |
| Bone Heat 실패("failed to find solution") | 비다양체 생성 메시 | 복셀 대리 메시 → Data Transfer(기본 동작). `proxy_voxel`을 키우면 더 안정 |
| 베이크에 검은 얼룩 | 레이가 고해상도 면을 못 찾음 | `cage`(기본 키의 1.2%)를 1.5~2%로 |
| 몸이 유광 검정으로 나옴 | 베이크 실패한 검은 픽셀이 eyes 규칙(v<0.16)에 걸림 | 베이크 먼저 고치고, eyes `region`을 눈 주변으로 좁힌다 |
| 숨은 헬퍼(Icosphere 등)가 딸려 옴 | 원본에 숨김 노드 | 뷰 레이어 밖 노드는 자동 제거, 그 밖은 `exclude` 정규식 |
| 뒷모습이 엉망 | 단일 이미지 생성 | Tripo multiview로 바꾼다 |
| 클립 이름이 `Action` | 액션 이름 | 액션 이름 = 계약 클립 이름(자동) |
| 원본 GLB 3 MB 초과 | PNG 텍스처 | export는 JPEG(q88). 그래도 넘으면 ORM·normal 512 |

## 개선 기록
- (R03) v1 작성.
