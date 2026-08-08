# ARCHITECTURE

## 전체 구조

Electron 앱. 아직 스캐폴딩 전이며, 아래는 결정된 구조 방향이다.

```
┌─────────────────────────────────────────┐
│ Electron Main Process (Node/TypeScript) │
│  - git CLI 실행 (child_process)          │
│  - 출력 파싱 → 구조화된 데이터            │
│  - 저장소/워크트리 목록 관리, 설정 저장    │
└──────────────┬──────────────────────────┘
               │ IPC (contextBridge, typed API)
┌──────────────┴──────────────────────────┐
│ Renderer Process (React + Vite)          │
│  - 저장소/워크트리 전환 UI                │
│  - 커밋 히스토리 탐색                     │
│  - staged/unstaged 파일 목록              │
│  - diff 뷰 (@pierre/diffs)                │
└─────────────────────────────────────────┘
```

## 기술 스택

| 영역        | 선택                                       |
| ----------- | ------------------------------------------ |
| 셸          | Electron                                   |
| 프론트엔드  | React + Vite (TypeScript)                  |
| diff 렌더링 | `@pierre/diffs`                            |
| 문법 강조   | Shiki (`@pierre/diffs` 내장)               |
| Git 접근    | git CLI 실행 (`child_process`) + 출력 파싱 |
| 린트/포맷   | oxlint + oxfmt                             |

## 모듈 구성

```
src/shared/ipc.ts            # IPC 채널 상수 (main/preload 공유)
src/shared/git.ts            # 렌더러와 공유하는 타입 (RepoStatus, Worktree, CommitInfo, ...)
src/main/index.ts            # 앱 생명주기, 창 생성, 스토어/IPC 초기화
src/main/ipc.ts              # IPC 핸들러 등록 (RepositoryStore 주입)
src/main/git/exec.ts         # git CLI 실행 래퍼 (runGit) + GitError
src/main/git/status.ts       # status --porcelain=v2 -z 파서
src/main/git/worktree.ts     # worktree list --porcelain -z 파서
src/main/git/log.ts          # log 커스텀 구분자 포맷 파서
src/main/git/diff.ts         # working/staged/untracked/commit diff 원문 조회
src/main/git/blob.ts         # 특정 리비전의 파일 내용 조회 (diff 컨텍스트 확장용)
src/main/git/numstat.ts      # diff --numstat 파서 (파일별 +/− 라인 수)
src/main/git/repository.ts   # 경로 → 저장소 루트 해석
src/main/store/repositories.ts  # 저장소 목록 JSON 영속화 (userData/repositories.json)
src/preload/index.ts         # window.diffScope typed API
src/renderer/src/App.tsx     # 최상위 상태 (저장소/워크트리 선택, Working|History 뷰 전환)
src/renderer/src/components/ # Sidebar, WorkingView, HistoryView, DiffPane
src/renderer/src/lib/        # 순수 로직: parseDiff(diff 섹션 분할), status(그룹핑), format, session, useAsync
```

## 렌더러 구조

