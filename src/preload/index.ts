import { contextBridge, ipcRenderer } from "electron";
import type {
  CommitInfo,
  LogOptions,
  RepositoryEntry,
  RepoStatus,
  WorkingDiffOptions,
  Worktree,
} from "../shared/git";
import { IpcChannels } from "../shared/ipc";

const api = {
  ping: (): Promise<string> => ipcRenderer.invoke(IpcChannels.ping),

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
  getCommitDiff: (dir: string, hash: string): Promise<string> =>
    ipcRenderer.invoke(IpcChannels.getCommitDiff, dir, hash),
};

export type DiffScopeApi = typeof api;

contextBridge.exposeInMainWorld("diffScope", api);
