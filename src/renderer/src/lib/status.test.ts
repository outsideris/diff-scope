import { describe, expect, it } from "vitest";
import type { RepoStatus, StatusEntry } from "../../../shared/git";
import { groupStatusEntries } from "./status";

function entry(partial: Partial<StatusEntry> & { path: string }): StatusEntry {
  return {
    origPath: null,
    staged: ".",
    unstaged: ".",
    untracked: false,
    unmerged: false,
    ...partial,
  };
}

function statusWith(entries: StatusEntry[]): RepoStatus {
  return {
    branch: "main",
    detached: false,
    oid: null,
    upstream: null,
    ahead: null,
    behind: null,
    entries,
  };
}

describe("groupStatusEntries", () => {
  it("splits entries into staged and unstaged sections", () => {
    const grouped = groupStatusEntries(
      statusWith([
        entry({ path: "staged-only.ts", staged: "A" }),
        entry({ path: "unstaged-only.ts", unstaged: "M" }),
        entry({ path: "renamed.ts", origPath: "orig.ts", staged: "R" }),
      ]),
    );

    expect(grouped.staged.map((f) => [f.path, f.code])).toEqual([
      ["staged-only.ts", "A"],
      ["renamed.ts", "R"],
    ]);
    expect(grouped.unstaged.map((f) => [f.path, f.code])).toEqual([["unstaged-only.ts", "M"]]);
    expect(grouped.staged[1].origPath).toBe("orig.ts");
  });

  it("puts a partially staged file in both sections", () => {
    const grouped = groupStatusEntries(
      statusWith([entry({ path: "both.ts", staged: "M", unstaged: "M" })]),
    );

    expect(grouped.staged.map((f) => f.path)).toEqual(["both.ts"]);
    expect(grouped.unstaged.map((f) => f.path)).toEqual(["both.ts"]);
  });

  it("routes untracked and unmerged files to the unstaged section", () => {
    const grouped = groupStatusEntries(
      statusWith([
        entry({ path: "new.txt", unstaged: "?", untracked: true }),
        entry({ path: "conflict.ts", staged: "U", unstaged: "U", unmerged: true }),
      ]),
    );

    expect(grouped.staged).toEqual([]);
    expect(grouped.unstaged.map((f) => [f.path, f.code, f.untracked, f.unmerged])).toEqual([
      ["new.txt", "?", true, false],
      ["conflict.ts", "U", false, true],
    ]);
  });
});
