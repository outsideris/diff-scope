# TODO

## Phase 0: 프로젝트 결정 및 문서화

- [x] 기술 스택 결정 (Electron + React + Vite + @git-diff-view/react + Shiki, git CLI) — [DESIGN.md](DESIGN.md)
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

## Phase 3: UI

- [ ] 저장소/워크트리 전환 UI
- [ ] 작업 상태 화면 (staged/unstaged 파일 목록 + diff)
- [ ] 커밋 히스토리 탐색 화면
- [ ] diff 뷰 (unified/split 전환, 문법 강조)

각 Phase를 시작할 때 `docs/plan/`에 상세 계획 문서를 만들고 여기에 링크한다.
