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
} as const;

export type IpcChannel = (typeof IpcChannels)[keyof typeof IpcChannels];
