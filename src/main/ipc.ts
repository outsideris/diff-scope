import { ipcMain } from "electron";
import { IpcChannels } from "../shared/ipc";

export function registerIpcHandlers(): void {
  ipcMain.handle(IpcChannels.ping, () => "pong");
}
