import type { RepoStatus, StatusCode, StatusEntry } from "../../../shared/git";

export interface WorkingFile {
  path: string;
  origPath: string | null;
  code: StatusCode;
  untracked: boolean;
  unmerged: boolean;
}

export interface GroupedStatus {
  staged: WorkingFile[];
  unstaged: WorkingFile[];
}

/**
 * status 엔트리를 화면의 두 섹션으로 나눈다.
 * 같은 파일이 staged와 unstaged 양쪽에 나타날 수 있다 (예: 일부만 스테이징).
 * unmerged(충돌)와 untracked는 unstaged 섹션에 넣는다.
 */
export function groupStatusEntries(status: RepoStatus): GroupedStatus {
  const staged: WorkingFile[] = [];
  const unstaged: WorkingFile[] = [];

  for (const entry of status.entries) {
    if (entry.unmerged) {
      unstaged.push(workingFile(entry, "U"));
      continue;
    }
    if (entry.untracked) {
      unstaged.push(workingFile(entry, "?"));
      continue;
    }
    if (entry.staged !== ".") staged.push(workingFile(entry, entry.staged));
    if (entry.unstaged !== ".") unstaged.push(workingFile(entry, entry.unstaged));
  }

  return { staged, unstaged };
}

function workingFile(entry: StatusEntry, code: StatusCode): WorkingFile {
  return {
    path: entry.path,
    origPath: entry.origPath,
    code,
    untracked: entry.untracked,
    unmerged: entry.unmerged,
  };
}
