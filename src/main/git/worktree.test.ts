import { describe, expect, it } from "vitest";
import { parseWorktreeList } from "./worktree";

function blocks(...lines: string[]): string {
  return lines.map((line) => `${line}\0`).join("");
}

describe("parseWorktreeList", () => {
  it("parses a main worktree and linked worktrees", () => {
    const output = blocks(
      "worktree /Users/me/proj",
      "HEAD 4a5c8e2f0b1d3e4f5a6b7c8d9e0f1a2b3c4d5e6f",
      "branch refs/heads/main",
      "",
      "worktree /Users/me/proj-feature x",
      "HEAD d95f3ad14dee633a758d2e331151e950dd13e4ed",
      "branch refs/heads/feature/x",
      "",
    );

    expect(parseWorktreeList(output)).toEqual([
      {
        path: "/Users/me/proj",
        head: "4a5c8e2f0b1d3e4f5a6b7c8d9e0f1a2b3c4d5e6f",
        branch: "main",
        detached: false,
        bare: false,
        locked: false,
      },
      {
        path: "/Users/me/proj-feature x",
        head: "d95f3ad14dee633a758d2e331151e950dd13e4ed",
        branch: "feature/x",
        detached: false,
        bare: false,
        locked: false,
      },
    ]);
  });

  it("parses detached, bare, and locked worktrees", () => {
    const output = blocks(
      "worktree /repos/bare.git",
      "bare",
      "",
      "worktree /repos/detached-wt",
      "HEAD 4a5c8e2f0b1d3e4f5a6b7c8d9e0f1a2b3c4d5e6f",
      "detached",
      "",
      "worktree /repos/locked-wt",
      "HEAD d95f3ad14dee633a758d2e331151e950dd13e4ed",
      "branch refs/heads/wip",
      "locked moved to a USB drive",
      "",
    );

    const worktrees = parseWorktreeList(output);

    expect(
      worktrees.map((w) => ({
        path: w.path,
        bare: w.bare,
        detached: w.detached,
        locked: w.locked,
      })),
    ).toEqual([
      { path: "/repos/bare.git", bare: true, detached: false, locked: false },
      { path: "/repos/detached-wt", bare: false, detached: true, locked: false },
      { path: "/repos/locked-wt", bare: false, detached: false, locked: true },
    ]);
    expect(worktrees[1].branch).toBeNull();
    expect(worktrees[2].branch).toBe("wip");
  });

  it("returns an empty list for empty output and handles a missing trailing separator", () => {
    expect(parseWorktreeList("")).toEqual([]);
    expect(parseWorktreeList("worktree /repos/only\0HEAD abc\0")).toEqual([
      {
        path: "/repos/only",
        head: "abc",
        branch: null,
        detached: false,
        bare: false,
        locked: false,
      },
    ]);
  });
});
