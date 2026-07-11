# diff-scope

Git 워킹 디렉토리, 워크트리, 커밋 히스토리를 오가며 코드 변경사항을 쉽게 볼 수 있는 macOS용 diff viewer 앱.

Claude Code, ChatGPT 같은 코딩 에이전트로 작업하다 보면 여러 워크트리와 브랜치에서 동시에 변경이 쌓이는데, 이를 터미널에서 일일이 확인하기 어렵다. diff-scope는 GitHub 스타일의 익숙한 diff 화면으로 이런 변경사항을 한곳에서 탐색하는 개인 도구다.

## 주요 기능 (계획)

- 등록된 저장소와 워크트리를 오가며 diff 보기
- 커밋 히스토리를 따라 이동하며 이전 커밋의 변경 내역 보기
- 아직 커밋되지 않은 변경(unstaged)과 스테이징된(staged) 파일 목록 및 diff 보기
- GitHub 스타일 diff 렌더링 (unified/split, word-level 하이라이트, 문법 강조)

## 기술 스택

- **Electron** + **React** + **Vite** (TypeScript)
- diff 렌더링: `@git-diff-view/react`, 문법 강조: Shiki
- Git 접근: 메인 프로세스에서 `git` CLI 실행 후 출력 파싱
- 린트/포맷: oxlint + oxfmt

자세한 구조는 [docs/ARCHITECURE.md](docs/ARCHITECURE.md), 기획 의도와 결정 배경은 [docs/DESIGN.md](docs/DESIGN.md) 참고.

## 빌드 / 실행

아직 스캐폴딩 전이다. 프로젝트 구성 후 이 섹션에 실행 방법을 기록한다.
