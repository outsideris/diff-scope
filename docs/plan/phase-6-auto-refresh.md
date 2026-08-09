# Phase 6: 갱신 비용 절감 + fs 감시 푸시 계획

## 목표

사이드바 갱신을 "30초 폴링 전체 재스캔"에서 "변경 즉시 푸시 + 저비용 재스캔"으로 바꾼다.
실측 기준 1회 갱신 비용의 지배 요소는 lsof(0.4초)와 Codex 롤아웃 265개 head 재읽기였다.

## 1. mtime 캐시 (`src/main/sessions/cache.ts`)

- `FileCache<T>`: 파일 mtime+size가 같으면 파서를 건너뛰고 이전 결과 재사용. stat 실패(삭제)는 null 반환 + 항목 제거. `retain(paths)`로 이번 스캔에 없는 항목을 정리해 무한 성장을 막는다.
- 적용 대상:
  - Codex 롤아웃 head 파싱 (파일별, subagent 판정 null도 캐시)
  - Codex `session_index.jsonl` 파싱
  - Claude 데스크톱 메타(`local_*.json`) 파싱 — cwd 필터 전 단계를 캐시해 워크트리 목록이 바뀌어도 안전
  - CLI 전용 세션 전사 제목 유추 (append로 mtime이 바뀌면 재유추 — 제목은 첫 메시지라 결과 동일)
- git status는 워킹 트리 상태라 파일 캐시 부적합 — 워크트리당 ~10ms로 저렴해 그대로 둔다.

## 2. lsof TTL 캐시

- `TtlCache<T>`(주입 가능한 clock): 같은 대상 파일 목록(key)에 대해 45초 안에는 lsof를 다시 실행하지 않는다.
- 파일 목록이 바뀌면(새 세션 rollout 등장 등) key가 달라져 즉시 재실행 — 새 실행 중 세션은 빨리 반영되고, 세션 종료(목록 불변)는 최대 TTL만큼 늦게 반영된다.

## 3. fs 감시 푸시 (`src/main/watcher.ts`)

- macOS FSEvents 기반 `fs.watch(recursive)`로 감시:
  | 소스                   | 반응 규칙                                                                                        |
  | ---------------------- | ------------------------------------------------------------------------------------------------ |
  | `~/.claude/projects`   | `rename`된 `.jsonl`만 (전사 생성/삭제). append(`change`)는 무시                                  |
  | `~/.claude/sessions`   | `.json` 모든 이벤트 (실행 중 pid 파일 추가/제거)                                                 |
  | Claude 데스크톱 스토어 | `local_*.json` 모든 이벤트 (아카이브 토글 등)                                                    |
  | `~/.codex`             | `session_index.jsonl` 변경, `rollout-*.jsonl`의 `rename`만 (append 무시)                         |
  | 각 워크트리(재귀)      | noisy 경로(node_modules, .git/objects·logs, out, release, dist, coverage, .DS_Store) 제외한 전부 |
- `Debouncer`: trailing 500ms + 최소 발화 간격 3초로 이벤트 폭주(빌드, 스트리밍 응답)를 흡수.
- 메인 → 렌더러 푸시: `diff-scope:sidebar-changed` webContents 이벤트. 렌더러는 in-flight 가드 + pending 재실행으로 병합.
- 워크트리 목록이 바뀌면 렌더러가 `syncWatchedWorktrees(paths)`로 감시 대상을 동기화.
- 폴링은 제거하지 않고 **120초 안전망**으로 완화 (FSEvents 유실·lsof TTL 지연 보정). 창이 다시 보일 때(visibilitychange) 즉시 1회 갱신해 숨김 동안의 공백을 메운다.

## 완료 기준

- 파일 변경(untracked 생성 등) 후 수 초 안에 사이드바가 갱신된다 (폴링 대기 없이).
- 반복 갱신 시 Codex 롤아웃/메타 파일을 다시 읽지 않는다 (mtime 캐시 적중).
- lsof가 45초에 1회 이하로 실행된다 (대상 목록이 같을 때).
- quality gate 통과, 실제 화면 검증.

## 비고

- fs.watch recursive는 macOS(FSEvents)에서 안정적 — 이 앱은 macOS 전용이라 플랫폼 분기 불필요.
- 세션 종료 감지(파일 목록 불변 + 프로세스만 종료)는 이벤트가 없어 안전망 폴링에 의존한다. lsof TTL이 만료돼도 그것만으로는 재평가가 트리거되지 않으므로 **실질 지연 상한은 45초가 아니라 폴링 주기(120초)** 다. 폴링 비용이 캐시로 낮아진 대신 이 지표만 이전(30초 폴링)보다 늦어지는 절충이다.
- `rename` 필터는 완전하지 않다. macOS FSEvents는 갓 생성된 파일의 append도 약 10~15초간 rename으로 보고해서, 새 세션 직후에는 몇 번 더 갱신된다. 디바운스가 비용을 흡수한다.
- 워크트리 noisy 필터는 경로 이름 기반이라 `dist`/`out`/`release`/`coverage`를 실제로 추적하는 저장소는 해당 경로 변경이 안전망 폴링까지 늦게 반영된다. monorepo의 빌드 폭주를 막는 쪽을 택한 절충이다.
- 실행 시점에 없던 소스 디렉토리(Codex 미설치 등)는 `syncWorktrees`가 호출될 때마다 다시 시도한다 — 렌더러가 갱신마다 호출하므로 별도 재시도 타이머가 필요 없다.
