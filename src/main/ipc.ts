import { basename } from "node:path";
import { dialog, ipcMain } from "electron";
import type { FileContentsRequest, LogOptions, WorkingDiffOptions } from "../shared/git";
import { IpcChannels } from "../shared/ipc";
import { getFileContents } from "./git/blob";
import { getCommitDiff, getWorkingDiff } from "./git/diff";
import { getLog } from "./git/log";
import { getWorkingNumstat } from "./git/numstat";
import { resolveRepositoryRoot } from "./git/repository";
import { getRepoStatus } from "./git/status";
import { listWorktrees } from "./git/worktree";
import { collectSessions } from "./sessions/collect";
import type { RepositoryStore } from "./store/repositories";

export function registerIpcHandlers(store: RepositoryStore): void {
  ipcMain.handle(IpcChannels.ping, () => "pong");

  ipcMain.handle(IpcChannels.selectDirectory, async () => {
    const result = await dialog.showOpenDialog({ properties: ["openDirectory"] });
    return result.canceled ? null : (result.filePaths[0] ?? null);
  });

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
  ipcMain.handle(
    IpcChannels.getWorkingNumstat,
    (_event, dir: string, options?: { staged?: boolean }) => getWorkingNumstat(dir, options),
  );
  ipcMain.handle(IpcChannels.getCommitDiff, (_event, dir: string, hash: string) =>
    getCommitDiff(dir, hash),
  );
  ipcMain.handle(IpcChannels.getFileContents, (_event, dir: string, request: FileContentsRequest) =>
    getFileContents(dir, request),
  );

  ipcMain.handle(IpcChannels.getSessions, (_event, worktreePaths: string[]) =>
    collectSessions(worktreePaths),
  );
}
