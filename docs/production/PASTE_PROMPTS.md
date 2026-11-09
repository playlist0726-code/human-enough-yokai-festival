# 채팅방 붙여넣기 프롬프트 (7개 방)

새 채팅을 열고 해당 블록을 그대로 붙여넣는다. 방 하나가 브리프 여러 개를 순서대로 수행한다. 대화가 길어지면 새 채팅에 같은 프롬프트를 붙이고 끝에 `이어하기 — docs/production/rooms/<방>-progress.md부터 읽어`를 덧붙인다(방 개수는 늘지 않는다).

| 방 | 이름 | 수행 브리프 | 시작 | 크레딧(추정) |
|---|---|---|---|---|
| A | 기반 공사 | R01 | 지금 바로(혼자 먼저) | 0 |
| B | 월드 룩: 밤 조명 + 환경 | R02 → R04 | A의 PR 병합 후 | 50~140 |
| C | 캐릭터 1: 미즈 파일럿 → 폰·콘 | R03 → R06 | A 병합 후 + 크레딧 충전. R06은 미즈 승인(게이트 A) 후 | 240~360 |
| D | 캐릭터 2: 스미·네무·아카리·카사 | R07 → R08 | 게이트 A 후 | 320~480 |
| E | 인간 캐스트 + 데몬킹 | R09 → R11 | 게이트 A 후 | 400~820 |
| F | UI · VFX · 사운드 | R05 → R10 → R13 | A 병합 후(VFX는 B의 조명 방향이 나온 뒤) | 70~190 |
| G | 마감: 미니게임 · 성능 · 출시 | R12 → R14 → R15 | 캐릭터 대부분 병합 후 | 40~120 |

## A방 · 기반 공사
시작: 지금 바로(혼자 먼저) · 크레딧: 0

```
[첨부: remaster-kit.zip]
너는 "Human Enough!" 리마스터의 A방(기반 공사) 담당이야.
1) GitHub 저장소 playlist0726-code/human-enough-yokai-festival를 push 권한으로 연결하고 클론해.
2) 첨부한 remaster-kit.zip을 풀고 ROOM_PROTOCOL.md와 briefs/r01.md를 읽은 다음 그대로 수행해.
   킷을 저장소의 docs/production/ 과 tools/ 로 커밋하는 것부터 시작해.
3) 끝나면 PR 링크와 본부에 붙여넣을 한 줄 보고를 줘.
```

## B방 · 월드 룩: 밤 조명 + 환경
시작: A의 PR 병합 후 · 크레딧: 50~140

```
너는 "Human Enough!" 리마스터의 B방(월드 룩: 밤 조명 + 환경) 담당이야.
GitHub 저장소 playlist0726-code/human-enough-yokai-festival를 push 권한으로 연결해서 클론하고, docs/production/ROOM_PROTOCOL.md를 먼저 읽어.
그다음 브리프를 이 순서로 하나씩 수행해: docs/production/briefs/r02.md → docs/production/briefs/r04.md
브리프마다 브랜치와 PR을 따로 만들고, 각 브리프의 대표 결과물은 먼저 보여주고 내 승인을 받아.
진행 상황은 docs/production/rooms/B-progress.md에 계속 기록해.
브리프 하나가 끝날 때마다 PR 링크와 본부에 붙여넣을 한 줄 보고를 줘.
```

## C방 · 캐릭터 1: 미즈 파일럿 → 폰·콘
시작: A 병합 후 + 크레딧 충전. R06은 미즈 승인(게이트 A) 후 · 크레딧: 240~360

```
너는 "Human Enough!" 리마스터의 C방(캐릭터 1: 미즈 파일럿 → 폰·콘) 담당이야.
GitHub 저장소 playlist0726-code/human-enough-yokai-festival를 push 권한으로 연결해서 클론하고, docs/production/ROOM_PROTOCOL.md를 먼저 읽어.
그다음 브리프를 이 순서로 하나씩 수행해: docs/production/briefs/r03.md → docs/production/briefs/r06.md
브리프마다 브랜치와 PR을 따로 만들고, 각 브리프의 대표 결과물은 먼저 보여주고 내 승인을 받아.
진행 상황은 docs/production/rooms/C-progress.md에 계속 기록해.
브리프 하나가 끝날 때마다 PR 링크와 본부에 붙여넣을 한 줄 보고를 줘.
```

