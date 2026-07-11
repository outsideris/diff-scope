import { execFile } from "node:child_process";

const MAX_BUFFER = 64 * 1024 * 1024;

export interface RunGitOptions {
  /** 오류로 취급하지 않을 종료 코드 (예: `git diff --no-index`는 차이가 있으면 1) */
  allowExitCodes?: number[];
}

export class GitError extends Error {
  constructor(
    readonly cwd: string,
    readonly args: string[],
    readonly exitCode: number | null,
    readonly stderr: string,
  ) {
    super(`git ${args.join(" ")} failed in ${cwd} (exit ${exitCode ?? "none"}): ${stderr.trim()}`);
    this.name = "GitError";
  }
}

export function runGit(cwd: string, args: string[], options: RunGitOptions = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile("git", args, { cwd, maxBuffer: MAX_BUFFER }, (error, stdout, stderr) => {
      if (!error) {
        resolve(stdout);
        return;
      }
      const code = (error as NodeJS.ErrnoException).code;
      const exitCode = typeof code === "number" ? code : null;
      if (exitCode !== null && (options.allowExitCodes ?? []).includes(exitCode)) {
        resolve(stdout);
        return;
      }
      reject(new GitError(cwd, args, exitCode, stderr || error.message));
    });
  });
}
