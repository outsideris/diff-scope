# DESIGN

## 기획 의도

코딩 에이전트(Claude Code, ChatGPT 앱 등)로 작업하면 여러 워크트리와 브랜치에서 변경이 계속 쌓인다. 워크트리는 위치가 바뀌고, 브랜치를 왔다갔다 하면서 변경사항을 확인하는 일이 번거롭다. diff-scope는 이런 변경사항을 한곳에서 편하게 탐색하기 위한 **개인용 macOS 앱**이다.

## 사용자 경험 방향

- diff 화면은 **GitHub의 diff 형식**을 기준으로 한다. 사용자가 가장 익숙한 형태이기 때문이다.
- 완성도의 참고 기준은 [Kaleidoscope](https://kaleidoscope.app/)다.
- 개인 도구이므로 멀티 유저, 인증, 원격 접근은 고려하지 않는다.

## 핵심 요구사항

1. **워킹 디렉토리/워크트리 전환**: 여러 저장소와 워크트리를 등록해 두고 쉽게 오가며 변경사항을 본다. 워크트리는 `git worktree list`로 자동 발견한다.
2. **히스토리 탐색**: 커밋 히스토리를 따라 이동하며 이전 커밋의 변경 내역을 본다.
3. **작업 상태 화면**: 아직 커밋되지 않은 변경(unstaged)과 스테이징된(staged) 파일 목록을 구분해서 보여주고, 파일을 선택하면 해당 diff를 본다.
4. **diff 뷰**: unified/split 전환, word-level 하이라이트, 문법 강조를 갖춘 GitHub 스타일 렌더링.

## 주요 의사결정

### 앱 형태: 로컬 웹 서버가 아닌 데스크톱 앱 (2026-07-11)

처음에는 CLI + 로컬 서버 + 브라우저 구조를 검토했으나, 사용자가 서버 없이 닫히는 앱 형태를 선호해 데스크톱 앱으로 결정했다.

### 프레임워크: Electron (2026-07-11)

Tauri 2, Wails, SwiftUI + WKWebView 조합과 비교한 뒤 **Electron**으로 결정했다.

- **Electron 선택 이유**: 렌더러가 Chromium이라 diff 렌더링이 예측 가능하고, Chrome DevTools로 디버깅할 수 있으며, Node 내장으로 `child_process`에서 git을 바로 실행해 전 구간을 순수 TypeScript로 유지할 수 있다. 앱 크기와 메모리가 무거운 단점은 개인 도구이므로 감수한다.
- **Tauri 탈락 이유**: 품질 자체는 검증됐지만 렌더링 엔진이 WKWebView(Safari)라 diff 라이브러리의 렌더링 특성과 디버깅 경험에 불확실성이 있고, Rust 툴체인이 추가로 필요하다.
- **Wails 탈락 이유**: Go 생태계 이점이 없고 v3가 stable 전이다.
- **SwiftUI + WKWebView 탈락 이유**: 네이티브 ↔ 웹뷰 브리지를 직접 설계해야 해서 개인 도구 치고 공수가 가장 크다.

### Git 접근: 바인딩 라이브러리 대신 git CLI 실행 (2026-07-11)

libgit2 바인딩(nodegit)이나 isomorphic-git 대신 **git CLI를 직접 실행하고 출력을 파싱**한다. 핵심 요구사항인 워크트리 목록(`git worktree list`), 히스토리(`git log`), staged/unstaged 구분(`git status --porcelain=v2`, `git diff` / `git diff --cached`)이 전부 CLI 한 줄이고, 워크트리·서브모듈 같은 엣지 케이스를 git 본체가 처리해 주기 때문이다.

### UI 디자인: 그라파이트(A안) 채택 (2026-07-12)

세 가지 시안(A 그라파이트 / B 투톤 캔버스 / C 모노 콘솔)을 비교한 뒤 **A안 그라파이트**를 채택했다. 방향은 "macOS의 조용한 도구" — 크롬(사이드바·툴바)은 무채색으로 가라앉히고 diff 콘텐츠가 주인공이 되게 한다.

- **팔레트**: 모든 색은 `src/renderer/src/styles.css`의 CSS 변수로 정의하고 라이트/다크는 `light-dark()` 한 벌로 관리한다. 라이트 창 배경 `#F5F5F7` / 다크 `#1E1F24`(그라파이트, GitHub 청흑이 아님), 액센트 `#4666E5`/`#8AA0FF`.
- **색의 역할 분리**: 액센트(선택·이동) / added·deleted(의미색) / 상태 칩 — 세 갈래만 쓰고 크롬은 무채색을 유지한다.
- **타이포**: UI는 시스템 스택(SF Pro), 코드·해시·라인번호·카운트는 `ui-monospace` + `tabular-nums`.
- **컴포넌트 규칙**:
  - 파일 경로는 디렉토리를 흐리게, 파일명을 진하게. 경로가 길면 디렉토리만 말줄임하고 파일명은 항상 보인다.
  - 파일 목록과 diff 카드 헤더에 +/− 라인 통계를 표시한다 (working은 numstat, diff 카드는 hunk 카운트).
  - 상태 코드(M/A/D/R/U)는 색 배경 + 글자 칩으로, 색에만 의존하지 않는다.
  - 선택 항목은 액센트 연한 배경 + 좌측 2px 액센트 바.
  - 사이드바 워크트리에 미커밋 변경 개수 dirty 배지를 단다.
  - 툴바는 `…/부모/저장소명` 축약 경로 + 브랜치 모노 칩.

### diff 렌더링: @git-diff-view/react + Shiki (2026-07-11)

GitHub과 거의 동일한 diff UI(unified/split, word-diff, 컨텍스트 확장)를 제공하는 것이 목적인 라이브러리라 요구사항과 정확히 맞는다. 문법 강조는 Shiki를 연동한다. 문제가 생기면 `react-diff-view`, Monaco diff editor가 대안이다.
