# TODO

## Phase 0: 프로젝트 결정 및 문서화

- [x] 기술 스택 결정 (Electron + React + Vite + @pierre/diffs, git CLI) — [DESIGN.md](DESIGN.md). 2026-08-08에 diff 렌더러를 `@git-diff-view/react` → `@pierre/diffs`로 교체
- [x] git 저장소 초기화 및 문서 구조 생성

## Phase 1: 스캐폴딩 — [계획](plan/phase-1-scaffolding.md) ✅

- [x] Electron + Vite + React + TypeScript 프로젝트 스캐폴딩 (electron-vite)
- [x] oxlint + oxfmt 설정
- [x] 테스트 러너 설정 (Vitest)
- [x] IPC 계층 골격 (contextBridge, typed API)
- [x] QUALITY_GATE.md를 실제 스크립트에 맞게 갱신

## Phase 2: Git 데이터 계층 — [계획](plan/phase-2-git-data-layer.md) ✅

- [x] git CLI 실행 래퍼 및 오류 처리 (`runGit`/`GitError`)
- [x] `git status --porcelain=v2` 파서 (staged/unstaged 구분)
- [x] `git worktree list --porcelain` 파서
- [x] `git log` 파서 (히스토리 목록)
- [x] diff 출력 획득 (`git diff`, `git diff --cached`, untracked, `git show`)
- [x] 저장소 등록/목록 관리 및 설정 저장 (`RepositoryStore`)
- [x] IPC 채널·preload typed API로 렌더러에 노출

## Phase 3: UI — [계획](plan/phase-3-ui.md) ✅

- [x] 저장소/워크트리 전환 UI (사이드바, 디렉토리 선택 다이얼로그로 저장소 추가)
- [x] 작업 상태 화면 (staged/unstaged/untracked 파일 목록 + diff)
- [x] 커밋 히스토리 탐색 화면 (커밋 목록 + 커밋 상세 + diff)
- [x] diff 뷰 (unified/split 전환, Shiki 문법 강조, 라이트/다크 테마)

## Phase 5: 워크트리 연결 세션 표시 — [계획](plan/phase-5-sessions.md) ✅

- [x] 세션 데이터 계층 (Claude 데스크톱 저장소·실행 중·전사, Codex 롤아웃 스캔·병합)
- [x] 세션 상태 판정 (실행 중 / 활성 / 아카이브 / 삭제)
- [x] `getSessions(worktreePaths)` IPC
- [x] 사이드바 세션 목록 UI (앱 아이콘, 상태, 제목, 시간, 아카이브 토글)

## Phase 6: 갱신 비용 절감 + fs 감시 푸시 — [계획](plan/phase-6-auto-refresh.md) ✅

- [x] mtime 캐시 (`FileCache`) — Codex 롤아웃 head·session_index, Claude 데스크톱 메타, CLI 전사 제목 파싱 재사용
- [x] lsof TTL 캐시 (`TtlCache`, 45초) — 대상 파일 목록이 바뀌면 즉시 재실행
- [x] fs 감시 (`SidebarWatcher`) — 세션 소스 4곳 + 등록된 워크트리, 디바운스 500ms/최소 간격 3초
- [x] 메인 → 렌더러 푸시 (`diff-scope:sidebar-changed`) + 워크트리 감시 목록 동기화 IPC
- [x] 폴링을 120초 안전망으로 완화, 창 복귀 시 즉시 1회 갱신

## Phase 4 후보 (미정)

- [x] 사이드바 자동 새로고침 — 30초 주기 폴링 (2026-07-19). Phase 6에서 fs 감시 푸시로 전환하고 폴링은 120초 안전망으로 완화
- [x] 대용량 diff 렌더링 성능 (2026-08-08) — 파일 단위 지연 마운트(26파일 커밋에서 3개만 마운트) + `@pierre/diffs`의 `<Virtualizer>`로 줄 단위 가상화(3,770줄 파일에서 약 200행만 렌더)
- [ ] Working 뷰 파일 목록도 fs 감시 푸시에 반응시키기 — Phase 6는 사이드바만 갱신해서, 파일을 만들면 사이드바 dirty 배지는 바로 늘지만 중앙 CHANGES 목록은 ⟳를 눌러야 반영된다 (`WorkingView`의 `useAsync`가 별도 경로)
- [ ] 브랜치/태그 선택 후 히스토리 조회, 커밋 범위 비교
- [x] dmg 패키징 (electron-builder) — 2026-07-19 완료, `npm run package`

각 Phase를 시작할 때 `docs/plan/`에 상세 계획 문서를 만들고 여기에 링크한다.
