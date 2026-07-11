import type { RepoStatus, StatusCode, StatusEntry } from "../../shared/git";
import { runGit } from "./exec";

export const STATUS_ARGS = [
  "--no-optional-locks",
  "status",
  "--porcelain=v2",
  "--branch",
  "--untracked-files=all",
  "-z",
];

export async function getRepoStatus(cwd: string): Promise<RepoStatus> {
  return parseStatusPorcelainV2(await runGit(cwd, STATUS_ARGS));
}

/**
 * `git status --porcelain=v2 --branch -z` 출력을 파싱한다.
 * -z 모드에서 레코드는 NUL로 끝나고, rename/copy(`2`) 레코드는
 * `path NUL origPath NUL`로 경로가 하나 더 따라온다.
 */
export function parseStatusPorcelainV2(output: string): RepoStatus {
  const status: RepoStatus = {
    branch: null,
    detached: false,
    oid: null,
    upstream: null,
    ahead: null,
    behind: null,
    entries: [],
  };

  const tokens = output.split("\0");
  for (let i = 0; i < tokens.length; i++) {
    const record = tokens[i];
    if (!record) continue;

    if (record.startsWith("# ")) {
      parseBranchHeader(record, status);
    } else if (record.startsWith("1 ")) {
      status.entries.push(parseChangedEntry(record));
    } else if (record.startsWith("2 ")) {
      const origPath = tokens[++i] ?? "";
      status.entries.push(parseRenamedEntry(record, origPath));
    } else if (record.startsWith("u ")) {
      status.entries.push(parseUnmergedEntry(record));
    } else if (record.startsWith("? ")) {
      status.entries.push(untrackedEntry(record.slice(2)));
    }
    // "! " (ignored)는 표시 대상이 아니므로 무시한다.
  }

  return status;
}

function parseBranchHeader(record: string, status: RepoStatus): void {
  if (record.startsWith("# branch.oid ")) {
    const oid = record.slice("# branch.oid ".length);
    status.oid = oid === "(initial)" ? null : oid;
  } else if (record.startsWith("# branch.head ")) {
    const head = record.slice("# branch.head ".length);
    if (head === "(detached)") {
      status.detached = true;
    } else {
      status.branch = head;
    }
  } else if (record.startsWith("# branch.upstream ")) {
    status.upstream = record.slice("# branch.upstream ".length);
  } else if (record.startsWith("# branch.ab ")) {
    const match = /^# branch\.ab \+(\d+) -(\d+)$/.exec(record);
    if (match) {
      status.ahead = Number(match[1]);
      status.behind = Number(match[2]);
    }
  }
}

// "1 XY sub mH mI mW hH hI path" — path는 9번째 필드부터 (공백 포함 가능)
function parseChangedEntry(record: string): StatusEntry {
  const fields = record.split(" ");
  return entry(fields.slice(8).join(" "), fields[1]);
}

// "2 XY sub mH mI mW hH hI Xscore path" — path는 10번째 필드부터
function parseRenamedEntry(record: string, origPath: string): StatusEntry {
  const fields = record.split(" ");
  return { ...entry(fields.slice(9).join(" "), fields[1]), origPath };
}

// "u XY sub m1 m2 m3 mW h1 h2 h3 path" — path는 11번째 필드부터
function parseUnmergedEntry(record: string): StatusEntry {
  const fields = record.split(" ");
  return { ...entry(fields.slice(10).join(" "), fields[1]), unmerged: true };
}

function entry(path: string, xy: string): StatusEntry {
  return {
    path,
    origPath: null,
    staged: (xy[0] ?? ".") as StatusCode,
    unstaged: (xy[1] ?? ".") as StatusCode,
    untracked: false,
    unmerged: false,
  };
}

function untrackedEntry(path: string): StatusEntry {
  return {
    path,
    origPath: null,
    staged: ".",
    unstaged: "?",
    untracked: true,
    unmerged: false,
  };
}
