# diff-scope

Git 워킹 디렉토리, 워크트리, 커밋 히스토리를 오가며 코드 변경사항을 쉽게 볼 수 있는 macOS용 diff viewer 앱.

Claude Code, ChatGPT 같은 코딩 에이전트로 작업하다 보면 여러 워크트리와 브랜치에서 동시에 변경이 쌓이는데, 이를 터미널에서 일일이 확인하기 어렵다. diff-scope는 GitHub 스타일의 익숙한 diff 화면으로 이런 변경사항을 한곳에서 탐색하는 개인 도구다.

## 주요 기능

- 등록된 저장소와 워크트리를 오가며 diff 보기 (디렉토리 다이얼로그로 저장소 등록, 워크트리 자동 발견)
- 커밋 히스토리를 따라 이동하며 이전 커밋의 변경 내역 보기
- 아직 커밋되지 않은 변경(unstaged/untracked)과 스테이징된(staged) 파일 목록 및 diff 보기
- GitHub 스타일 diff 렌더링 (unified/split 전환, word-level 하이라이트, Shiki 문법 강조, 라이트/다크 테마)

## 기술 스택

- **Electron** + **React** + **Vite** (TypeScript)
- diff 렌더링: `@pierre/diffs` (문법 강조 Shiki 내장)
- Git 접근: 메인 프로세스에서 `git` CLI 실행 후 출력 파싱
- 린트/포맷: oxlint + oxfmt

자세한 구조는 [docs/ARCHITECURE.md](docs/ARCHITECURE.md), 기획 의도와 결정 배경은 [docs/DESIGN.md](docs/DESIGN.md) 참고.

## 빌드 / 실행

시스템에 `git`이 설치되어 있어야 한다.

```sh
npm install        # 의존성 설치
npm run dev        # 개발 모드로 앱 실행
npm run build      # 프로덕션 빌드 (out/)
npm run package    # DiffScope.app + dmg/zip 패키징 (release/)
```

## 설치 / 배포

`npm run package`가 `release/`에 다음을 생성한다 (Apple Silicon):

- `release/mac-arm64/DiffScope.app` — 바로 실행 가능한 앱 (로컬 설치는 이 번들을 `/Applications`로 복사)
- `release/DiffScope-<버전>-arm64.dmg` — 다른 Mac에 배포용
- `release/DiffScope-<버전>-arm64-mac.zip` — 압축 배포용

코드 서명 인증서 없이 **ad-hoc 서명**으로 빌드되므로, 다른 Mac에서 처음 열 때는
Gatekeeper 경고가 나온다. **앱을 우클릭 → 열기**로 한 번 통과시키거나 터미널에서
`xattr -dr com.apple.quarantine /Applications/DiffScope.app`를 실행한다.

앱 이름은 DiffScope이지만 설정 저장 경로는 개발 모드와 동일하게
`~/Library/Application Support/diff-scope/`를 사용하므로 등록한 저장소 목록이 이어진다.

## 검증

```sh
npm test              # 테스트 (Vitest)
npm run typecheck     # 타입 체크 (main/preload + renderer)
npm run lint          # 린트 (oxlint)
npm run format:check  # 포맷 검사 (oxfmt)
```

커밋 전 확인 항목은 [docs/QUALITY_GATE.md](docs/QUALITY_GATE.md) 참고.

## 라이선스

MIT — [LICENSE](LICENSE) 참고.
