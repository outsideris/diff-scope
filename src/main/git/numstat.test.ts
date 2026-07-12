import { describe, expect, it, vi } from "vitest";
import { getWorkingNumstat, numstatArgs, parseNumstat } from "./numstat";

const { runGit } = vi.hoisted(() => ({ runGit: vi.fn() }));

vi.mock("./exec", () => ({ runGit }));

describe("numstatArgs", () => {
  it("targets unstaged changes by default and staged with --cached", () => {
    expect(numstatArgs(false)).toEqual(["diff", "--numstat", "-z", "--find-renames"]);
    expect(numstatArgs(true)).toEqual(["diff", "--numstat", "-z", "--find-renames", "--cached"]);
  });
});

describe("parseNumstat", () => {
  it("parses ordinary entries including paths with spaces", () => {
    const output = "12\t3\tsrc/app.ts\0" + "5\t0\tdocs/some file.md\0";

    expect(parseNumstat(output)).toEqual([
      { path: "src/app.ts", origPath: null, added: 12, deleted: 3 },
      { path: "docs/some file.md", origPath: null, added: 5, deleted: 0 },
    ]);
  });

  it("parses rename entries with old and new paths from following tokens", () => {
    const output = "9\t4\t\0src/before.ts\0src/after.ts\0" + "1\t1\tREADME.md\0";

    expect(parseNumstat(output)).toEqual([
      { path: "src/after.ts", origPath: "src/before.ts", added: 9, deleted: 4 },
      { path: "README.md", origPath: null, added: 1, deleted: 1 },
    ]);
  });

  it("returns null counts for binary files", () => {
    expect(parseNumstat("-\t-\tlogo.png\0")).toEqual([
      { path: "logo.png", origPath: null, added: null, deleted: null },
    ]);
  });

  it("returns an empty list for empty output", () => {
    expect(parseNumstat("")).toEqual([]);
  });
});

describe("getWorkingNumstat", () => {
  it("runs numstat in the given directory and parses the result", async () => {
    runGit.mockResolvedValueOnce("2\t0\ta.ts\0");

    await expect(getWorkingNumstat("/repo", { staged: true })).resolves.toEqual([
      { path: "a.ts", origPath: null, added: 2, deleted: 0 },
    ]);
    expect(runGit).toHaveBeenCalledWith("/repo", [
      "diff",
      "--numstat",
      "-z",
      "--find-renames",
      "--cached",
    ]);
  });
});
