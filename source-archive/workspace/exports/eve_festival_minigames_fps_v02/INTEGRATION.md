# 기존 게임에 적용하는 방법

## 현재 구조와 적용 방식

이 패키지는 독립 웹 페이지에서 실행되는 Three.js 미니게임입니다. `dist/`는 빌드 결과를 난독화한 파일이 아니라 수정 가능한 원본입니다. 6종의 서로 다른 1인칭 카메라, 요괴별 손·소매, 도구 동작, 포차와 사람 운영자, 점수·시간·재도전 UI를 포함합니다.

웹 게임에 가장 적은 변경으로 넣으려면 `dist/` 전체를 예를 들어 `/festival/` 아래에 복사하고 별도 화면이나 iframe으로 여세요. HTML import map과 실행에 사용하는 모듈·캐릭터 이미지 경로는 상대 경로이므로 폴더 구조를 유지하세요. iframe 예: `<iframe src="/festival/" title="축제 놀이" style="width:100%;height:100%;border:0"></iframe>`.

현재 iframe 통신이나 공개 mount/unmount API는 구현되어 있지 않습니다. 호스트에서 캐릭터·놀이를 지정하고 결과를 받으려면 아래 지점에 연결 코드를 추가해야 합니다. Three.js 장면 안에 직접 합칠 경우에는 장면·카메라·렌더러 소유권, 전역 DOM ID와 CSS, 키 입력 처리, 실행 중인 프레임 루프를 기존 게임 구조에 맞게 분리하세요. 종료 시 프레임 루프와 이벤트를 정리하고 사용한 geometry·material·texture·renderer를 해제해야 합니다.

Unity·Unreal·Godot 등 다른 엔진에서는 바로 불러오는 플러그인 형식이 아닙니다. 해당 프로젝트가 WebView를 지원하면 웹 화면으로 연결하거나, 아래 판정 규칙과 시점·동작 코드를 참고해 엔진에 맞게 옮기세요. 이미지 외 3D 형상은 절차적으로 생성되므로 원본 모델 파일은 없습니다.

## 주요 파일

| 파일 | 역할 |
| --- | --- |
| `dist/index.html` | UI 뼈대, import map, 진입점 |
| `dist/app.mjs` | 포차 장면, 사람 운영자 배치, UI, 입력 변환, 결과 처리 |
| `dist/first-person.mjs` | 놀이별 카메라와 요괴의 손·소매·도구 연출 |
| `dist/modules/minigames.mjs` | 화면·Three.js에 의존하지 않는 판정 규칙 |
| `dist/modules/avatar.mjs` | 요괴 형상과 동작 생성 함수 |
| `dist/modules/visitors.mjs` | 사람 운영자 형상과 동작 |
| `dist/modules/renderkit.mjs` | 공통 형상·의상 무늬·포션 생성 |
| `dist/modules/art-materials.mjs` | 목재·돌·무광 재질 생성 |
| `dist/assets/*.png` | 7명 캐릭터 선택 이미지 및 축제 참고 이미지 |
| `dist/style.css` | 세로 휴대폰 화면 대응 및 조작 UI |

## 시작·결과 연결 위치

`app.mjs`의 `selected`가 캐릭터 ID, `kind`가 놀이 ID입니다. `resetCharacter(id)`와 `createStand(kind)`로 해당 선택을 처리합니다. 이 함수들은 현재 페이지 내부 함수이며 외부 모듈 API로 export되어 있지는 않습니다.

`begin()`이 새 판을 만들고 시작합니다. 여기서 호스트의 미니게임 세션 ID·고정 seed·캐릭터·놀이 선택을 받아 연결할 수 있습니다. `doInput(input, target)`은 사용자 동작을 판정 규칙으로 넘기는 지점입니다. `result()`는 결과 표시를 한 번만 처리하며 `game.result.won`, `game.result.reason`, `game.score`, `kind`, `selected`를 읽을 수 있습니다. 보상 연동이나 결과 이벤트는 이 지점이 적합합니다.

현재 `result()`는 성공한 놀이를 `localStorage` 키 `eve-festival-stamps-v1`에 저장할 뿐 본 게임 보상을 지급하지 않습니다. 호스트에서 시작할 때 이동과 카메라 입력을 잠그고, 종료·취소 시 복원하는 처리를 추가하세요. iframe을 쓰는 경우에는 시작/완료/취소 메시지를 새로 구현하고 송수신 origin 및 세션 ID를 확인하세요. 이것은 추가할 연동 계약이며, 패키지에 이미 구현된 기능은 아닙니다.

## 재사용 가능한 판정 API

```js
import {createGame, inputGame, advanceGame, rewardFor}
  from './dist/modules/minigames.mjs';

const now = () => performance.now() / 1000;
const game = createGame('ring', 12345, now());
inputGame(game, {type:'begin'}, now());
inputGame(game, {type:'throw', power:0.55, aimX:0.5}, now());
// 반복 갱신에서 advanceGame(game, now()) 호출
// game.status === 'result'가 되면 game.result를 확인
// rewardFor(game)는 보상 제안 객체를 반환하며 지급하지는 않음
```

