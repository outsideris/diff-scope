# TESTS

## 실행 방법

```sh
npm test          # vitest run
```

Vitest, node 환경, `src/**/*.test.ts` 패턴.

## 테스트 현황

| 테스트 파일                     | 대상                              | 검증 범위                                                                                                                                  |
| ------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/main/ipc.test.ts`          | `registerIpcHandlers`             | ping 핸들러가 올바른 채널에 등록되고 pong을 반환하는지 (electron mock)                                                                     |
| `src/preload/index.test.ts`     | preload API                       | `diffScope` API가 contextBridge로 노출되고 `ping()`이 올바른 채널을 invoke 하는지 (electron mock)                                          |
| `src/main/git/exec.test.ts`     | `runGit`, `GitError`              | 인자/cwd 전달, 실패 시 종료 코드·stderr를 담은 GitError, `allowExitCodes`, git 실행 불가(ENOENT) 처리 (child_process mock)                 |
| `src/main/git/status.test.ts`   | `parseStatusPorcelainV2`          | 브랜치 헤더(ahead/behind, detached, initial), 일반 변경(XY 분리, 공백 경로), rename(원본 경로), unmerged, untracked, ignored 무시, 빈 출력 |
| `src/main/git/worktree.test.ts` | `parseWorktreeList`               | 메인/연결 워크트리, branch 프리픽스 제거, detached/bare/locked, 빈 출력, 마지막 구분자 누락                                                |
| `src/main/git/log.test.ts`      | `logArgs`, `parseLog`, `getLog`   | 인자 구성(limit/ref), 부모 커밋·여러 줄 body 파싱, 빈 출력, 빈 저장소는 빈 배열, 그 외 GitError 재던짐 (runGit mock)                       |
| `src/main/git/diff.test.ts`     | `getWorkingDiff`, `getCommitDiff` | unstaged/staged/경로 한정/untracked(no-index, exit 1 허용) 인자 구성, path 없는 untracked 요청 거부 (runGit mock)                          |

## 테스트 방침

- 주요 테스트 대상은 **git 출력 파서**(status, worktree, log, diff)다. 실제 git 출력을 본뜬 fixture로 파싱 결과를 검증한다.
- git CLI 실행 자체(외부 의존성)는 테스트하지 않는다. 실행 래퍼는 mock/fixture로 입력·출력·오류 처리 계약만 검증한다.
- IPC 계층은 typed API의 입출력 계약을 electron mock으로 검증한다.

## 미검증 영역

- Electron 창 생성/생명주기 (`src/main/index.ts`) — 단위 테스트 대상이 아니며 `npm run dev` 구동 확인으로 대체
- 렌더러 UI (`src/renderer/`) — 아직 실질 로직이 없어 테스트 없음. UI가 생기면 컴포넌트 테스트 도입 검토
- 실제 git 바이너리와의 통합 — fixture가 실제 출력 형식과 맞는지는 수동으로 확인 (2026-07-11, status/worktree/log 형식 대조)
