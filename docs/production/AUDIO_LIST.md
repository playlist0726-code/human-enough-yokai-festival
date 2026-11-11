# 오디오 목록 (R13) — 이벤트 → 큐 → 버스

정본: `public/audio/cues.mjs`(규칙) + `public/assets/audio/manifest.json`(파일). 큐 이름은 VFX 연출표(`VFX_LIST.md`)와 같다.
모든 소리는 `source/v2/audio/build_audio.py`가 코드로 **작곡·합성**한 오리지널이다(샘플·생성 모델·크레딧 0). 다시 실행하면 같은 파일이 나온다.

## 믹서
```
master (DynamicsCompressor −12 dB, 4:1) ← music ← duck   (대형 이벤트 때 −5 ~ −9 dB, 0.35초 유지 후 복귀)
                                       ← ambience ← duck
                                       ← sfx  ← voice  ← ui
```
- 슬라이더(메뉴 → Settings: Volume / Music / Effects / Festival ambience / Voices)는 0~100%, **제곱 곡선**으로 게인. `localStorage['eve-human-enough-audio-v1']`. 기존 "Sound effects" 토글은 마스터 뮤트로 그대로 동작.
- **모바일 잠금 해제**: 첫 pointerdown/keydown/touchend에서 AudioContext 생성 + 무음 버퍼(iOS) + 이후 제스처마다 resume.
- **형식**: Vorbis를 재생할 수 있으면 `.ogg`, 아니면 `.m4a`(AAC). 브라우저는 한 형식만 받는다(약 2.5 MB).
- **거리**: 내 캐릭터 이벤트로 청자 위치를 갱신. 다른 플레이어 이벤트는 `1/(1+4(d/range)²)`(바닥 0.12) + 좌우 패닝. 발소리 14 m, 보스 60~80 m.
- **변주**: 원샷마다 피치 ±5%, 변형 2~5개 랜덤, 큐별 동시 재생 제한, 발소리 70 ms 스로틀.
- **음악 상태**: 화면(DOM)을 관찰해 결정 — 타이틀/메뉴/로비 = `title`, 플레이 = `festival`, 보스 예고~퇴치 또는 보스 연습 = `boss`, 결과 = `victory`/`defeat` 스팅어. 오프닝 동안은 음악을 내리고 변신 큐 3개. 크로스페이드 1.2초.
- **앰비언스**: 타이틀은 풀벌레+바람, 플레이는 군중+풀벌레+바람. 불꽃놀이 폭발음은 앰비언스 버스(먼 소리: −0~6 dB, 0.15~0.5초 지연, 피치 변주).

## 라우드니스(측정값, ffmpeg ebur128)
| 자산 | 통합 라우드니스 | 피크 |
|---|---|---|
| festival 51.4 s 루프 | −20.0 LUFS | −6.2 dBFS |
| boss 29.1 s 루프 | −19.0 | −5.0 |
| title 45.7 s 루프 | −22.0 | −13.1 |
| victory / defeat 스팅어 | −18.0 / −20.0 | −6.5 / −5.7 |
| 앰비언스 crowd / insects / wind | −30.0 | −14.7 / −20.3 / −16.6 |
| 원샷 SFX | 피크 −3 dBFS 정규화 | 트루 피크 ≤ −1 dBTP |
기준: ASWG-R001(PC −24, 휴대 −18 LUFS 근처). 음악 −20, 앰비언스는 믹스 아래 −30.

## 이벤트 → 큐
| 이벤트 | 큐(변형 수) | 버스·게인 | 덕 | 목소리 |
|---|---|---|---|---|
| (오프닝) | `transform_gather` → `transform_pop`(0.51) → `transform_reveal`(0.6) | sfx | pop −8 dB | — |
| potion_pickup | `potion_pickup`(3) 유리 반짝임 | sfx −4 | | |
| potion_drink | `potion_drink`(2) 꿀꺽 3번 + 상승음 | sfx −4 | | |
| charm_cast | `charm_cast`(2) 상승 스윕 + 반짝임 | sfx −3 | | 웃음 50% |
| charm_end | `charm_end` 하강음(내 것만) | sfx −8 | | |
| cover_ward | `cover_ward` 종 + 상승 스윕 | sfx −4 | | |
| reveal_start | `reveal_pop`(3) "뿅" | sfx −2 | | **놀람** |
| reveal_end | `reveal_hide` | sfx −9 | | |
| guest_delivered | `guest_delivered` 종 2개 + 반짝임 | sfx −2 | −6 | 웃음 |
| stall_enter / win / fail / reward | `stall_*` | ui·sfx | | win: 웃음 |
| hit | `hit`(2) 북 + 타격 | sfx −2 | | 놀람 60% |
| sealed | `sealed` 낮은 종 + 연기 | sfx −3 | −4 | |
| rescued | `rescued` | sfx −4 | | |
| boss_omen | `boss_omen` 큰 북 + 하강 웅웅 | sfx −2 | −5 | |
| spirit_bolt | `spirit_bolt`(3) | sfx −6 | | |
| ward_block / seal_break | `ward_block` 카네 / `seal_break` | sfx | | |
| boss_banished | `boss_banished` 큰 북 + 종 + 반짝임 | sfx 0 | −9 | |
| ping | `ping` 종 2번(멀리서도 들림) | ui −4 | | |
| footstep / jump / land | `footstep`(5) / `jump` / `land`(2) | sfx −14 / −10 / −8 | | |
| round_start | `round_start` 카네 2번 | sfx −4 | | |
| round_end | `victory` / `defeat` 스팅어 | music | | |
| firework | `firework`(3, 거리별) | ambience −6 | | |
| (UI) 버튼 클릭 | `ui_click` 나무 딱 | ui −10 | | |

## 음악(오리지널)
| 트랙 | 템포·음계 | 편성 |
|---|---|---|
| festival | 112 BPM, 요(陽) 음계 D E G A B, 24마디 A-B-A′-C-A-B′ | 피리 2성부, 샤미센 오스티나토, 오다이코 동/카, 시메다이코 8분, 카네 "찬치키", 짭파 |
| boss | 132 BPM, 인(陰) 음계 D E♭ G A B♭, 16마디 | 샤미센 트레몰로, 큰 북, 피리 스탭, 낮은 종 |
| title | 84 BPM, 요 음계, 16마디 | 고토풍 아르페지오, 느린 피리, 긴 잔향 |
| victory / defeat | 스팅어 약 4초 | 상승 피리 런 + 북 / 하강 피리 + 종 |

## 캐릭터 목소리(포먼트 합성, 의미 없는 말소리)
| 캐릭터 | 기본 음높이 | 웃음 | 놀람 |
|---|---|---|---|
| mizu 420 Hz | hi hi hi | e i! |
| pon 210 Hz | ho ho ho ho | o u! |
| kon 360 Hz | ko ko ko | a! |
| sumi 300 Hz | ka ka ka ka | ga a! |
| nemu 330 Hz | hu hu hu | u! |
| akari 390 Hz | ha ha ha | a o! |
| kasa 470 Hz | ke ke ke | i i! |
내 캐릭터는 정확한 목소리. 다른 플레이어는 이벤트 데이터에 캐릭터가 없어 id로 고정 배정한다(본부 요청: 이벤트에 `character` 추가).

## 용량
ogg + m4a 합계 **4.94 MB**(완료 기준 ≤ 8 MB). 한 브라우저가 받는 양은 약 2.5 MB. 테스트 `tests/audio.test.mjs`가 매 PR마다 확인.
