# Asset Contract v1 — 모든 방이 지키는 에셋 규격

이 계약이 있으니 각 방은 서로를 기다리지 않고 따로 작업할 수 있다. 캐릭터 방은 이 규격대로 GLB를 내보내고, 런타임(R01)은 이 규격을 읽는다.
검사: `node tools/validate-glb.mjs <file.glb> --profile player|disguise|guest|prop|env`. **PASS가 아니면 PR을 올리지 않는다.**
규격 변경은 본부(HQ) 방만 할 수 있다. 버전을 올리고 모든 방에 알린다.

## 1. 공통
| 항목 | 규칙 |
|---|---|
| 포맷 | glTF 2.0 바이너리 `.glb` |
| 좌표 | Y-up, 정면 +Z, 1 unit = 1 m, 원점은 두 발 사이 바닥(y=0) |
| 크기 | 실제 비율로 제작한다(요괴 1.0~1.6 m, 인간 1.5~1.7 m). 런타임이 화면 높이를 정규화한다 |
| 소스 | `source/v2/<category>/<id>/`에 **일반 git 파일**로 둔다(LFS 아님, 9장 참조): `build.py`(Blender 원본을 다시 만드는 스크립트), 턴어라운드 PNG, 내보내기 원본 GLB, `prompt.txt`, `provenance.json`(사용한 모델·Higgsfield job id·시드·날짜·수정 내역). `.blend`는 커밋하지 않는다. 기존 `art/` 아래 LFS 파일은 그대로 둔다 |
| 런타임 | `public/assets/models/v2/<id>_<form>.glb`. 빌드 단계에서 meshopt 압축과 KTX2(UASTC 또는 ETC1S) 텍스처로 변환한다 |
| 이름 | 소문자 snake case. `<id>_<form>`: `mizu_yokai`, `mizu_human`, `guest_03`, `keeper_takoyaki`, `demon_king` |

## 2. 프로필별 예산
| 프로필 | 대상 | 최대 삼각형 | 재질 | 텍스처 | 뼈 | 원본 GLB 크기 |
|---|---|---|---|---|---|---|
| `player` | 요괴 7종 | 25,000 | ≤4 | ≤2048², ≤4장 | ≤64 | ≤3 MB |
| `disguise` | 인간 변장 7종 | 15,000 | ≤4 | ≤2048², ≤4장 | ≤64 | ≤2 MB |
| `guest` | 손님 9 + 상인 6 | 8,000 (LOD1 ≤3,000) | ≤3 | ≤1024², ≤3장 | ≤64 | ≤1 MB |
| `prop` | 소품(등불·병·의자) | 5,000 | ≤2 | ≤1024² | 0 | ≤0.6 MB |
| `env` | 노점·도리이·신사 등 큰 구조물 | 60,000 | ≤8 | ≤2048² | 0 | ≤6 MB |

한 화면 예산(R14가 감시): 데스크톱 60 fps / 모바일 30 fps, 드로우콜 ≤250(데스크톱) · ≤150(모바일), 화면 삼각형 ≤750k · ≤350k, 첫 로딩 다운로드 ≤25 MB(gzip).
현재 모델은 캐릭터당 50~186k 삼각형, 50~110개 파츠라서 전부 FAIL이다. 기준 결과는 `baseline/validator-v0.txt`에 있다.

## 3. 메시와 텍스처
- 캐릭터는 **하나의 스킨드 메시**(재질별 프리미티브 최대 4개: body / cloth / eyes(유광) / alpha(머리카락 끝·꼬리털 등 필요할 때만)). 지금처럼 파츠 수십 개를 뼈에 붙이는 방식은 쓰지 않는다.
- UV: 겹침 없이 펼치고, 대칭 부위는 미러 UV를 허용한다. 텍셀 밀도는 캐릭터 안에서 일정하게, 얼굴은 1.5배까지 허용한다.
- 텍스처 세트: `baseColor`(sRGB), `ORM`(R=AO, G=roughness, B=metalness, linear), `normal`(선택). 무늬와 그림 같은 디테일은 baseColor에 그린다.
- 2의 거듭제곱 크기. 알파는 baseColor 알파 채널만 쓰고 `alphaMode: MASK`를 우선한다.

## 4. 스켈레톤(휴머노이드 + 보조 뼈)
필수 16개(이 이름 그대로, 접두사 없음):
`Hips, Spine, Neck, Head, LeftArm, LeftForeArm, LeftHand, RightArm, RightForeArm, RightHand, LeftUpLeg, LeftLeg, LeftFoot, RightUpLeg, RightLeg, RightFoot`
선택: `Spine1, Spine2, LeftShoulder, RightShoulder, LeftToeBase, RightToeBase, HeadTop_End`
Meshy·Mixamo 계열 자동 리그 이름(`mixamorig:Hips` 등)은 `tools/` 스크립트로 접두사를 지운다.
보조 뼈는 `x_` 접두사를 붙인다(캐릭터별 예시):
| 캐릭터 | 보조 뼈 |
|---|---|
| mizu | `x_dish`, `x_shell` |
| pon | `x_tail_01..03`, `x_belly_jaw` |
| kon | `x_neck_01..04`(목 체인), `x_tail_L_01..03`, `x_tail_R_01..03`, `x_ear_L`, `x_ear_R` |
| sumi | `x_wing_L_01..02`, `x_wing_R_01..02`, `x_beak` |
| nemu | `x_tail_01..05`, `x_tailface` |
| akari | `x_lantern_01..03` (Hips 위 스택) |
| kasa | `x_umbrella`, `x_tassel_01..06`, `x_tongue` |
| demon_king | `x_horn_L`, `x_horn_R`, `x_robe_01..04`, `x_crystal` |

