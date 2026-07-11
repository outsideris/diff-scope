import type { WorkingDiffOptions } from "../../shared/git";
import { runGit } from "./exec";

/**
 * 워킹 트리 diff 원문을 반환한다.
 * - 기본: unstaged 변경 (`git diff`)
 * - staged: 스테이징된 변경 (`git diff --cached`)
 * - untracked + path: 아직 추적되지 않는 파일 (`git diff --no-index /dev/null <path>`)
 */
export async function getWorkingDiff(
  cwd: string,
  options: WorkingDiffOptions = {},
): Promise<string> {
  if (options.untracked) {
    if (!options.path) throw new Error("untracked diff requires a path");
    return runGit(cwd, ["diff", "--no-color", "--no-index", "--", "/dev/null", options.path], {
      allowExitCodes: [1],
    });
  }

  const args = ["diff", "--no-color", "--find-renames"];
  if (options.staged) args.push("--cached");
  if (options.path) args.push("--", options.path);
  return runGit(cwd, args);
}

/** 커밋 하나의 diff 원문 (`git show`)을 반환한다. */
export async function getCommitDiff(cwd: string, hash: string): Promise<string> {
  return runGit(cwd, ["show", "--no-color", "--find-renames", "--format=", "--patch", hash]);
}
