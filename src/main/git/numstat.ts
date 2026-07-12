import type { NumstatEntry } from "../../shared/git";
import { runGit } from "./exec";

export function numstatArgs(staged: boolean): string[] {
  const args = ["diff", "--numstat", "-z", "--find-renames"];
  if (staged) args.push("--cached");
  return args;
}

/** 워킹 트리 변경의 파일별 추가/삭제 라인 수 (staged 여부 선택) */
export async function getWorkingNumstat(
  cwd: string,
  options: { staged?: boolean } = {},
): Promise<NumstatEntry[]> {
  return parseNumstat(await runGit(cwd, numstatArgs(options.staged ?? false)));
}

/**
 * `git diff --numstat -z` 출력을 파싱한다.
 * 일반 항목은 `added TAB deleted TAB path NUL`,
 * rename 항목은 `added TAB deleted TAB NUL old NUL new NUL`,
 * 바이너리는 숫자 대신 `-`가 온다.
 */
export function parseNumstat(output: string): NumstatEntry[] {
  const tokens = output.split("\0");
  const entries: NumstatEntry[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (!token) continue;

    const match = /^(\d+|-)\t(\d+|-)\t([\s\S]*)$/.exec(token);
    if (!match) continue;

    const added = match[1] === "-" ? null : Number(match[1]);
    const deleted = match[2] === "-" ? null : Number(match[2]);

    if (match[3] === "") {
      const origPath = tokens[++i] ?? "";
      const path = tokens[++i] ?? "";
      entries.push({ path, origPath, added, deleted });
    } else {
      entries.push({ path: match[3], origPath: null, added, deleted });
    }
  }

  return entries;
}
