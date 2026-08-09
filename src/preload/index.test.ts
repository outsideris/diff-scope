import { describe, expect, it, vi } from "vitest";
import { IpcChannels, SidebarChangedEvent } from "../shared/ipc";
import type { DiffScopeApi } from "./index";

const { exposeInMainWorld, invoke, on, removeListener } = vi.hoisted(() => ({
  exposeInMainWorld: vi.fn(),
  invoke: vi.fn(),
  on: vi.fn(),
  removeListener: vi.fn(),
}));

vi.mock("electron", () => ({
  contextBridge: { exposeInMainWorld },
  ipcRenderer: { invoke, on, removeListener },
}));

async function loadApi(): Promise<DiffScopeApi> {
  await import("./index");
  expect(exposeInMainWorld).toHaveBeenCalledTimes(1);
  const [name, api] = exposeInMainWorld.mock.calls[0] as [string, DiffScopeApi];
  expect(name).toBe("diffScope");
  return api;
}

describe("preload api", () => {
  it("maps every invoke method to its IPC channel with its arguments", async () => {
    const api = await loadApi();

    const cases: Array<[() => Promise<unknown>, unknown[]]> = [
      [() => api.ping(), [IpcChannels.ping]],
      [() => api.selectDirectory(), [IpcChannels.selectDirectory]],
      [() => api.listRepositories(), [IpcChannels.listRepositories]],
      [() => api.addRepository("/repos/a"), [IpcChannels.addRepository, "/repos/a"]],
      [() => api.removeRepository("/repos/a"), [IpcChannels.removeRepository, "/repos/a"]],
      [() => api.listWorktrees("/repos/a"), [IpcChannels.listWorktrees, "/repos/a"]],
      [() => api.getStatus("/repos/a"), [IpcChannels.getStatus, "/repos/a"]],
      [() => api.getLog("/repos/a", { limit: 5 }), [IpcChannels.getLog, "/repos/a", { limit: 5 }]],
      [
        () => api.getWorkingDiff("/repos/a", { staged: true }),
        [IpcChannels.getWorkingDiff, "/repos/a", { staged: true }],
      ],
      [
        () => api.getWorkingNumstat("/repos/a", { staged: true }),
        [IpcChannels.getWorkingNumstat, "/repos/a", { staged: true }],
      ],
      [
        () => api.getCommitDiff("/repos/a", "abc123"),
        [IpcChannels.getCommitDiff, "/repos/a", "abc123"],
      ],
      [
        () => api.getFileContents("/repos/a", { path: "src/a.ts", rev: "HEAD" }),
        [IpcChannels.getFileContents, "/repos/a", { path: "src/a.ts", rev: "HEAD" }],
      ],
      [() => api.getSessions(["/repos/a"]), [IpcChannels.getSessions, ["/repos/a"]]],
      [
        () => api.syncWatchedWorktrees(["/repos/a"]),
        [IpcChannels.syncWatchedWorktrees, ["/repos/a"]],
      ],
    ];

    expect(Object.keys(cases)).toHaveLength(Object.keys(IpcChannels).length);

    for (const [call, expectedArgs] of cases) {
      invoke.mockClear();
      invoke.mockResolvedValueOnce("RESULT");
      await expect(call()).resolves.toBe("RESULT");
      expect(invoke).toHaveBeenCalledWith(...expectedArgs);
    }
  });

  it("subscribes to sidebar-changed events and unsubscribes with the returned function", async () => {
    const api = await loadApi();
    const listener = vi.fn();

    const unsubscribe = api.onSidebarChanged(listener);

    expect(on).toHaveBeenCalledWith(SidebarChangedEvent, expect.any(Function));
    const wrapped = on.mock.calls.at(-1)?.[1] as (...args: unknown[]) => void;
    // 래퍼는 electron IpcRendererEvent를 렌더러 콜백에 넘기지 않는다.
    wrapped({ sender: {} }, "extra");
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith();

    unsubscribe();
    expect(removeListener).toHaveBeenCalledWith(SidebarChangedEvent, wrapped);
  });
});
