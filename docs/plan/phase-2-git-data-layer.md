# Phase 2: Git 데이터 계층 계획

## 목표

메인 프로세스에서 git CLI를 실행해 앱이 필요로 하는 데이터(status, worktree, log, diff)를 구조화된 형태로 제공하고, 저장소 목록을 영속화하며, 이를 typed IPC로 렌더러에 노출한다.

## 모듈 구성

```
src/shared/git.ts            # 렌더러와 공유하는 타입 (RepoStatus, Worktree, CommitInfo, ...)
src/main/git/exec.ts         # git CLI 실행 래퍼 (runGit) + GitError
src/main/git/status.ts       # git status --porcelain=v2 -z 파서 + 조회
src/main/git/worktree.ts     # git worktree list --porcelain -z 파서 + 조회
src/main/git/log.ts          # git log (구분자 포맷) 파서 + 조회
src/main/git/diff.ts         # working/staged/untracked/commit diff 원문 조회
src/main/git/repository.ts   # 경로 → 저장소 루트 해석 (rev-parse)
src/main/store/repositories.ts  # 등록된 저장소 목록 JSON 영속화
```

## 세부 결정

- **실행 래퍼**: `execFile("git", args, { cwd })` 기반. 실패 시 명령·종료 코드·stderr를 담은 `GitError`를 던진다. `git diff --no-index`처럼 정상 상황에서 종료 코드 1을 내는 명령을 위해 `allowExitCodes` 옵션을 둔다.
- **파싱 안정성**: 경로에 공백·특수문자가 있어도 깨지지 않도록 status와 worktree는 `-z`(NUL 구분) 출력을 파싱한다. log는 필드 구분자 `%x1f`, 레코드 구분자 `%x1e` 커스텀 포맷을 쓴다.
- **status 모델**: porcelain v2의 XY 코드를 staged/unstaged로 분리해 담고, 브랜치 헤더(`# branch.*`)에서 브랜치·upstream·ahead/behind를 읽는다. rename(`2`), unmerged(`u`), untracked(`?`) 레코드를 모두 처리한다.
- **빈 저장소**: 커밋이 없는 저장소에서 `git log`가 실패하면 빈 배열을 반환한다.
- **diff는 원문 텍스트로 반환**: 파싱/렌더링은 Phase 3에서 `@git-diff-view`가 담당한다. untracked 파일은 `git diff --no-index /dev/null <path>`로 diff를 만든다.
- **저장소 스토어**: `userData/repositories.json`에 `{ path, name }` 목록을 저장한다. 경로 검증은 스토어가 아니라 IPC 핸들러에서 `git rev-parse --show-toplevel`로 한다. 파일이 없거나 깨져 있으면 빈 목록으로 취급한다.
- **IPC**: 채널 상수를 `src/shared/ipc.ts`에 추가하고, preload의 `window.diffScope`에 typed 메서드로 노출한다.

## 테스트 전략

- 파서는 실제 git 출력을 본뜬 fixture 문자열로 검증한다 (정상, rename, unmerged, untracked, detached HEAD, 빈 출력 등).
- 실행 래퍼·조회 함수는 `node:child_process` 또는 `runGit`을 mock 해서 인자 구성과 오류 처리 계약만 검증한다. 실제 git 실행은 테스트하지 않는다.
- 스토어는 임시 디렉토리의 실제 파일로 round-trip을 검증한다.
- IPC 핸들러와 preload API는 electron mock으로 채널-함수 연결을 검증한다.

## 완료 기준

- 위 모듈이 전부 테스트와 함께 구현되고 quality gate를 통과한다.
- 렌더러에서 `window.diffScope`로 저장소 등록 → status/worktree/log/diff 조회가 타입 안전하게 가능하다 (UI는 Phase 3).

## 열린 질문

- diff 원문이 매우 클 때(수만 라인)의 IPC 전송 한계 — Phase 3에서 렌더링 성능과 함께 검토