- **Sidebar**: 저장소 목록과 각 저장소의 워크트리. `selectDirectory` IPC(macOS 디렉토리 다이얼로그)로 저장소를 추가한다.
- **WorkingView**: `getStatus` 결과를 Staged / Changes(unstaged+untracked)로 그룹핑(`lib/status.ts`), 파일 선택 시 `getWorkingDiff`로 diff 조회.
- **HistoryView**: `getLog` 커밋 목록, 선택 시 `getCommitDiff`.
- **DiffPane**: diff 원문을 `lib/parseDiff.ts`로 파일 섹션 단위로 쪼개, 각 섹션의 원문(`file.raw`)을 `@pierre/diffs`의 `<PatchDiff patch={...}>`에 넘겨 렌더링한다. unified/split 전환은 `options.diffStyle`.
- **주의**: `PatchDiff`는 내부적으로 `getSingularPatch()`를 써서 patch 하나에서 **파일 하나**를 렌더링한다. 여러 파일은 앱이 쪼개서 컴포넌트를 여러 개 마운트한다.
- **주의**: `@pierre/diffs`는 **shadow DOM**(`<diffs-container>`) 안에 렌더링한다. 페이지 CSS 셀렉터는 내부에 닿지 않고, `--diffs-*` 커스텀 프로퍼티만 상속으로 넘어간다. 폰트·크기·행간은 `styles.css`의 `:root`에서 지정한다. 단 **라이브러리가 `:host`에 직접 선언하는 변수(`--diffs-bg` 계열)는 `:root` 상속으로 못 덮는다** — 이런 값은 `options.unsafeCSS`로 `:host`에 다시 선언한다(`DiffPane`의 `DIFF_SURFACE_CSS`).
- **주의**: 파일 헤더는 앱이 직접 그리므로 `options.disableFileHeader: true`로 라이브러리 헤더를 끈다. 바이너리 파일은 pierre에 개념이 없어 앱이 `isBinary`로 먼저 걸러낸다.
- **가상화**: 파일 목록을 `<Virtualizer>`로 감싼다. 이 컨텍스트 안에서는 각 `PatchDiff`가 `VirtualizedFileDiff`로 승격돼(`useFileDiffInstance`가 `useVirtualizer()` 값으로 분기) 화면에 보이는 줄만 그린다. 바깥 div(`.diff-files`)가 스크롤 컨테이너, 안쪽 div(`.diff-files-content`)가 카드 목록이라 패딩·gap은 안쪽에 둔다. `metrics`로 실제 행 높이(18px)와 헤더 높이(0 — 헤더는 앱이 그린다)를 알려줘야 스크롤이 덜 튄다.
- **지연 마운트**: 파일 섹션 본문은 `LazyDiffBody`가 IntersectionObserver로 스크롤 컨테이너(`.diff-files`) 근처에 올 때까지 마운트를 미룬다. 자리표시자 높이는 `estimateHunkRows()`로 어림한다. 한 번 보이면 계속 마운트해 둔다(다시 접으면 스크롤이 튄다). **주의**: 창이 가려져 `document.visibilityState`가 `hidden`이면 브라우저가 IntersectionObserver 전달을 멈춘다 — 창을 앞으로 가져오면 그때 마운트된다.
- **컨텍스트 확장**: patch만으로 만든 diff는 `isPartial`이라 patch에 담긴 줄 밖으로 확장할 수 없다. `options.loadDiffFiles`를 넘기면 라이브러리가 확장 버튼을 노출하고, 사용자가 눌렀을 때만 원본을 요청한다. 로더는 `getFileContents` IPC로 두 리비전의 전문을 가져온다 — 어느 리비전인지는 `DiffPane`의 `revisions` prop(`DiffRevisions`)으로 받는다(unstaged는 `:0`→워킹 트리, staged는 `HEAD`→`:0`, 커밋은 `<hash>^`→`<hash>`).

## 데이터 흐름

1. 렌더러가 IPC로 요청 (예: "이 저장소의 status", "이 커밋의 diff")
2. 메인 프로세스가 해당 워킹 디렉토리에서 git 명령 실행
   - 워크트리 목록: `git worktree list --porcelain`
   - 작업 상태: `git status --porcelain=v2`
   - 히스토리: `git log` (포맷 지정)
   - diff: `git diff`, `git diff --cached`, `git show`
3. 출력을 파싱해 구조화된 객체로 렌더러에 반환
4. 렌더러가 diff 텍스트를 파일 단위로 쪼개 `@pierre/diffs`로 렌더링

## 기술적 제약 / 원칙

- git 저장소 접근은 전부 메인 프로세스에서만 한다. 렌더러는 `nodeIntegration` 없이 contextBridge로 노출된 typed API만 사용한다.
- git 바인딩 라이브러리(nodegit 등)를 쓰지 않는다. 이유는 [DESIGN.md](DESIGN.md)의 의사결정 참고.
- 외부 네트워크 의존성이 없다. 로컬 파일시스템과 git CLI만 사용한다.

## 배포

- `npm run package` → electron-vite 빌드 후 electron-builder(`electron-builder.yml`)가 `release/`에 DiffScope.app·dmg·zip 생성 (arm64).
- 서명 인증서가 없어 `scripts/adhoc-sign.cjs`(afterPack 훅)로 번들 전체를 ad-hoc 서명한다.
- `app.setName("diff-scope")`로 dev/패키징의 userData 경로를 동일하게 유지한다.

## 외부 의존성

- 시스템에 설치된 `git` 실행 파일 (필수)
