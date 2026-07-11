import { describe, expect, it } from "vitest";
import { vi } from "vitest";
import { GitError, runGit } from "./exec";

const { execFile } = vi.hoisted(() => ({ execFile: vi.fn() }));

vi.mock("node:child_process", () => ({ execFile }));

type ExecCallback = (
  error: (Error & { code?: unknown }) | null,
  stdout: string,
  stderr: string,
) => void;

function mockExecResult(
  error: (Error & { code?: unknown }) | null,
  stdout = "",
  stderr = "",
): void {
  execFile.mockImplementationOnce(
    (_cmd: string, _args: string[], _opts: object, callback: ExecCallback) => {
      callback(error, stdout, stderr);
    },
  );
}

describe("runGit", () => {
  it("runs git with the given args in the given cwd and resolves stdout", async () => {
    mockExecResult(null, "output\n");

    await expect(runGit("/repo", ["status", "-z"])).resolves.toBe("output\n");

    const [cmd, args, opts] = execFile.mock.calls[0] as [string, string[], { cwd: string }];
    expect(cmd).toBe("git");
    expect(args).toEqual(["status", "-z"]);
    expect(opts.cwd).toBe("/repo");
  });

  it("rejects with a GitError carrying exit code and stderr on failure", async () => {
    const error = Object.assign(new Error("Command failed"), { code: 128 });
    mockExecResult(error, "", "fatal: not a git repository\n");

    const promise = runGit("/tmp/nowhere", ["status"]);
    await expect(promise).rejects.toBeInstanceOf(GitError);
    await expect(runGitError(promise)).resolves.toMatchObject({
      cwd: "/tmp/nowhere",
      args: ["status"],
      exitCode: 128,
      stderr: "fatal: not a git repository\n",
    });
  });

  it("resolves stdout when the exit code is explicitly allowed", async () => {
    const error = Object.assign(new Error("Command failed"), { code: 1 });
    mockExecResult(error, "diff --git a/x b/x\n", "");

    await expect(
      runGit("/repo", ["diff", "--no-index", "--", "/dev/null", "x"], { allowExitCodes: [1] }),
    ).resolves.toBe("diff --git a/x b/x\n");
  });

  it("rejects with the underlying message when git cannot be spawned", async () => {
    const error = Object.assign(new Error("spawn git ENOENT"), { code: "ENOENT" });
    mockExecResult(error, "", "");

    const promise = runGit("/repo", ["status"]);
    await expect(promise).rejects.toBeInstanceOf(GitError);
    await expect(runGitError(promise)).resolves.toMatchObject({
      exitCode: null,
      stderr: "spawn git ENOENT",
    });
  });
});

async function runGitError(promise: Promise<string>): Promise<GitError> {
  try {
    await promise;
  } catch (error) {
    return error as GitError;
  }
  throw new Error("expected promise to reject");
}
