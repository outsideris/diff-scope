import { beforeEach, describe, expect, it, vi } from "vitest";
import { INDEX_REV } from "../../shared/git";

const { readFile, runGit } = vi.hoisted(() => ({ readFile: vi.fn(), runGit: vi.fn() }));

vi.mock("node:fs/promises", () => ({ readFile }));
vi.mock("./exec", async () => {
  const actual = await vi.importActual<typeof import("./exec")>("./exec");
  return { runGit, GitError: actual.GitError };
});

const { getFileContents } = await import("./blob");
const { GitError } = await import("./exec");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getFileContents", () => {
  it("reads the working tree file when rev is null", async () => {
    readFile.mockResolvedValueOnce("worktree contents");

    const result = await getFileContents("/repos/a", { path: "src/a.ts", rev: null });

    expect(result).toBe("worktree contents");
    expect(readFile).toHaveBeenCalledWith("/repos/a/src/a.ts", "utf8");
    expect(runGit).not.toHaveBeenCalled();
  });

  it("returns null when the working tree file is missing", async () => {
    readFile.mockRejectedValueOnce(Object.assign(new Error("ENOENT"), { code: "ENOENT" }));

    await expect(getFileContents("/repos/a", { path: "gone.ts", rev: null })).resolves.toBeNull();
  });

  it("reads the index with the ':path' revision syntax", async () => {
    runGit.mockResolvedValueOnce("staged contents");

    const result = await getFileContents("/repos/a", { path: "src/a.ts", rev: INDEX_REV });

    expect(result).toBe("staged contents");
    expect(runGit).toHaveBeenCalledWith("/repos/a", ["show", ":0:src/a.ts"]);
  });

  it("reads a commit blob with '<rev>:<path>'", async () => {
    runGit.mockResolvedValueOnce("old contents");

    const result = await getFileContents("/repos/a", { path: "src/a.ts", rev: "abc123^" });

    expect(result).toBe("old contents");
    expect(runGit).toHaveBeenCalledWith("/repos/a", ["show", "abc123^:src/a.ts"]);
  });

  it("returns null when the path does not exist at that revision", async () => {
    // 신규 파일이나 루트 커밋의 부모처럼 확장할 원본이 없는 경우.
    runGit.mockRejectedValueOnce(
      new GitError("/repos/a", ["show", "abc123^:new.ts"], 128, "exists on disk, but not in"),
    );

    await expect(
      getFileContents("/repos/a", { path: "new.ts", rev: "abc123^" }),
    ).resolves.toBeNull();
  });

  it("propagates failures that are not git errors", async () => {
    runGit.mockRejectedValueOnce(new Error("spawn ENOMEM"));

    await expect(getFileContents("/repos/a", { path: "src/a.ts", rev: "HEAD" })).rejects.toThrow(
      "spawn ENOMEM",
    );
  });
});