시간 단위는 초이며 한 판 내에서 동일한 시간 기준을 사용합니다. 함수는 전달받은 game 객체를 직접 갱신합니다. 상태는 `intro → active → result`입니다. `advanceGame`은 시간 초과와 조리 상태를 갱신하므로 입력이 없는 동안에도 호출해야 합니다.

| 놀이 ID | 입력 | 1인칭 조작 |
| --- | --- | --- |
| `shoot` | `{type:'aim', x, y}` | 드래그 조준 후 발사, 코르크와 반동 |
| `fish` | `{type:'aim', x, y}` | 뜰채를 드래그하고 들어 올려 잡기 |
| `ring` | `{type:'throw', power, aimX}` | 위로 당겨 놓기 또는 버튼을 누르고 놓기 |
| `cook` | `{type:'flip', index}` | 노릇한 반죽을 꼬치로 뒤집기, index 0–5 |
| `fortune` | `{type:'pick', index}` | 복주머니를 잡아당기기, index 0–2 |
| `ice` | `{type:'turn'}` 후 `{type:'syrup', index}` | 손잡이를 원형으로 돌려 12칸 채운 뒤 시럽 선택 |

공통 시작 입력은 `{type:'begin'}`입니다. shoot/fish의 x·y는 화면 픽셀이나 월드 좌표가 아닌 0–1 범위의 논리 판정 좌표입니다. app.mjs가 카메라·레이캐스트 결과를 이 좌표로 변환합니다. `aim` 입력은 조준선만 움직이는 이벤트가 아니라 발사/건지기 판정을 실행합니다. ring의 power·aimX도 0–1 범위입니다. 기존 타이밍 방식의 throw 호환 분기가 있으나 현재 1인칭 조작은 힘과 조준을 명시적으로 전달합니다.

캐릭터 ID: `mizu`, `pon`, `kon`, `sumi`, `nemu`, `akari`, `kasa`.

## 보상과 협동 게임 연결

`rewardFor(game)`의 제안값은 사격 포션 1병, 금붕어 홀림 보호 15초, 고리 속도 효과 20초, 타코야키 요력 35, 복주머니 포션 1병/요력 45/홀림 보호 20초 중 하나, 빙수 요력 20·홀림 보호 8초입니다. 이 객체를 현재 게임의 실제 아이템·효과 체계에 매핑해야 합니다.

현재 ZIP에는 서버가 없습니다. minigames.mjs 첫 주석의 서버 검증 설명은 규칙의 원래 활용 의도를 나타내며, 이 독립 버전은 클라이언트에서 실행됩니다. 협동 게임에서 실제 보상을 지급할 때는 서버가 세션 seed·시간·입력·결과를 검증하고 한 세션당 한 번만 지급하도록 연결하세요. 클라이언트 점수나 도장 저장값 자체를 보상 확정 근거로 쓰면 안 됩니다. 이 규칙 모듈은 DOM 의존성이 없어 서버 쪽 판정에도 재사용할 수 있습니다.

## 외부 의존성과 이식 시 확인

- Three.js 0.180.0 및 사용하는 addon 두 개를 `dist/vendor/`에 포함했습니다. 프로젝트가 이미 Three.js를 사용하면 중복 버전과 객체 인스턴스를 피하도록 하나의 버전으로 정리하세요.
- Google Fonts 요청은 style.css 첫 줄에 있습니다. 오프라인 실행은 대체 글꼴로 동작합니다. 완전한 로컬 구성이 필요하면 이 import를 제거하거나 폰트를 별도로 마련하세요.
- art-materials.mjs의 `pavingMaterial()`은 `/assets/shrine-paving-v05.png`를 참조하지만 현재 미니게임 실행 경로에서는 호출하지 않습니다. 그 선택적 함수를 새로 사용하려면 해당 텍스처를 추가하거나 경로를 수정하세요.
- WebGL 지원 브라우저가 필요합니다. 터치 조작, 세로 화면, 효과음 선택 기능이 들어 있습니다. 실제 적용 대상 휴대폰에서는 화면 회전·복귀·성능을 추가 확인하세요.
- tests의 3개 판정 검증은 고리 던지기의 힘·조준 입력을 다룹니다. 전체 UI·모든 놀이의 자동 검증을 의미하지는 않습니다.

## 적용 완료 확인

기존 게임에서 각 포차로 접근해 6종이 열리는지, 캐릭터 선택이 손·소매에 반영되는지, 놀이마다 다른 카메라와 실제 터치 동작이 유지되는지 확인하세요. 성공·실패·취소 후 원래 캐릭터 조작이 복원되어야 하며 재진입 때 프레임 루프나 입력이 중복되면 안 됩니다. 협동 보상은 다른 플레이어 상태와 맞고 한 번만 지급되는지 확인하세요.
