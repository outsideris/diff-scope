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

/** 인덱스(스테이징 영역)를 가리키는 리비전. `git show :0:<path>` */
export const INDEX_REV = ":0";

/**
 * 특정 리비전의 파일 내용 요청. diff 뷰가 컨텍스트를 확장할 때 쓴다.
 *
 * `rev`는 null(워킹 트리 파일), {@link INDEX_REV}(인덱스), 그 외 커밋/리비전 문자열.
 */
export interface FileContentsRequest {
  path: string;
  rev: string | null;
}

/**
 * diff가 어느 두 리비전을 비교한 것인지. `DiffPane`이 확장용 원본을 가져올 때 쓴다.
 *
 * - unstaged: 인덱스({@link INDEX_REV}) → 워킹 트리(null)
 * - staged: `"HEAD"` → 인덱스({@link INDEX_REV})
 * - 커밋: `"<hash>^"` → `"<hash>"`
 */
export interface DiffRevisions {
  oldRev: string | null;
  newRev: string | null;
}

/** git diff --numstat 한 항목. 바이너리 파일은 added/deleted가 null */
export interface NumstatEntry {
  path: string;
  origPath: string | null;
  added: number | null;
  deleted: number | null;
}
