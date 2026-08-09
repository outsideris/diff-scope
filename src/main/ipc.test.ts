import { beforeEach, describe, expect, it, vi } from "vitest";
import { IpcChannels } from "../shared/ipc";
import { registerIpcHandlers } from "./ipc";
import type { RepositoryStore } from "./store/repositories";

const { handle, git } = vi.hoisted(() => ({
  handle: vi.fn(),
  git: {
    resolveRepositoryRoot: vi.fn(),
    listWorktrees: vi.fn(),
    getRepoStatus: vi.fn(),
    getLog: vi.fn(),
    getWorkingDiff: vi.fn(),
    getWorkingNumstat: vi.fn(),
    getCommitDiff: vi.fn(),
    getFileContents: vi.fn(),
    collectSessions: vi.fn(),
  },
}));

const { showOpenDialog } = vi.hoisted(() => ({ showOpenDialog: vi.fn() }));

vi.mock("electron", () => ({ ipcMain: { handle }, dialog: { showOpenDialog } }));
vi.mock("./git/repository", () => ({ resolveRepositoryRoot: git.resolveRepositoryRoot }));
vi.mock("./git/worktree", () => ({ listWorktrees: git.listWorktrees }));
vi.mock("./git/status", () => ({ getRepoStatus: git.getRepoStatus }));
vi.mock("./git/log", () => ({ getLog: git.getLog }));
vi.mock("./git/numstat", () => ({ getWorkingNumstat: git.getWorkingNumstat }));
vi.mock("./sessions/collect", () => ({ collectSessions: git.collectSessions }));
vi.mock("./git/diff", () => ({
  getWorkingDiff: git.getWorkingDiff,
  getCommitDiff: git.getCommitDiff,
}));
vi.mock("./git/blob", () => ({ getFileContents: git.getFileContents }));

const store = {
  list: vi.fn(),
  add: vi.fn(),
  remove: vi.fn(),
} as unknown as RepositoryStore & { list: ReturnType<typeof vi.fn>; add: ReturnType<typeof vi.fn> };

const watcher = { syncWorktrees: vi.fn() };

type Handler = (event: unknown, ...args: unknown[]) => unknown;

function handlerFor(channel: string): Handler {
  const call = handle.mock.calls.find(([registered]) => registered === channel);
  if (!call) throw new Error(`no handler registered for ${channel}`);
  return call[1] as Handler;
}

beforeEach(() => {
  vi.clearAllMocks();
  registerIpcHandlers(store, watcher);
});

describe("registerIpcHandlers", () => {
  it("registers a handler for every channel", () => {
    const registered = handle.mock.calls.map(([channel]) => channel);
    expect(registered.sort()).toEqual(Object.values(IpcChannels).sort());
  });

  it("keeps the ping handler replying pong", () => {
    expect(handlerFor(IpcChannels.ping)(null)).toBe("pong");
  });

  it("returns the picked directory or null when the dialog is canceled", async () => {
    showOpenDialog.mockResolvedValueOnce({ canceled: false, filePaths: ["/repos/picked"] });
    await expect(handlerFor(IpcChannels.selectDirectory)(null)).resolves.toBe("/repos/picked");

    showOpenDialog.mockResolvedValueOnce({ canceled: true, filePaths: [] });
    await expect(handlerFor(IpcChannels.selectDirectory)(null)).resolves.toBeNull();
  });

  it("resolves the repository root before adding it to the store", async () => {
    git.resolveRepositoryRoot.mockResolvedValueOnce("/repos/project");
    store.add.mockResolvedValueOnce([{ path: "/repos/project", name: "project" }]);

    const result = await handlerFor(IpcChannels.addRepository)(null, "/repos/project/src/deep");

    expect(git.resolveRepositoryRoot).toHaveBeenCalledWith("/repos/project/src/deep");
    expect(store.add).toHaveBeenCalledWith({ path: "/repos/project", name: "project" });
    expect(result).toEqual([{ path: "/repos/project", name: "project" }]);
  });

  it("delegates git queries with their arguments", async () => {
    await handlerFor(IpcChannels.listWorktrees)(null, "/repos/a");
    expect(git.listWorktrees).toHaveBeenCalledWith("/repos/a");

    await handlerFor(IpcChannels.getStatus)(null, "/repos/a");
    expect(git.getRepoStatus).toHaveBeenCalledWith("/repos/a");

    await handlerFor(IpcChannels.getLog)(null, "/repos/a", { limit: 10 });
    expect(git.getLog).toHaveBeenCalledWith("/repos/a", { limit: 10 });

    await handlerFor(IpcChannels.getWorkingDiff)(null, "/repos/a", { staged: true });
    expect(git.getWorkingDiff).toHaveBeenCalledWith("/repos/a", { staged: true });

    await handlerFor(IpcChannels.getWorkingNumstat)(null, "/repos/a", { staged: true });
    expect(git.getWorkingNumstat).toHaveBeenCalledWith("/repos/a", { staged: true });

    await handlerFor(IpcChannels.getCommitDiff)(null, "/repos/a", "abc123");
    expect(git.getCommitDiff).toHaveBeenCalledWith("/repos/a", "abc123");

    await handlerFor(IpcChannels.getFileContents)(null, "/repos/a", {
      path: "src/a.ts",
      rev: ":0",
    });
    expect(git.getFileContents).toHaveBeenCalledWith("/repos/a", { path: "src/a.ts", rev: ":0" });

    await handlerFor(IpcChannels.getSessions)(null, ["/repos/a", "/repos/a/wt"]);
    expect(git.collectSessions).toHaveBeenCalledWith(["/repos/a", "/repos/a/wt"]);

    await handlerFor(IpcChannels.syncWatchedWorktrees)(null, ["/repos/a", "/repos/a/wt"]);
    expect(watcher.syncWorktrees).toHaveBeenCalledWith(["/repos/a", "/repos/a/wt"]);
  });
});
