# TESTS

## 실행 방법

```sh
npm test          # vitest run
```

Vitest, node 환경, `src/**/*.test.ts` 패턴.

## 테스트 현황

| 테스트 파일                              | 대상                                                            | 검증 범위                                                                                                                                    |
| ---------------------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/main/ipc.test.ts`                   | `registerIpcHandlers`                                           | 모든 IPC 채널 등록, 저장소 추가 시 루트 해석 후 스토어 위임, git 조회 인자 위임 (electron/git 모듈 mock)                                     |
| `src/preload/index.test.ts`              | preload API                                                     | `diffScope`의 모든 메서드가 대응하는 IPC 채널을 올바른 인자로 invoke 하는지 (electron mock)                                                  |
| `src/main/git/exec.test.ts`              | `runGit`, `GitError`                                            | 인자/cwd 전달, 실패 시 종료 코드·stderr를 담은 GitError, `allowExitCodes`, git 실행 불가(ENOENT) 처리 (child_process mock)                   |
| `src/main/git/status.test.ts`            | `parseStatusPorcelainV2`                                        | 브랜치 헤더(ahead/behind, detached, initial), 일반 변경(XY 분리, 공백 경로), rename(원본 경로), unmerged, untracked, ignored 무시, 빈 출력   |
| `src/main/git/worktree.test.ts`          | `parseWorktreeList`                                             | 메인/연결 워크트리, branch 프리픽스 제거, detached/bare/locked, 빈 출력, 마지막 구분자 누락                                                  |
| `src/main/git/log.test.ts`               | `logArgs`, `parseLog`, `getLog`                                 | 인자 구성(limit/ref), 부모 커밋·여러 줄 body 파싱, 빈 출력, 빈 저장소는 빈 배열, 그 외 GitError 재던짐 (runGit mock)                         |
| `src/main/git/diff.test.ts`              | `getWorkingDiff`, `getCommitDiff`                               | unstaged/staged/경로 한정/untracked(no-index, exit 1 허용) 인자 구성, path 없는 untracked 요청 거부 (runGit mock)                            |
| `src/main/store/repositories.test.ts`    | `RepositoryStore`                                               | 파일 없음→빈 목록, 추가/영속화/재로드, 중복 경로 무시, 삭제, 깨진 JSON은 빈 목록 취급 (임시 디렉토리 실제 파일)                              |
| `src/renderer/src/lib/parseDiff.test.ts` | `parseUnifiedDiff`                                              | 여러 파일 분할, 신규/삭제/rename/바이너리/모드만 변경, hunk 추출·라인 카운트(countHunkLines), quoted 경로 해제, 빈 diff                      |
| `src/renderer/src/lib/status.test.ts`    | `groupStatusEntries`                                            | staged/unstaged 분리, 부분 스테이징 양쪽 표시, untracked/unmerged는 unstaged 섹션 배치                                                       |
| `src/main/git/numstat.test.ts`           | `parseNumstat`, `numstatArgs`                                   | 일반/공백 경로, rename 토큰, 바이너리 null, 빈 출력, staged 인자, 조회 위임 (runGit mock)                                                    |
| `src/renderer/src/lib/format.test.ts`    | `splitPath`, `shortenPath`, `relativeDate`                      | 경로 분리, 절대 경로 축약, 오늘/어제/n일 전/로컬 날짜/잘못된 입력                                                                            |
| `src/main/sessions/encode.test.ts`       | `encodeProjectDir`, `normalizePath`                             | cwd→프로젝트 디렉토리 인코딩(`/`·`.`→`-`, 숨김 워크트리 이중 대시), 끝 슬래시 정규화                                                         |
| `src/main/sessions/state.test.ts`        | `resolveState`                                                  | running > deleted > archived > active 우선순위 판정                                                                                          |
| `src/main/sessions/running.test.ts`      | `parseRunningSession`                                           | pid 파일 파싱, cwd/entrypoint 기본값, 필수 필드/잘못된 JSON 시 null                                                                          |
| `src/main/sessions/claudeStore.test.ts`  | `parseClaudeMeta`                                               | 데스크톱 세션 메타 파싱(isArchived 문자열, lastActivity/createdAt fallback, 빈 branch→null), cliSessionId 없으면 null                        |
| `src/main/sessions/codex.test.ts`        | `parseCodexHead`, `parseSessionIndex`, `parseLsofOpenPaths`     | rollout head 파싱(cwd/id/제목), 서브 에이전트 스레드 제외(thread_source/source.subagent), session_index 맵(불량 라인 무시), lsof n-라인 추출 |
| `src/main/sessions/transcripts.test.ts`  | `deriveTitle`                                                   | 첫 user 텍스트 메시지 제목(첫 줄·트림), 문자열 content, tool_result 건너뜀, 없으면 null                                                      |
| `src/renderer/src/lib/session.test.ts`   | `groupSessionsByDir`, `countSessions`, `stateLabel`, `isDimmed` | cwd별 그룹핑(끝 슬래시 무시), total/running/live 카운트, 상태 한글 라벨, 아카이브/삭제 dim 판정                                              |

## 테스트 방침

- 주요 테스트 대상은 **git 출력 파서**(status, worktree, log, diff)다. 실제 git 출력을 본뜬 fixture로 파싱 결과를 검증한다.
- git CLI 실행 자체(외부 의존성)는 테스트하지 않는다. 실행 래퍼는 mock/fixture로 입력·출력·오류 처리 계약만 검증한다.
- IPC 계층은 typed API의 입출력 계약을 electron mock으로 검증한다.

## 미검증 영역

- Electron 창 생성/생명주기 (`src/main/index.ts`) — 단위 테스트 대상이 아니며 `npm run dev` 구동 확인으로 대체
- 렌더러 컴포넌트 (`src/renderer/src/components/`, `App.tsx`) — 순수 로직은 `lib/`로 분리해 테스트하고, 화면은 실행(CDP 스크린샷)으로 검증. 컴포넌트 테스트(jsdom)는 UI가 안정화되면 도입 검토
- `selectDirectory`의 실제 macOS 다이얼로그 동작 — 핸들러 계약은 mock으로 검증, 네이티브 다이얼로그는 수동 확인 필요
- 실제 git 바이너리와의 통합 — fixture가 실제 출력 형식과 맞는지는 수동으로 확인 (2026-07-11, status/worktree/log 형식 대조)
