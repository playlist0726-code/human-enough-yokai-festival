# Room Protocol — 모든 작업 방이 지키는 진행 규칙

각 채팅방은 아무 기억 없이 시작한다. 이 문서와 자기 브리프(`docs/production/briefs/rNN.md`)만으로 일할 수 있어야 한다.

## 0. 시작(매번)
1. GitHub 저장소 `playlist0726-code/human-enough-yokai-festival`를 **push 권한으로** 연결하고 클론한다.
2. (선택) `git lfs install && git lfs pull` — 기존 `art/`의 LFS 원본(Blender·프리뷰)을 봐야 할 때만 필요하다. **실패해도 작업을 계속한다.** 클라우드 세션에서는 LFS 푸시가 막혀 있으므로 새 제작 원본은 LFS가 아닌 `source/v2/`에 둔다(ASSET_CONTRACT 9장).
3. `npm ci && npm run check && npm test` 결과가 초록인지 확인한다. 실패하면 작업 전에 보고한다.
4. 최신 `main`에서 브랜치 `remaster/rNN-<slug>`를 만든다. **main에 직접 커밋하지 않는다.**
5. 읽기 순서: `docs/production/MASTER_PLAN.md` → `ART_BIBLE.md` → `ASSET_CONTRACT.md` → 자기 브리프 → `HANDOFF.md`의 최근 항목 → (이어하기라면) `docs/production/rooms/<방>-progress.md`.
6. `npm run dev`를 띄우고 `python3 -I tools/capture.py --out docs/production/captures/rNN/before`로 작업 전 화면을 남긴다.

## 1. 소유권(충돌 방지)
- 브리프의 **소유 파일**만 수정한다. 다른 방의 파일을 고쳐야 하면, 같은 브랜치에서 최소한의 연결 지점만 추가하고 `// REMASTER-HOOK rNN: 이유` 주석을 단다. PR 설명의 "다른 방 요청"에도 적는다.
- `shared/*`와 `server.mjs`의 게임 규칙·충돌·밸런스는 바꾸지 않는다(브리프가 허락한 경우만 예외).
- 플레이어에게 보이는 문구는 영어로 쓴다. 테스트 `tests/english.test.mjs`가 검사한다.
- 새 런타임 에셋은 `public/assets/models/v2/`, `public/assets/env/v2/`, `public/assets/fx/`, `public/assets/ui/`, `public/assets/audio/`에 둔다. 제작 원본은 `source/v2/<category>/<id>/`에 일반 git 파일로 둔다(LFS 금지, 파일당 20 MB 이하·권장 10 MB, 이미지 2048 px 이하 PNG/WebP, `.blend` 대신 `build.py`, 생성물은 `provenance.json`에 job id). 기존 `art/` LFS 파일은 건드리지 않는다.

## 2. 품질 게이트(PR 전에 전부 통과)
- [ ] `npm run check && npm test && npm run test:integration` 통과
- [ ] 새 GLB는 모두 `node tools/validate-glb.mjs <glb> --profile <p>`가 PASS. 출력을 PR에 붙인다
- [ ] `tools/capture.py --out docs/production/captures/rNN/after` — before/after를 같은 구도로 비교
- [ ] `?perf=1` 성능 오버레이 수치(FPS, draw calls, triangles, 텍스처 메모리)를 `high`/`mobile` 프로필로 기록. 예산 초과 시 PR에 명시
- [ ] 아트 바이블 체크: 밤 조명 아래에서 실루엣·색·재질이 컨셉과 맞는가? 컨셉 이미지와 나란히 놓고 판단한다
- [ ] 생성 도구를 썼다면 `provenance.json`(도구, 모델, job id, 시드, 사람이 고친 내용)을 남긴다
- [ ] 사용자 승인: 시각 결과물은 먼저 **대표 1개**를 게임 화면 크기로 보여주고 승인받은 뒤 나머지를 만든다

## 3. 생성 도구 사용 규칙
- Higgsfield(연결됨): 이미지 `generate_image`, 3D `generate_3d`(Meshy 7 · Tripo H3.1 multiview · Hunyuan3D v3), 리깅 `3d_rigging`, 애니메이션 라이브러리 `animation_actions`, 오디오 `generate_audio`. **매번 `get_cost:true`로 비용을 먼저 확인**하고, 방 예산(브리프)을 넘기 전에 사용자에게 묻는다.
- sprite-gen: `git clone https://github.com/aldegad/sprite-gen` 후 사용한다. 이미지 생성 단계에는 OpenAI/xAI 키 또는 Codex 로그인이 필요하다. 키가 없으면 Higgsfield로 생성하고, 컷아웃·아틀라스·루프 같은 후처리만 sprite-gen으로 한다.
- Blender: `python3 -m venv .venv-bpy && .venv-bpy/bin/pip install bpy`(헤드리스 Blender 5.2). 모든 Blender 작업은 재실행할 수 있는 스크립트(`source/v2/<category>/<id>/build.py`)로 남긴다.
- 참고 스킬: `docs/production/skills-ref/`(gamedev-skills의 three.js, 에셋 제작, 성능, 게임필 / Game Studios의 art-bible, asset-spec, polish, launch). 해당 작업 전에 관련 SKILL.md를 읽는다.

## 4. 납품
1. PR: 제목 `[RNN] <요약>`, 본문에는 before/after 이미지, 검사 출력, 성능 수치, 남은 문제, 다른 방 요청을 넣는다.
2. `HANDOFF.md` 맨 아래에 항목을 추가한다: 날짜, 방, 바뀐 것, 다른 방이 알아야 할 인터페이스 변경, 다음 할 일.
3. 사용자에게 보내는 마지막 메시지: 무엇을 했는지 3줄, 승인할 것, 본부 방에 붙여넣을 한 줄 보고(`[RNN 완료] PR #.. — ...`).

## 5. 방과 브리프, 이어하기
- 채팅방(A~G)은 브리프 여러 개를 순서대로 수행한다(`MASTER_PLAN.md` 3장). 브리프마다 브랜치와 PR을 따로 만든다.
- 작업 단위가 끝날 때마다 `docs/production/rooms/<방>-progress.md`(예: `C-progress.md`)에 현재 브리프, 상태, 결정 사항, 다음 단계, 진행 중인 job id를 적고 커밋·푸시한다. 이 파일은 방 전용이라 충돌하지 않는다.
- 대화가 길어지면 사용자가 새 채팅에 같은 프롬프트와 "이어하기"를 붙인다. 새 채팅은 progress 파일부터 읽고 이어간다.
