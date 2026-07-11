import { describe, expect, it, vi } from "vitest";
import { IpcChannels } from "../shared/ipc";
import type { DiffScopeApi } from "./index";

const { exposeInMainWorld, invoke } = vi.hoisted(() => ({
  exposeInMainWorld: vi.fn(),
  invoke: vi.fn(),
}));

vi.mock("electron", () => ({
  contextBridge: { exposeInMainWorld },
  ipcRenderer: { invoke },
}));

async function loadApi(): Promise<DiffScopeApi> {
  await import("./index");
  expect(exposeInMainWorld).toHaveBeenCalledTimes(1);
  const [name, api] = exposeInMainWorld.mock.calls[0] as [string, DiffScopeApi];
  expect(name).toBe("diffScope");
  return api;
}

describe("preload api", () => {
  it("maps every api method to its IPC channel with its arguments", async () => {
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
        () => api.getCommitDiff("/repos/a", "abc123"),
        [IpcChannels.getCommitDiff, "/repos/a", "abc123"],
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
});
