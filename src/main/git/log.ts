import type { CommitInfo, LogOptions } from "../../shared/git";
import { GitError, runGit } from "./exec";

const FIELD_SEP = "\x1f";
const RECORD_SEP = "\x1e";
const FORMAT = ["%H", "%h", "%P", "%an", "%ae", "%aI", "%s", "%b"].join("%x1f") + "%x1e";
const DEFAULT_LIMIT = 200;

export function logArgs(options: LogOptions = {}): string[] {
  const args = ["log", `--format=${FORMAT}`, "-n", String(options.limit ?? DEFAULT_LIMIT)];
  if (options.ref) args.push(options.ref);
  return args;
}

export async function getLog(cwd: string, options: LogOptions = {}): Promise<CommitInfo[]> {
  try {
    return parseLog(await runGit(cwd, logArgs(options)));
  } catch (error) {
    if (error instanceof GitError && isEmptyRepositoryError(error)) return [];
    throw error;
  }
}

function isEmptyRepositoryError(error: GitError): boolean {
  return /does not have any commits yet|bad default revision/.test(error.stderr);
}

export function parseLog(output: string): CommitInfo[] {
  return output
    .split(RECORD_SEP)
    .map((record) => record.replace(/^\n/, ""))
    .filter((record) => record.length > 0)
    .map(parseRecord);
}

function parseRecord(record: string): CommitInfo {
  const [hash, shortHash, parents, authorName, authorEmail, authorDate, subject, body] =
    record.split(FIELD_SEP);
  return {
    hash: hash ?? "",
    shortHash: shortHash ?? "",
    parents: parents ? parents.split(" ") : [],
    authorName: authorName ?? "",
    authorEmail: authorEmail ?? "",
    authorDate: authorDate ?? "",
    subject: subject ?? "",
    body: (body ?? "").replace(/\n+$/, ""),
  };
}
