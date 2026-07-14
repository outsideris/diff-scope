import { contextBridge, ipcRenderer } from "electron";
import type {
  CommitInfo,
  LogOptions,
  NumstatEntry,
  RepositoryEntry,
  RepoStatus,
  WorkingDiffOptions,
  Worktree,
} from "../shared/git";
import { IpcChannels } from "../shared/ipc";
import type { SessionInfo } from "../shared/session";

const api = {
  ping: (): Promise<string> => ipcRenderer.invoke(IpcChannels.ping),

  selectDirectory: (): Promise<string | null> => ipcRenderer.invoke(IpcChannels.selectDirectory),

  listRepositories: (): Promise<RepositoryEntry[]> =>
    ipcRenderer.invoke(IpcChannels.listRepositories),
  addRepository: (path: string): Promise<RepositoryEntry[]> =>
    ipcRenderer.invoke(IpcChannels.addRepository, path),
  removeRepository: (path: string): Promise<RepositoryEntry[]> =>
    ipcRenderer.invoke(IpcChannels.removeRepository, path),

  listWorktrees: (dir: string): Promise<Worktree[]> =>
    ipcRenderer.invoke(IpcChannels.listWorktrees, dir),
  getStatus: (dir: string): Promise<RepoStatus> => ipcRenderer.invoke(IpcChannels.getStatus, dir),
  getLog: (dir: string, options?: LogOptions): Promise<CommitInfo[]> =>
    ipcRenderer.invoke(IpcChannels.getLog, dir, options),
  getWorkingDiff: (dir: string, options?: WorkingDiffOptions): Promise<string> =>
    ipcRenderer.invoke(IpcChannels.getWorkingDiff, dir, options),
  getWorkingNumstat: (dir: string, options?: { staged?: boolean }): Promise<NumstatEntry[]> =>
    ipcRenderer.invoke(IpcChannels.getWorkingNumstat, dir, options),
  getCommitDiff: (dir: string, hash: string): Promise<string> =>
    ipcRenderer.invoke(IpcChannels.getCommitDiff, dir, hash),
  getSessions: (worktreePaths: string[]): Promise<SessionInfo[]> =>
    ipcRenderer.invoke(IpcChannels.getSessions, worktreePaths),
};

export type DiffScopeApi = typeof api;

contextBridge.exposeInMainWorld("diffScope", api);
