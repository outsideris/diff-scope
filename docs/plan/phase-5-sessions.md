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

## 구현 결과 (2026-07-15 완료)

- 데이터 계층(`src/main/sessions/`)과 사이드바 UI를 모두 구현했다. 실제 로컬 파일 대상 화면 검증 완료.
- **검증 결과**: 등록된 저장소(diff-scope, pulsebus, PodTrans, agent-engineering-history)의 워크트리별로 세션이 표시됨. 실행 중 세션 3개(diff-scope의 이 세션, PodTrans, right-rail 워크트리)가 모두 초록 점 + "실행 중" 배지로 감지됨. 아카이브 세션은 흐리게 + "아카이브" 배지, 활성은 밝게, Codex는 ○ 초록 / Claude는 ★ 주황으로 구분됨.
- 워크트리 행에 실행 중 점 + 세션 개수 배지(접힘 상태에서도 보임), 펼치면 세션 목록. 사이드바 헤더의 🗄 토글로 아카이브·삭제 표시/숨김(기본 숨김, "N개 숨김" 안내). 펼침 상태와 토글은 localStorage.
- **Working 뷰 세션 패널** (2026-07-15 추가): 워크트리 선택 시 Staged/Changes 아래에 SESSIONS 섹션으로 해당 워크트리의 세션(앱 아이콘·상태·제목·시간)을 표시한다. 아카이브 토글을 공유하며 `SessionList` 컴포넌트를 재사용한다.
- ~~Codex는 아카이브/삭제/실행 개념이 없어 항상 active로 표시(스코프 제한)~~ → 2026-07-18 해소: 아래 참조.

## Codex 실행 중·아카이브 감지 (2026-07-18 추가)

- **실행 중**: `codex` 프로세스가 열어 둔 rollout 파일을 `lsof -Fn`으로 감지한다 (등록 워크트리에 매칭된 비아카이브 세션 파일만 대상이라 빠름). lsof 실패/부재 시 빈 집합으로 조용히 강등.
- **아카이브**: `~/.codex/archived_sessions/`의 rollout은 archived 상태로 표시.
- **제목·최근 활동**: `~/.codex/session_index.jsonl`의 `thread_name`/`updated_at`이 있으면 첫 프롬프트 유추보다 우선한다.
- **앱 아이콘**: 별표·동그라미 대신 실제 브랜드 로고 사용 — Claude 스타버스트(simple-icons), OpenAI 블로섬(lobehub icons), 24x24 path 인라인. OpenAI 로고는 관례대로 흰 배경 + 검정 (2026-07-18).
- **서브 에이전트 필터** (2026-07-18): Codex 멀티 에이전트 모드의 서브 스레드(`thread_source: "subagent"` 또는 `source.subagent`)는 목록에서 제외한다. 메인 세션(`thread_source: "user"`)만 표시 — llm-usage 기준 41개 → 10개.

## 열린 질문 / 비고

- ChatGPT 데스크톱 앱: 대화가 로컬에 없어 연결 불가 — 범위 제외.
- 세션 클릭 시 동작(재개 명령 복사/터미널 열기)은 후속 작업 후보.
- 세션 스캔 결과 캐시와 새로고침 주기(현재는 저장소 새로고침 시 재스캔).
- ~~Codex 실행 중 감지 미지원~~ → 2026-07-18 lsof 방식으로 해결.
