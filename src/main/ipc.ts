import { basename } from "node:path";
import { ipcMain } from "electron";
import type { LogOptions, WorkingDiffOptions } from "../shared/git";
import { IpcChannels } from "../shared/ipc";
import { getCommitDiff, getWorkingDiff } from "./git/diff";
import { getLog } from "./git/log";
import { resolveRepositoryRoot } from "./git/repository";
import { getRepoStatus } from "./git/status";
import { listWorktrees } from "./git/worktree";
import type { RepositoryStore } from "./store/repositories";

export function registerIpcHandlers(store: RepositoryStore): void {
  ipcMain.handle(IpcChannels.ping, () => "pong");

  ipcMain.handle(IpcChannels.listRepositories, () => store.list());
  ipcMain.handle(IpcChannels.addRepository, async (_event, path: string) => {
    const root = await resolveRepositoryRoot(path);
    return store.add({ path: root, name: basename(root) });
  });
  ipcMain.handle(IpcChannels.removeRepository, (_event, path: string) => store.remove(path));

  ipcMain.handle(IpcChannels.listWorktrees, (_event, dir: string) => listWorktrees(dir));
  ipcMain.handle(IpcChannels.getStatus, (_event, dir: string) => getRepoStatus(dir));
  ipcMain.handle(IpcChannels.getLog, (_event, dir: string, options?: LogOptions) =>
    getLog(dir, options),
  );
  ipcMain.handle(IpcChannels.getWorkingDiff, (_event, dir: string, options?: WorkingDiffOptions) =>
    getWorkingDiff(dir, options),
  );
  ipcMain.handle(IpcChannels.getCommitDiff, (_event, dir: string, hash: string) =>
    getCommitDiff(dir, hash),
  );
}
