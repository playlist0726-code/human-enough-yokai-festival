# 내 컴퓨터에서 게임 작업하기

이 폴더는 GitHub 저장소와 연결된 실제 작업 사본이다. GitHub 웹페이지와 내 컴퓨터 사이의 변경을 Git으로 주고받는다.

- 내 컴퓨터 폴더: 파일을 수정하고 게임을 실행하는 곳
- 커밋: 변경을 내 컴퓨터의 Git 이력에 기록
- 푸시: 커밋을 GitHub로 업로드
- Pull Request(PR): 작업 브랜치를 검토한 뒤 `main`에 합치는 요청
- 배포: 서버에 플레이 가능한 버전을 반영하는 별도 단계

## 1. 폴더 열기

VS Code에서 **File → Open Folder…**를 선택하고 이 저장소 폴더를 연다. 폴더 안에 `package.json`, `server.mjs`, `public`, `shared`가 보여야 한다.

GitHub Desktop을 사용한다면 **File → Add Local Repository…**에서 같은 폴더를 선택한다. 저장소를 새로 만들거나 Publish할 필요는 없다. `origin`은 이미 다음 주소에 연결돼 있다.

```text
https://github.com/playlist0726-code/human-enough-yokai-festival.git
```

다른 컴퓨터에서 처음 받을 때는 Git LFS를 설치한 뒤 아래 순서로 받는다. Mac에서 Homebrew를 사용한다면 Git LFS 설치 명령은 `brew install git-lfs`다.

```sh
git clone https://github.com/playlist0726-code/human-enough-yokai-festival.git
cd human-enough-yokai-festival
git lfs install --local
git lfs pull
npm ci
```

Git LFS가 설치되지 않은 상태에서 이미 파일 받기가 실패했다면 그 폴더에 변경이 있는지 먼저 확인하고 복구한다. 대용량 제작 원본의 전체 복원·검증은 [SOURCE_BACKUP.md](SOURCE_BACKUP.md)를 따른다.

## 2. 게임 실행

이 프로젝트는 Node.js **22.x**를 사용한다. VS Code에서 **Terminal → New Terminal**을 선택한 뒤 확인한다.

```sh
node --version
```

Node 22.x라면 다음과 같이 실행한다.

```sh
npm ci
npm run dev
```

다른 Node 버전이 기본으로 설치된 Mac에서는 프로젝트나 시스템 설정을 바꾸지 않고 아래 명령으로 Node 22.22.3을 사용해 실행할 수 있다. 처음 사용할 때 해당 Node 패키지를 내려받는다.

```sh
npm exec --yes --package=node@22.22.3 -- npm run dev
```

브라우저에서 http://127.0.0.1:4173/ 를 연다. 서버를 실행하는 터미널은 켜두고, 중지할 때는 그 터미널에서 **Control+C**를 누른다.

## 3. Muse Code와 작업

VS Code에서 터미널을 하나 더 만든다. 같은 저장소 폴더인지 확인한 뒤 실행한다.

```sh
muse
```

처음 사용하는 컴퓨터라면 Muse 설치·로그인이 필요하다. 이미 로그인된 이 Mac에서는 저장된 인증을 사용한다.

첫 요청은 작은 문제 하나로 정한다. 예를 들어:

> server.mjs의 ready 요청을 반복했을 때 중복 전송이 발생하는지 읽어줘. 우선 관련 코드와 최소 수정안을 설명해줘. 수정한 뒤에는 정상 준비 동작과 반복 요청을 검증해줘.

요청 → 변경 내용 확인 → 실제 실행 → 테스트 → 커밋 순서로 진행한다. AI의 완료 설명과 실제 테스트 결과를 함께 확인한다.

## 4. 변경을 기록하고 GitHub에 올리기

새 작업을 시작할 때 작업 중인 변경을 먼저 확인한다.

```sh
git status
```

기존 변경을 완료하거나 안전하게 보관한 뒤, 새 작업이라면 최신 `main`에서 브랜치를 만든다.

```sh
git switch main
git pull --ff-only origin main
git switch -c feature/first-update
```

`feature/first-update`는 예시 이름이다. 다음 작업부터는 `fix/reconnect-message`처럼 작업마다 새 이름을 사용한다. 이미 작업 브랜치에서 진행 중이면 `main`으로 옮기지 않고 그 브랜치에서 계속한다.

파일을 수정한 뒤 변경 내용을 확인한다.

```sh
git diff
git status --short
```

필요한 검사를 실행한다. 아래 세 명령은 Node 22.x 환경에서 사용한다.

```sh
npm run check
npm test
npm run test:integration
```

기본 Node가 다른 버전이라면 각 명령 앞에 `npm exec --yes --package=node@22.22.3 --`를 붙인다. 예: `npm exec --yes --package=node@22.22.3 -- npm test`.

준비된 파일만 선택해 커밋한다. 아래는 README를 바꾼 예시다. 실제 수정한 파일 이름으로 바꿔 사용한다.

```sh
git add README.md
git diff --cached
git commit -m "docs: clarify local setup"
git push -u origin HEAD
```

GitHub에서 이 브랜치의 Pull Request를 열고 변경과 검사 결과를 확인한 뒤 `main`에 합친다. Render 배포 여부와 배포 결과는 별도로 확인한다. `main`에 합치는 시점에는 진행 중인 플레이테스트도 고려한다.

GitHub Desktop에서도 같은 흐름을 사용할 수 있다: 작업 브랜치 선택 → Changes에서 파일 선택·변경 확인 → Summary 작성 → Commit → Publish branch 또는 Push origin → Preview/Create Pull Request.

## 5. 매일 할 일

- 오늘 해결할 문제 하나와 완료 조건을 적는다.
- 작은 변경을 만들고 직접 확인한다.
- 의미 있는 변경 단위로 커밋한다.
- GitHub에 보관하려면 푸시한다.
- 무엇을 바꿨고 어떻게 확인했는지 PR이나 작업 기록에 남긴다.

비공개 저장소의 활동은 프로필에서 비공개 기여 표시를 켜면 익명 활동 수로 표시할 수 있다. 커밋의 그래프 반영에는 연결된 작성자 이메일과 기본 브랜치 등 별도 조건이 있다. 브랜치 작업이 당장 초록 칸으로 보이지 않더라도 먼저 변경의 검증과 검토를 마친다.

## 6. 대용량 파일

`public/`의 실행용 파일과 `art/`·`source-archive/`의 제작·백업 원본을 구분한다. 기존 `.gitattributes`가 원본에 Git LFS를 적용한다. 전체 원본을 받은 뒤 `python3 scripts/verify-source-backup.py`로 백업 명세를 검증할 수 있다.

게임 실행 중 생성된 의존성과 캐시는 `.gitignore`에 따라 제외된다. API 키는 저장소에 커밋하지 않는다.
