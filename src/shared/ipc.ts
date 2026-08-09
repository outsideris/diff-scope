export const IpcChannels = {
  ping: "diff-scope:ping",
  selectDirectory: "diff-scope:select-directory",
  listRepositories: "diff-scope:repositories:list",
  addRepository: "diff-scope:repositories:add",
  removeRepository: "diff-scope:repositories:remove",
  listWorktrees: "diff-scope:git:worktrees",
  getStatus: "diff-scope:git:status",
  getLog: "diff-scope:git:log",
  getWorkingDiff: "diff-scope:git:working-diff",
  getWorkingNumstat: "diff-scope:git:working-numstat",
  getCommitDiff: "diff-scope:git:commit-diff",
  getFileContents: "diff-scope:git:file-contents",
  getSessions: "diff-scope:sessions:list",
  syncWatchedWorktrees: "diff-scope:watch:sync",
} as const;

export type IpcChannel = (typeof IpcChannels)[keyof typeof IpcChannels];

/** 메인 → 렌더러 푸시 이벤트: 감시 중인 파일이 바뀌어 사이드바 갱신이 필요함 */
export const SidebarChangedEvent = "diff-scope:sidebar-changed";
