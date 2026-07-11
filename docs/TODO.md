# TODO

## Phase 0: 프로젝트 결정 및 문서화

- [x] 기술 스택 결정 (Electron + React + Vite + @git-diff-view/react + Shiki, git CLI) — [DESIGN.md](DESIGN.md)
- [x] git 저장소 초기화 및 문서 구조 생성

## Phase 1: 스캐폴딩 — [계획](plan/phase-1-scaffolding.md)

- [ ] Electron + Vite + React + TypeScript 프로젝트 스캐폴딩
- [ ] oxlint + oxfmt 설정
- [ ] 테스트 러너 설정 (Vitest)
- [ ] IPC 계층 골격 (contextBridge, typed API)
- [ ] QUALITY_GATE.md를 실제 스크립트에 맞게 갱신

## Phase 2: Git 데이터 계층

- [ ] git CLI 실행 래퍼 및 오류 처리
- [ ] `git status --porcelain=v2` 파서 (staged/unstaged 구분)
- [ ] `git worktree list --porcelain` 파서
- [ ] `git log` 파서 (히스토리 목록)
- [ ] diff 출력 획득 (`git diff`, `git diff --cached`, `git show`)
- [ ] 저장소 등록/목록 관리 및 설정 저장

## Phase 3: UI

- [ ] 저장소/워크트리 전환 UI
- [ ] 작업 상태 화면 (staged/unstaged 파일 목록 + diff)
- [ ] 커밋 히스토리 탐색 화면
- [ ] diff 뷰 (unified/split 전환, 문법 강조)

각 Phase를 시작할 때 `docs/plan/`에 상세 계획 문서를 만들고 여기에 링크한다.
