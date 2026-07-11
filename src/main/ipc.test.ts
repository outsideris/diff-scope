import { describe, expect, it, vi } from "vitest";
import { IpcChannels } from "../shared/ipc";
import { registerIpcHandlers } from "./ipc";

const { handle } = vi.hoisted(() => ({ handle: vi.fn() }));

vi.mock("electron", () => ({
  ipcMain: { handle },
}));

describe("registerIpcHandlers", () => {
  it("registers a ping handler that replies with pong", () => {
    registerIpcHandlers();

    expect(handle).toHaveBeenCalledTimes(1);
    const [channel, handler] = handle.mock.calls[0] as [string, () => string];
    expect(channel).toBe(IpcChannels.ping);
    expect(handler()).toBe("pong");
  });
});