소켓(빈 노드 또는 뼈. 런타임이 소품과 효과를 붙이는 지점):
| 소켓 | 부모 | 용도 |
|---|---|---|
| `socket_hand_R` | RightHand | 포션 들기, 1인칭 도구 |
| `socket_hip_L` | Hips | 허리 포션 병 |
| `socket_head_top` | Head | 이름표, 홀림·보호 이펙트 |
| `socket_reveal` | 변장마다 다름 | 인간 변장에서 요괴 부위가 튀어나오는 지점(disguise 전용) |

## 5. 애니메이션 클립(이름 고정, 30 fps, 제자리 동작이며 루트 모션 없음)
| 클립 | 루프 | player | disguise | guest | 비고 |
|---|---|---|---|---|---|
| `idle` | ● | ● | ● | ● | 2~4초, 숨쉬기와 둘러보기 |
| `walk` | ● | ● | ● | ● | 서버 속도 기준 보폭. 캐릭터별 걸음 성격 |
| `run` | ● | ● | ● | | 속도 버프용 |
| `jump_start` / `jump_air` / `land` | –/●/– | ● | ● | | |
| `drink_potion` | | ● | ● | | 0.9초 안에 마시는 동작 끝 |
| `charm_cast` / `charm_hold` | –/● | ● | ● | | 시전 0.6초(서버 규칙과 동일) |
| `cover_ward` | | ● | ● | | 동료를 가려주는 결계 |
| `reveal_panic` | | ● | ● | | 정체 노출. 게임의 대표 개그 |
| `hit` / `sealed` | –/● | ● | ● | | 보스전 피격과 봉인 |
| `victory` | ● | ● | ● | | 결과 화면 |
| `charmed_walk` / `wait` / `cheer` / `talk` | ● | | | ● | 손님 전용 |
| `keeper_work` | ● | | | 상인 | 노점별 손동작 |

런타임은 `AnimationMixer`로 클립을 섞는다(크로스페이드 0.15~0.25초). 걷기 재생 속도는 실제 이동 속도에 맞춰 조절한다. 상체 레이어(마시기·홀리기)는 하체 걷기와 겹쳐 재생할 수 있도록, 상체 클립에는 Hips와 다리 키를 넣지 않는다.

## 6. 표정
최소 `face_blink` 모프 타깃, 또는 눈 텍스처 교체(UV 오프셋 아틀라스 `eyes_open / blink / shock / happy`). 둘 중 무엇을 썼는지 `provenance.json`에 적는다.

## 7. 변장(disguise) 연결 규칙
- 인간 변장 GLB에는 요괴 부위를 넣지 않는다. 요괴 부위는 별도 소품 GLB `public/assets/models/v2/<id>_reveal.glb`로 만들고 `socket_reveal`에 붙인다(미즈의 물접시, 폰 꼬리, 콘 귀·꼬리, 스미 날개, 네무 얼굴꼬리, 아카리 등불 손, 카사 우산 갓).
- 변신 장면은 같은 위치·크기에서 요괴 → 연기 → 인간으로 바뀐다. 두 모델의 발 위치와 화면 높이가 같아야 한다.

## 8. 환경 에셋
- 키트 단위로 만든다: `env_stall_<kind>`, `env_lantern_paper`, `env_lantern_stone`, `env_torii`, `env_shrine`, `env_fence`, `env_path_tile_*`, `env_tree_*`, `env_rock_*`.
- 반복되는 소품은 인스턴싱한다. 같은 재질을 쓰는 정적 메시는 텍스처 아틀라스로 묶는다.
- 서버 충돌 박스(`shared/world.mjs`)는 바꾸지 않는다. 비주얼이 충돌 박스보다 크게 튀어나오지 않게 한다. 바꿔야 하면 본부에 요청한다.

## 9. 제작 원본 저장(LFS 대체 규칙)과 라이선스·출처
클라우드 작업 세션에서는 Git LFS 푸시가 막혀 있다. 그래서 v2 제작 원본은 LFS를 쓰지 않는다.
- 위치: `source/v2/<category>/<id>/`(예: `source/v2/characters/mizu/`, `source/v2/environment/stall_takoyaki/`, `source/v2/pipeline/`). `.gitattributes`의 LFS 규칙에 걸리지 않는 경로다.
- 크기: 파일당 **20 MB 이하**(권장 10 MB 이하). 이미지는 **2048 px 이하** PNG 또는 고품질 WebP.
- `.blend`는 커밋하지 않는다. 같은 폴더의 `build.py`(헤드리스 bpy)로 언제든 다시 만들 수 있어야 한다. 더 큰 중간 파일이 필요하면 `build.py`가 다시 만들거나 다시 받는다.
- 생성 결과물(이미지·3D·오디오)은 `provenance.json`에 Higgsfield job id(와 모델·시드)를 남겨 언제든 다시 받을 수 있게 한다.
- 기존 `art/` 아래 LFS 파일은 건드리지 않는다(읽기 전용 참고 자료).
- 런타임 GLB(`public/assets/...`)와 `source/`는 서로 다른 폴더다. 빌드(`npm run build`)는 `public/assets/{models,env}/v2/`만 압축하고 `source/`는 읽지도 고치지도 않는다.

라이선스와 출처:
- 생성 도구(Higgsfield의 Meshy·Tripo·Hunyuan, GPT/Grok 이미지)로 만든 결과물은 해당 서비스의 상업 이용 약관을 R15가 확인한다. 각 에셋의 `provenance.json`에 도구와 job id를 남긴다.
- 외부 무료 에셋(CC0 텍스처·HDRI·효과음 등)은 `CREDITS.md`에 출처와 라이선스를 적는다. CC-BY-NC 같은 비상업 라이선스는 쓰지 않는다.
