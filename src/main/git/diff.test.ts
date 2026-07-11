import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCommitDiff, getWorkingDiff } from "./diff";

const { runGit } = vi.hoisted(() => ({ runGit: vi.fn() }));

vi.mock("./exec", () => ({ runGit }));

beforeEach(() => {
  runGit.mockClear();
});

describe("getWorkingDiff", () => {
  it("requests the unstaged diff by default", async () => {
    runGit.mockResolvedValueOnce("DIFF");

    await expect(getWorkingDiff("/repo")).resolves.toBe("DIFF");
    expect(runGit).toHaveBeenCalledWith("/repo", ["diff", "--no-color", "--find-renames"]);
  });

  it("requests the staged diff scoped to a path", async () => {
    runGit.mockResolvedValueOnce("DIFF");

    await getWorkingDiff("/repo", { staged: true, path: "src/app.ts" });

    expect(runGit).toHaveBeenCalledWith("/repo", [
      "diff",
      "--no-color",
      "--find-renames",
      "--cached",
      "--",
      "src/app.ts",
    ]);
  });

  it("diffs untracked files against /dev/null allowing exit code 1", async () => {
    runGit.mockResolvedValueOnce("DIFF");

    await getWorkingDiff("/repo", { untracked: true, path: "notes.md" });

    expect(runGit).toHaveBeenCalledWith(
      "/repo",
      ["diff", "--no-color", "--no-index", "--", "/dev/null", "notes.md"],
      { allowExitCodes: [1] },
    );
  });

  it("rejects an untracked diff without a path", async () => {
    await expect(getWorkingDiff("/repo", { untracked: true })).rejects.toThrow(
      "untracked diff requires a path",
    );
    expect(runGit).not.toHaveBeenCalled();
  });
});

describe("getCommitDiff", () => {
  it("requests the patch of a single commit without commit metadata", async () => {
    runGit.mockResolvedValueOnce("DIFF");

    await expect(getCommitDiff("/repo", "abc123")).resolves.toBe("DIFF");
    expect(runGit).toHaveBeenCalledWith("/repo", [
      "show",
      "--no-color",
      "--find-renames",
      "--format=",
      "--patch",
      "abc123",
    ]);
  });
});
