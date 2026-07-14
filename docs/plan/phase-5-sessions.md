# Phase 5: 워크트리 연결 세션 표시 계획

## 목표

각 워크트리(및 브랜치)에서 작업한 코딩 에이전트 세션(Claude Code, Codex)을 사이드바에 표시한다. 한 워크트리에 여러 세션이 있을 수 있고, 각 세션의 상태(실행 중 / 활성 / 아카이브 / 삭제)와 앱 종류를 함께 보여준다.

## 데이터 소스 (macOS 로컬, 조사 완료 2026-07-14)

| 소스                        | 경로                                                                                    | 제공 정보                                                                                                                |
| --------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Claude 데스크톱 세션 저장소 | `~/Library/Application Support/Claude/claude-code-sessions/<ws>/<proj>/local_<id>.json` | `cliSessionId`, `cwd`/`originCwd`/`worktreePath`, `branch`, `title`, `isArchived`, `createdAt`/`lastActivityAt`, `model` |
| Claude 실행 중 세션         | `~/.claude/sessions/<pid>.json`                                                         | `pid`, `sessionId`, `cwd`, `entrypoint` — PID 생존 시 "실행 중"                                                          |
| Claude CLI 전사             | `~/.claude/projects/<encoded-cwd>/<id>.jsonl`                                           | 전사 존재 여부(삭제 판정), 데스크톱 메타 없는 세션의 제목/cwd 유추                                                       |
| Codex 롤아웃                | `~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl` (첫 줄)                                  | `payload.cwd`, `payload.id`, `originator`                                                                                |

- **경로 인코딩**: `~/.claude/projects`의 디렉토리명은 cwd에서 `/`→`-`, `.`→`-` 치환. 워크트리 경로 → 디렉토리명으로 역산해 해당 워크트리의 전사 목록을 얻는다.
- **주의**: 위 형식은 공식 API가 아니라 내부 구현이다. 파서는 방어적으로(필드 없으면 조용히 생략), 큰 jsonl은 head만 읽는다.

## 세션 상태 판정 (우선순위)

1. **running**: 살아있는 pid 파일에 sessionId 일치
2. **deleted**: 데스크톱 메타는 있으나 전사 jsonl 없음
3. **archived**: 메타 `isArchived === true`
4. **active**: 그 외 (전사 존재, 미아카이브)

## 모듈 구성

```
src/shared/session.ts             # SessionInfo, SessionApp, SessionState 타입
src/main/sessions/encode.ts       # encodeProjectDir(cwd) — 경로 인코딩 (순수)
src/main/sessions/running.ts      # parseRunningSession(순수) + readRunningSessions(fs)
src/main/sessions/claudeStore.ts  # parseClaudeMeta(순수) + readClaudeStore(fs)
src/main/sessions/codex.ts        # parseCodexHead(순수) + readCodexSessions(fs)
src/main/sessions/transcripts.ts  # deriveTitle(순수) + 전사 인덱싱(fs)
src/main/sessions/state.ts        # resolveState(순수)
src/main/sessions/collect.ts      # collectSessionsForWorktrees(paths) 오케스트레이션
```

- IPC 채널 `getSessions(worktreePaths: string[])` → cwd가 주어진 워크트리 경로와 일치하는 세션만 반환.

## UI

- 각 워크트리 행을 펼치면(디스클로저) 그 워크트리의 세션 목록을 보여준다. 세션 개수 배지.
- 세션 행: 앱 아이콘(Claude/Codex), 상태 표시(실행 중=액센트 점, 아카이브=흐리게+배지, 삭제=취소선), 제목, 상대 시간.
- 정렬: 실행 중 → 최근 활동 순.
- 아카이브/삭제 세션은 워크트리별 토글로 표시/숨김. 펼침·토글 상태는 localStorage.

## 완료 기준

- 등록된 저장소의 각 워크트리 아래에 연결된 Claude/Codex 세션이 상태와 함께 표시된다.
- 실행 중 세션(이 앱을 띄운 세션 포함)이 실시간에 가깝게 표시된다.
- 아카이브·삭제 세션이 시각적으로 구분된다.
- quality gate 통과, 실제 화면 검증.

## 열린 질문 / 비고

- ChatGPT 데스크톱 앱: 대화가 로컬에 없어 연결 불가 — 범위 제외.
- 세션 클릭 시 동작(재개 명령 복사/터미널 열기)은 후속 작업 후보.
- 세션 스캔 결과 캐시와 새로고침 주기.
