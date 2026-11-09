# remaster-kit — Human Enough! 리마스터 제작 킷

R01이 이 킷을 저장소에 넣는다:
- `MASTER_PLAN.md · ART_BIBLE.md · ASSET_CONTRACT.md · ROOM_PROTOCOL.md · PASTE_PROMPTS.md · briefs/ · baseline/ · skills-ref/` → `docs/production/`
- `tools/validate-glb.mjs · tools/capture.py` → 저장소 루트의 `tools/`

| 파일 | 내용 |
|---|---|
| MASTER_PLAN.md | 진단, 방 구성과 순서, 품질 기준, 사용자 결정 사항 |
| ART_BIBLE.md | 시각 규칙 v0(R02·R03 결과로 v1 확정) |
| ASSET_CONTRACT.md | GLB 규격: 예산, 뼈 이름, 소켓, 클립 이름 |
| ROOM_PROTOCOL.md | 모든 방의 시작 절차, 소유권, 품질 게이트, 납품 방식 |
| briefs/r00~r15.md | 방별 상세 지시서 |
| PASTE_PROMPTS.md | 새 채팅 7개(A~G)에 붙여넣을 프롬프트 + 브리프별 단독 프롬프트 |
| tools/validate-glb.mjs | 계약 검사기(의존성 없음). `node tools/validate-glb.mjs x.glb --profile player` |
| tools/capture.py | 고정 구도 스크린샷(before/after). Playwright + Chrome 필요 |
| baseline/ | 2026-11-08 현재 화면, 모델 렌더, 검사 결과, 컨셉 대비 비교 시트 |
| skills-ref/ | 참고 스킬 발췌: gamedev-skills(Apache-2.0), Claude Code Game Studios(MIT). 라이선스 파일 포함 |
