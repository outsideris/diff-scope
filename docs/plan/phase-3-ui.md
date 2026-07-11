# Phase 3: UI 계획

## 목표

저장소/워크트리를 오가며 작업 상태(staged/unstaged/untracked)와 커밋 히스토리를 탐색하고, GitHub 스타일 diff를 보는 화면을 완성한다.

## 화면 구조

```
┌────────────┬───────────────────────────────────────┐
│ Sidebar    │ Toolbar: 현재 위치, [Working|History]  │
│  저장소 목록├────────────┬──────────────────────────┤
│  ├ 워크트리 │ 파일 목록   │ diff 뷰                  │
│  + 추가    │ / 커밋 목록 │ (unified/split 전환)     │
└────────────┴────────────┴──────────────────────────┘
```

- **Sidebar**: 등록된 저장소 목록. 각 저장소 아래에 워크트리를 펼쳐 보여주고, 선택하면 해당 워킹 디렉토리 기준으로 오른쪽 화면이 바뀐다. 저장소 추가는 macOS 디렉토리 선택 다이얼로그(`dialog.showOpenDialog`, IPC 채널 추가)로 한다.
- **Working 뷰**: `getStatus` 결과를 Staged / Changes(unstaged + untracked) 두 섹션으로 나눠 파일 목록을 보여준다. 파일을 선택하면 해당 diff(staged는 `--cached`, untracked는 no-index)를 오른쪽에 렌더링한다.
- **History 뷰**: `getLog` 커밋 목록(제목, 짧은 해시, 작성자, 날짜). 커밋을 선택하면 해당 커밋의 diff를 렌더링한다.
- **Diff 뷰**: `@git-diff-view/react`의 `DiffView`. unified/split 토글, 문법 강조. git diff 원문(여러 파일)을 파일 단위로 쪼개는 파서(`parseUnifiedDiff`)를 렌더러 쪽 순수 함수로 구현한다.

## 세부 결정

- 상태 관리는 React `useState`/커스텀 훅으로 충분하다. 별도 라이브러리를 넣지 않는다.
- 데이터 갱신은 저장소/뷰 전환 시 재조회 + 수동 새로고침 버튼. 파일 시스템 감시(자동 갱신)는 후속 Phase로 미룬다.
- 문법 강조는 `@git-diff-view` 계열이 제공하는 highlighter를 쓰되, Shiki 연동(`@git-diff-view/shiki`)이 안정적으로 동작하면 그걸 쓴다. 설치 후 실제 API를 확인하고 결정한다.
- 렌더러 컴포넌트 테스트(jsdom)는 이번 Phase에서 도입하지 않는다. 순수 로직(diff 파서, status 그룹핑)만 단위 테스트하고, 화면은 실행으로 검증한다.

## 완료 기준

- 저장소를 추가하고 워크트리를 선택해서 오갈 수 있다.
- Working 뷰에서 staged/unstaged/untracked 파일 목록과 각 파일의 diff를 볼 수 있다.
- History 뷰에서 커밋 목록을 탐색하고 커밋 diff를 볼 수 있다.
- diff 뷰에서 unified/split을 전환할 수 있고 문법 강조가 된다.
- quality gate 전 항목 통과, 실제 앱 구동으로 화면 확인.

## 구현 결과 (2026-07-12 완료)

- 계획한 화면 구조 그대로 구현했다. 컴포넌트: `Sidebar`, `WorkingView`, `HistoryView`, `DiffPane` + 순수 로직 `lib/parseDiff.ts`, `lib/status.ts`, `lib/lang.ts`, `lib/useAsync.ts`.
- **diff 렌더링에서 배운 것**: `@git-diff-view/react`의 `data.hunks`에 `@@` 이후 hunk 텍스트만 넘기면 라인이 렌더링되지 않는다. `diff --git`/`---`/`+++` 헤더를 포함한 **파일 섹션 전체 원문**을 넘겨야 한다 (`FileDiff.raw` 필드). CDP로 실제 화면을 캡처하며 발견해 수정했다.
- 문법 강조는 `@git-diff-view/shiki`의 `getDiffViewHighlighter()`를 `DiffView`의 `registerHighlighter` prop으로 연결했다 (모듈 싱글턴 promise로 1회 로드).
- 테마는 `prefers-color-scheme` 감지로 라이트/다크를 자동 적용한다 (CSS 변수 + `diffViewTheme`).
- 저장소 추가용 `selectDirectory` IPC 채널(`dialog.showOpenDialog`)을 추가했다.
- 검증: 실제 저장소를 등록해 CDP 스크린샷으로 Working 뷰(staged/changes 목록, 상태 코드), untracked no-index diff, Unified/Split 전환, History 뷰(커밋 목록·상세·15개 파일 diff, word-level 하이라이트), 임시 워크트리를 만들어 워크트리 전환까지 확인했다.

## 열린 질문

- 대용량 diff의 렌더링 성능 — package-lock.json 같은 큰 diff에서 렌더링이 느릴 수 있다 (Phase 4에서 가상 스크롤/지연 렌더링 검토)
- 파일 시스템 감시 기반 자동 새로고침 (Phase 4 후보)