## D방 · 캐릭터 2: 스미·네무·아카리·카사
시작: 게이트 A 후 · 크레딧: 320~480

```
너는 "Human Enough!" 리마스터의 D방(캐릭터 2: 스미·네무·아카리·카사) 담당이야.
GitHub 저장소 playlist0726-code/human-enough-yokai-festival를 push 권한으로 연결해서 클론하고, docs/production/ROOM_PROTOCOL.md를 먼저 읽어.
그다음 브리프를 이 순서로 하나씩 수행해: docs/production/briefs/r07.md → docs/production/briefs/r08.md
브리프마다 브랜치와 PR을 따로 만들고, 각 브리프의 대표 결과물은 먼저 보여주고 내 승인을 받아.
진행 상황은 docs/production/rooms/D-progress.md에 계속 기록해.
브리프 하나가 끝날 때마다 PR 링크와 본부에 붙여넣을 한 줄 보고를 줘.
```

## E방 · 인간 캐스트 + 데몬킹
시작: 게이트 A 후 · 크레딧: 400~820

```
너는 "Human Enough!" 리마스터의 E방(인간 캐스트 + 데몬킹) 담당이야.
GitHub 저장소 playlist0726-code/human-enough-yokai-festival를 push 권한으로 연결해서 클론하고, docs/production/ROOM_PROTOCOL.md를 먼저 읽어.
그다음 브리프를 이 순서로 하나씩 수행해: docs/production/briefs/r09.md → docs/production/briefs/r11.md
브리프마다 브랜치와 PR을 따로 만들고, 각 브리프의 대표 결과물은 먼저 보여주고 내 승인을 받아.
진행 상황은 docs/production/rooms/E-progress.md에 계속 기록해.
브리프 하나가 끝날 때마다 PR 링크와 본부에 붙여넣을 한 줄 보고를 줘.
```

## F방 · UI · VFX · 사운드
시작: A 병합 후(VFX는 B의 조명 방향이 나온 뒤) · 크레딧: 70~190

```
너는 "Human Enough!" 리마스터의 F방(UI · VFX · 사운드) 담당이야.
GitHub 저장소 playlist0726-code/human-enough-yokai-festival를 push 권한으로 연결해서 클론하고, docs/production/ROOM_PROTOCOL.md를 먼저 읽어.
그다음 브리프를 이 순서로 하나씩 수행해: docs/production/briefs/r05.md → docs/production/briefs/r10.md → docs/production/briefs/r13.md
브리프마다 브랜치와 PR을 따로 만들고, 각 브리프의 대표 결과물은 먼저 보여주고 내 승인을 받아.
진행 상황은 docs/production/rooms/F-progress.md에 계속 기록해.
브리프 하나가 끝날 때마다 PR 링크와 본부에 붙여넣을 한 줄 보고를 줘.
```

## G방 · 마감: 미니게임 · 성능 · 출시
시작: 캐릭터 대부분 병합 후 · 크레딧: 40~120

```
너는 "Human Enough!" 리마스터의 G방(마감: 미니게임 · 성능 · 출시) 담당이야.
GitHub 저장소 playlist0726-code/human-enough-yokai-festival를 push 권한으로 연결해서 클론하고, docs/production/ROOM_PROTOCOL.md를 먼저 읽어.
그다음 브리프를 이 순서로 하나씩 수행해: docs/production/briefs/r12.md → docs/production/briefs/r14.md → docs/production/briefs/r15.md
브리프마다 브랜치와 PR을 따로 만들고, 각 브리프의 대표 결과물은 먼저 보여주고 내 승인을 받아.
진행 상황은 docs/production/rooms/G-progress.md에 계속 기록해.
브리프 하나가 끝날 때마다 PR 링크와 본부에 붙여넣을 한 줄 보고를 줘.
```

## 본부(예비) · 계획 채팅이 길어졌을 때만

```
너는 "Human Enough!" 리마스터의 본부(R00: PD 겸 아트 디렉터)야.
GitHub 저장소 playlist0726-code/human-enough-yokai-festival를 push 권한으로 연결해서 클론하고,
docs/production/ROOM_PROTOCOL.md, MASTER_PLAN.md, briefs/r00.md를 읽어.
그다음 HANDOFF.md와 열린 PR 목록을 보고 지금 상태를 요약한 뒤, 다음에 열 방과 병합할 PR을 알려줘.
앞으로 각 방의 "[RNN 완료]" 보고를 내가 여기에 붙여넣을 거야.
```

