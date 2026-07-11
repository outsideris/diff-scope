import { describe, expect, it, vi } from "vitest";
import { IpcChannels } from "../shared/ipc";

const { exposeInMainWorld, invoke } = vi.hoisted(() => ({
  exposeInMainWorld: vi.fn(),
  invoke: vi.fn(),
}));

vi.mock("electron", () => ({
  contextBridge: { exposeInMainWorld },
  ipcRenderer: { invoke },
}));

describe("preload api", () => {
  it("exposes a diffScope api whose ping invokes the ping channel", async () => {
    await import("./index");

    expect(exposeInMainWorld).toHaveBeenCalledTimes(1);
    const [name, api] = exposeInMainWorld.mock.calls[0] as [string, { ping(): Promise<string> }];
    expect(name).toBe("diffScope");

    invoke.mockResolvedValue("pong");
    await expect(api.ping()).resolves.toBe("pong");
    expect(invoke).toHaveBeenCalledWith(IpcChannels.ping);
  });
});
