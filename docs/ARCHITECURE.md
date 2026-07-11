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
│  - diff 뷰 (@git-diff-view/react + Shiki)│
└─────────────────────────────────────────┘
```

## 기술 스택

| 영역 | 선택 |
|---|---|
| 셸 | Electron |
| 프론트엔드 | React + Vite (TypeScript) |
| diff 렌더링 | `@git-diff-view/react` |
| 문법 강조 | Shiki |
| Git 접근 | git CLI 실행 (`child_process`) + 출력 파싱 |
| 린트/포맷 | oxlint + oxfmt |

## 데이터 흐름

1. 렌더러가 IPC로 요청 (예: "이 저장소의 status", "이 커밋의 diff")
2. 메인 프로세스가 해당 워킹 디렉토리에서 git 명령 실행
   - 워크트리 목록: `git worktree list --porcelain`
   - 작업 상태: `git status --porcelain=v2`
   - 히스토리: `git log` (포맷 지정)
   - diff: `git diff`, `git diff --cached`, `git show`
3. 출력을 파싱해 구조화된 객체로 렌더러에 반환
4. 렌더러가 diff 텍스트를 `@git-diff-view/react`로 렌더링

## 기술적 제약 / 원칙

- git 저장소 접근은 전부 메인 프로세스에서만 한다. 렌더러는 `nodeIntegration` 없이 contextBridge로 노출된 typed API만 사용한다.
- git 바인딩 라이브러리(nodegit 등)를 쓰지 않는다. 이유는 [DESIGN.md](DESIGN.md)의 의사결정 참고.
- 외부 네트워크 의존성이 없다. 로컬 파일시스템과 git CLI만 사용한다.

## 외부 의존성

- 시스템에 설치된 `git` 실행 파일 (필수)