---

# 참고: 브리프별 단독 프롬프트(방을 더 쪼개고 싶을 때)

## R00 · 본부 · PD / 아트 디렉터
시작 조건: 계획 채팅이 길어졌을 때 · 동시 진행: 항상 열어 둠

```
너는 "Human Enough!" 리마스터의 본부(R00: PD 겸 아트 디렉터)야.
GitHub 저장소 playlist0726-code/human-enough-yokai-festival를 push 권한으로 연결해서 클론하고,
docs/production/ROOM_PROTOCOL.md, MASTER_PLAN.md, briefs/r00.md를 읽어.
그다음 HANDOFF.md와 열린 PR 목록을 보고 지금 상태를 요약한 뒤, 다음에 열 방과 병합할 PR을 알려줘.
앞으로 각 방의 "[RNN 완료]" 보고를 내가 여기에 붙여넣을 거야.
```

## R01 · 기반 공사 · 리팩터링과 런타임 v2
시작 조건: — (가장 먼저, 혼자) · 동시 진행: 단독

```
[첨부: remaster-kit.zip]
너는 "Human Enough!" 리마스터의 R01(기반 공사) 담당이야.
1) GitHub 저장소 playlist0726-code/human-enough-yokai-festival를 push 권한으로 연결하고 클론해.
2) 첨부한 remaster-kit.zip을 풀고, 그 안의 ROOM_PROTOCOL.md와 briefs/r01.md를 읽고 그대로 수행해.
   (킷은 저장소의 docs/production/ 과 tools/ 로 커밋하는 것부터 시작한다.)
3) 끝나면 PR 링크와 본부에 붙여넣을 한 줄 보고를 줘.
```

## R02 · 룩뎁 · 밤 조명, 대기, 컬러 그레이드
시작 조건: R01 병합 · 동시 진행: R03 · R04 · R05와 동시

```
너는 "Human Enough!" 리마스터의 R02(룩뎁 · 밤 조명, 대기, 컬러 그레이드) 담당이야.
GitHub 저장소 playlist0726-code/human-enough-yokai-festival를 push 권한으로 연결해서 클론하고,
docs/production/ROOM_PROTOCOL.md를 먼저 읽은 다음 docs/production/briefs/r02.md를 그대로 수행해.
대표 결과물 1개는 게임 화면 크기로 먼저 보여주고 내 승인을 받아. 끝나면 PR 링크와 본부에 붙여넣을 한 줄 보고를 줘.
```

## R03 · 캐릭터 파일럿 · 미즈(요괴 + 인간 변장) 완성
시작 조건: R01 병합 + 크레딧 충전 · 동시 진행: R02 · R04 · R05와 동시

```
너는 "Human Enough!" 리마스터의 R03(캐릭터 파일럿 · 미즈(요괴 + 인간 변장) 완성) 담당이야.
GitHub 저장소 playlist0726-code/human-enough-yokai-festival를 push 권한으로 연결해서 클론하고,
docs/production/ROOM_PROTOCOL.md를 먼저 읽은 다음 docs/production/briefs/r03.md를 그대로 수행해.
대표 결과물 1개는 게임 화면 크기로 먼저 보여주고 내 승인을 받아. 끝나면 PR 링크와 본부에 붙여넣을 한 줄 보고를 줘.
```

## R04 · 환경 아트 · 축제 키트(노점·등불·도리이·신사·길)
시작 조건: R01 병합(조명은 R02와 맞춰 감) · 동시 진행: R02 · R03 · R05와 동시

```
너는 "Human Enough!" 리마스터의 R04(환경 아트 · 축제 키트(노점·등불·도리이·신사·길)) 담당이야.
GitHub 저장소 playlist0726-code/human-enough-yokai-festival를 push 권한으로 연결해서 클론하고,
docs/production/ROOM_PROTOCOL.md를 먼저 읽은 다음 docs/production/briefs/r04.md를 그대로 수행해.
대표 결과물 1개는 게임 화면 크기로 먼저 보여주고 내 승인을 받아. 끝나면 PR 링크와 본부에 붙여넣을 한 줄 보고를 줘.
```

