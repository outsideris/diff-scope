/** git status --porcelain=v2의 XY 한 글자 상태 코드 */
export type StatusCode = "." | "M" | "T" | "A" | "D" | "R" | "C" | "U" | "?" | "!";

export interface StatusEntry {
  path: string;
  /** rename/copy의 원본 경로 */
  origPath: string | null;
  /** 인덱스(스테이징) 쪽 상태 (XY의 X) */
  staged: StatusCode;
  /** 워킹 트리 쪽 상태 (XY의 Y) */
  unstaged: StatusCode;
  untracked: boolean;
  unmerged: boolean;
}

export interface RepoStatus {
  branch: string | null;
  detached: boolean;
  oid: string | null;
  upstream: string | null;
  ahead: number | null;
  behind: number | null;
  entries: StatusEntry[];
}

export interface Worktree {
  path: string;
  head: string | null;
  branch: string | null;
  detached: boolean;
  bare: boolean;
  locked: boolean;
}

export interface CommitInfo {
  hash: string;
  shortHash: string;
  parents: string[];
  authorName: string;
  authorEmail: string;
  authorDate: string;
  subject: string;
  body: string;
}

export interface LogOptions {
  /** 조회할 최대 커밋 수 (기본 200) */
  limit?: number;
  /** 시작 지점 (브랜치, 태그, 해시). 생략하면 HEAD */
  ref?: string;
}

export interface WorkingDiffOptions {
  /** true면 스테이징된 변경(git diff --cached) */
  staged?: boolean;
  /** 특정 파일로 한정 */
  path?: string;
  /** untracked 파일의 diff (git diff --no-index /dev/null <path>). path가 필요하다 */
  untracked?: boolean;
}

export interface RepositoryEntry {
  path: string;
  name: string;
}

/** git diff --numstat 한 항목. 바이너리 파일은 added/deleted가 null */
export interface NumstatEntry {
  path: string;
  origPath: string | null;
  added: number | null;
  deleted: number | null;
}
