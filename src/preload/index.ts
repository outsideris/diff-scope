import { contextBridge, ipcRenderer } from "electron";
import type {
  CommitInfo,
  FileContentsRequest,
  LogOptions,
  NumstatEntry,
  RepositoryEntry,
  RepoStatus,
  WorkingDiffOptions,
  Worktree,
} from "../shared/git";
import { IpcChannels, SidebarChangedEvent } from "../shared/ipc";
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
  getFileContents: (dir: string, request: FileContentsRequest): Promise<string | null> =>
    ipcRenderer.invoke(IpcChannels.getFileContents, dir, request),
  getSessions: (worktreePaths: string[]): Promise<SessionInfo[]> =>
    ipcRenderer.invoke(IpcChannels.getSessions, worktreePaths),
  syncWatchedWorktrees: (worktreePaths: string[]): Promise<void> =>
    ipcRenderer.invoke(IpcChannels.syncWatchedWorktrees, worktreePaths),

  /** 감시 중인 파일 변경 알림 구독. 반환된 함수로 해제한다. */
  onSidebarChanged: (listener: () => void): (() => void) => {
    const wrapped = (): void => listener();
    ipcRenderer.on(SidebarChangedEvent, wrapped);
    return () => ipcRenderer.removeListener(SidebarChangedEvent, wrapped);
  },
};

export type DiffScopeApi = typeof api;

contextBridge.exposeInMainWorld("diffScope", api);