## R05 · UI · HUD · 2D 아트(로고, 아이콘, 메뉴, 로딩)
시작 조건: R01 병합 · 동시 진행: R02 · R03 · R04와 동시

```
너는 "Human Enough!" 리마스터의 R05(UI · HUD · 2D 아트(로고, 아이콘, 메뉴, 로딩)) 담당이야.
GitHub 저장소 playlist0726-code/human-enough-yokai-festival를 push 권한으로 연결해서 클론하고,
docs/production/ROOM_PROTOCOL.md를 먼저 읽은 다음 docs/production/briefs/r05.md를 그대로 수행해.
대표 결과물 1개는 게임 화면 크기로 먼저 보여주고 내 승인을 받아. 끝나면 PR 링크와 본부에 붙여넣을 한 줄 보고를 줘.
```

## R06 · 캐릭터 · Pon + Kon
시작 조건: 게이트 A(R03 미즈 승인) · 동시 진행: R06~R09 동시 (최대 4방)

```
너는 "Human Enough!" 리마스터의 R06(캐릭터 · Pon + Kon) 담당이야.
GitHub 저장소 playlist0726-code/human-enough-yokai-festival를 push 권한으로 연결해서 클론하고,
docs/production/ROOM_PROTOCOL.md를 먼저 읽은 다음 docs/production/briefs/r06.md를 그대로 수행해.
대표 결과물 1개는 게임 화면 크기로 먼저 보여주고 내 승인을 받아. 끝나면 PR 링크와 본부에 붙여넣을 한 줄 보고를 줘.
```

## R07 · 캐릭터 · Sumi + Nemu
시작 조건: 게이트 A(R03 미즈 승인) · 동시 진행: R06~R09 동시 (최대 4방)

```
너는 "Human Enough!" 리마스터의 R07(캐릭터 · Sumi + Nemu) 담당이야.
GitHub 저장소 playlist0726-code/human-enough-yokai-festival를 push 권한으로 연결해서 클론하고,
docs/production/ROOM_PROTOCOL.md를 먼저 읽은 다음 docs/production/briefs/r07.md를 그대로 수행해.
대표 결과물 1개는 게임 화면 크기로 먼저 보여주고 내 승인을 받아. 끝나면 PR 링크와 본부에 붙여넣을 한 줄 보고를 줘.
```

## R08 · 캐릭터 · Akari + Kasa
시작 조건: 게이트 A(R03 미즈 승인) · 동시 진행: R06~R09 동시 (최대 4방)

```
너는 "Human Enough!" 리마스터의 R08(캐릭터 · Akari + Kasa) 담당이야.
GitHub 저장소 playlist0726-code/human-enough-yokai-festival를 push 권한으로 연결해서 클론하고,
docs/production/ROOM_PROTOCOL.md를 먼저 읽은 다음 docs/production/briefs/r08.md를 그대로 수행해.
대표 결과물 1개는 게임 화면 크기로 먼저 보여주고 내 승인을 받아. 끝나면 PR 링크와 본부에 붙여넣을 한 줄 보고를 줘.
```

## R09 · 인간 캐스트 · 변장 6종 + 손님 9 + 상인 6
시작 조건: 게이트 A · 동시 진행: R06~R08과 동시

```
너는 "Human Enough!" 리마스터의 R09(인간 캐스트 · 변장 6종 + 손님 9 + 상인 6) 담당이야.
GitHub 저장소 playlist0726-code/human-enough-yokai-festival를 push 권한으로 연결해서 클론하고,
docs/production/ROOM_PROTOCOL.md를 먼저 읽은 다음 docs/production/briefs/r09.md를 그대로 수행해.
대표 결과물 1개는 게임 화면 크기로 먼저 보여주고 내 승인을 받아. 끝나면 PR 링크와 본부에 붙여넣을 한 줄 보고를 줘.
```

## R10 · VFX · 게임필(변신, 홀리기, 결계, 포션, 불꽃놀이)
시작 조건: R01 병합 + R02 룩 방향 확정 · 동시 진행: Phase 2 방들과 동시

