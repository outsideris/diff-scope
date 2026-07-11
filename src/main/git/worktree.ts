import type { Worktree } from "../../shared/git";
import { runGit } from "./exec";

export const WORKTREE_ARGS = ["worktree", "list", "--porcelain", "-z"];

export async function listWorktrees(cwd: string): Promise<Worktree[]> {
  return parseWorktreeList(await runGit(cwd, WORKTREE_ARGS));
}

/**
 * `git worktree list --porcelain -z` 출력을 파싱한다.
 * 각 워크트리는 속성 라인(NUL 종료)의 묶음이고, 묶음 사이는 빈 라인으로 구분된다.
 */
export function parseWorktreeList(output: string): Worktree[] {
  const worktrees: Worktree[] = [];
  let current: Worktree | null = null;

  for (const line of output.split("\0")) {
    if (!line) {
      if (current) worktrees.push(current);
      current = null;
      continue;
    }

    if (line.startsWith("worktree ")) {
      current = {
        path: line.slice("worktree ".length),
        head: null,
        branch: null,
        detached: false,
        bare: false,
        locked: false,
      };
      continue;
    }
    if (!current) continue;

    if (line.startsWith("HEAD ")) {
      current.head = line.slice("HEAD ".length);
    } else if (line.startsWith("branch ")) {
      current.branch = line.slice("branch ".length).replace(/^refs\/heads\//, "");
    } else if (line === "detached") {
      current.detached = true;
    } else if (line === "bare") {
      current.bare = true;
    } else if (line === "locked" || line.startsWith("locked ")) {
      current.locked = true;
    }
  }

  if (current) worktrees.push(current);
  return worktrees;
}
