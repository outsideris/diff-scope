/**
 * cwd를 `~/.claude/projects` 아래의 디렉토리명으로 인코딩한다.
 * Claude Code는 경로의 `/`와 `.`을 모두 `-`로 치환한다.
 * (예: `/a/b/.claude/wt` → `-a-b--claude-wt`)
 *
 * 이 인코딩은 손실적(`/x-y`와 `/x/y`가 충돌)이지만, 알려진 워크트리
 * 경로에서 디렉토리명을 한 방향으로 구하는 용도로는 충분하다.
 */
export function encodeProjectDir(cwd: string): string {
  return cwd.replace(/[/.]/g, "-");
}

/** 경로 끝의 슬래시를 제거해 비교 가능한 형태로 정규화한다. */
export function normalizePath(path: string): string {
  return path.replace(/\/+$/, "");
}