```
너는 "Human Enough!" 리마스터의 R10(VFX · 게임필(변신, 홀리기, 결계, 포션, 불꽃놀이)) 담당이야.
GitHub 저장소 playlist0726-code/human-enough-yokai-festival를 push 권한으로 연결해서 클론하고,
docs/production/ROOM_PROTOCOL.md를 먼저 읽은 다음 docs/production/briefs/r10.md를 그대로 수행해.
대표 결과물 1개는 게임 화면 크기로 먼저 보여주고 내 승인을 받아. 끝나면 PR 링크와 본부에 붙여넣을 한 줄 보고를 줘.
```

## R11 · 데몬킹 보스 · 미니언 리마스터
시작 조건: 게이트 A · 동시 진행: Phase 2 방들과 동시

```
너는 "Human Enough!" 리마스터의 R11(데몬킹 보스 · 미니언 리마스터) 담당이야.
GitHub 저장소 playlist0726-code/human-enough-yokai-festival를 push 권한으로 연결해서 클론하고,
docs/production/ROOM_PROTOCOL.md를 먼저 읽은 다음 docs/production/briefs/r11.md를 그대로 수행해.
대표 결과물 1개는 게임 화면 크기로 먼저 보여주고 내 승인을 받아. 끝나면 PR 링크와 본부에 붙여넣을 한 줄 보고를 줘.
```

## R12 · 1인칭 미니게임 6종 비주얼
시작 조건: R04 노점 키트 + R03 손 모델 · 동시 진행: R13 · R14와 동시

```
너는 "Human Enough!" 리마스터의 R12(1인칭 미니게임 6종 비주얼) 담당이야.
GitHub 저장소 playlist0726-code/human-enough-yokai-festival를 push 권한으로 연결해서 클론하고,
docs/production/ROOM_PROTOCOL.md를 먼저 읽은 다음 docs/production/briefs/r12.md를 그대로 수행해.
대표 결과물 1개는 게임 화면 크기로 먼저 보여주고 내 승인을 받아. 끝나면 PR 링크와 본부에 붙여넣을 한 줄 보고를 줘.
```

## R13 · 사운드 · 음악
시작 조건: R01 병합(이벤트 버스) — 언제든 시작 가능 · 동시 진행: 어느 Phase와도 동시

```
너는 "Human Enough!" 리마스터의 R13(사운드 · 음악) 담당이야.
GitHub 저장소 playlist0726-code/human-enough-yokai-festival를 push 권한으로 연결해서 클론하고,
docs/production/ROOM_PROTOCOL.md를 먼저 읽은 다음 docs/production/briefs/r13.md를 그대로 수행해.
대표 결과물(효과음 세트 1개, 축제 루프 1곡)은 먼저 들려주고 내 승인을 받아. 끝나면 PR 링크와 본부에 붙여넣을 한 줄 보고를 줘.
```

## R14 · 성능 · 로딩 · 모바일 최적화
시작 조건: Phase 2 에셋 대부분 병합 · 동시 진행: R12 · R13과 동시

```
너는 "Human Enough!" 리마스터의 R14(성능 · 로딩 · 모바일 최적화) 담당이야.
GitHub 저장소 playlist0726-code/human-enough-yokai-festival를 push 권한으로 연결해서 클론하고,
docs/production/ROOM_PROTOCOL.md를 먼저 읽은 다음 docs/production/briefs/r14.md를 그대로 수행해.
측정 결과표를 먼저 보여주고 무엇부터 줄일지 내 승인을 받아. 끝나면 PR 링크와 본부에 붙여넣을 한 줄 보고를 줘.
```

## R15 · 출시 · 포트폴리오 패키지
시작 조건: R14 통과 + 본부의 폴리시 패스 · 동시 진행: 단독(본부와 함께)

```
너는 "Human Enough!" 리마스터의 R15(출시 · 포트폴리오 패키지) 담당이야.
GitHub 저장소 playlist0726-code/human-enough-yokai-festival를 push 권한으로 연결해서 클론하고,
docs/production/ROOM_PROTOCOL.md를 먼저 읽은 다음 docs/production/briefs/r15.md를 그대로 수행해.
호스팅·출시 채널 비교표를 먼저 보여주고 내 결정을 받아. 끝나면 PR 링크와 본부에 붙여넣을 한 줄 보고를 줘.
```

