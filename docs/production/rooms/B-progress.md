# B방 진행 상황 — 월드 룩(R02 밤 조명 → R04 환경)

- 마지막 갱신: 2026-11-09 (America/Denver)
- 현재 브리프: **R02** · 브랜치 `remaster/r02-night-look`
- 상태: **대표 장면(시작 지점) 사용자 승인 대기**

## R02 끝난 것
- [x] 클론, `npm ci`, check·test(112)·integration(5) 초록, 브랜치 생성
- [x] 조명 계획 문서 `docs/production/LIGHTING.md`(키아트 휘도·색 분석, 조명 값, 프로필, API)
- [x] 룩뎁 도구 `tools/lookdev.py`(서버 세션 없이 실제 축제 장면을 게임 카메라로 촬영: start·street·shrine·wide·fish, `--profile`, `--flash`, `--perf`), 비교 보드 `tools/lookdev_compare.py`
- [x] 달빛·반구광·바운스·역광 재설계, 밤 환경맵(PMREM), 그림자 텍셀 스냅
- [x] 하늘 `render/sky.mjs`: 그라데이션 돔 + 셰이더 별·구름 + 달 원반/헤일로 + 원경 능선 2겹 + 호수 마을 불빛(드로우콜 4)
- [x] 등불 빛 `render/lanterns.mjs`: 등불 앵커 등록 → 빛 웅덩이 라이트맵(256×312) + 플레이어 근처 실제 PointLight(high 6 · balanced 4 · mobile 2 · light 0)
- [x] 월드 라이트 패치 `render/world-light.mjs`: 모든 lit 재질에 빛 웅덩이·계곡 안개·발광 강화, 캐릭터 재질에만 림 라이트, NaN 픽셀 제거
- [x] 후처리 `render/post.mjs`: 블룸(임계 0.8) → Output → 3D LUT 그레이드 + 비네트 + 불꽃 색광 → SMAA, 프로필별 토글
- [x] `pipeline.flash(color, intensity)` 구현, `fx/index.mjs` 불꽃 터짐에 연결(`REMASTER-HOOK r02`)
- [x] 지면 톤(`art-materials.mjs`): 어두운 이끼·흙색 잔디, 따뜻한 회색 돌길 텍스처

## 남은 것(R02)
- [ ] 사용자 승인: 시작 지점 비교(`captures/r02/compare_start.jpg`)
- [ ] 승인 후 노점 거리·신사 비교 보드, mobile/light 수치 표, `capture.py` after, HANDOFF, PR

## 결정 사항
- 기존 `main`의 high/balanced 프로필에서 시작 지점 화면 일부가 검은 사각형으로 뭉개지는 버그를 찾음: 병합된 장식 메시의 퇴화 노멀이 NaN 픽셀 2개를 만들고 블룸이 이를 사각형으로 번지게 함. 월드 라이트 패치에서 비유한 색을 버려 해결(R04에서 원인 메시도 정리 예정)
- 하늘·별·달은 R02가 소유(`render/sky.mjs`). `festival-scenery.mjs`의 옛 하늘 구·별·달은 `REMASTER-HOOK r02`로 제거. 산 메시·호수·마을 집은 R04 소유로 남김
- 등불 빛은 환경 코드가 `registerLantern()`으로 앵커만 등록하고, 실제 PointLight 개수는 파이프라인이 프로필별로 정함. 노점 6개가 각각 만들던 PointLight(강도 16)는 제거(`REMASTER-HOOK r02`)
- 자동 품질 하향을 high → balanced → mobile → light로 한 단계씩(이전: balanced·mobile → light 바로)
- 길 돌의 차가운 색(라벤더 회색)은 R04 소관(`festival.mjs`의 paving 색). R04에서 따뜻한 돌 텍스처로 바꾼다

## 다음 단계
1. 승인 받으면 나머지 2장면 비교 보드 → 품질 게이트 → PR
2. R04: 금붕어 노점 히어로 에셋(bpy)

## 진행 중인 job id
- 없음(R02 Higgsfield 사용 0)
