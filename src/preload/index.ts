import { contextBridge, ipcRenderer } from "electron";
import { IpcChannels } from "../shared/ipc";

const api = {
  ping: (): Promise<string> => ipcRenderer.invoke(IpcChannels.ping),
};

export type DiffScopeApi = typeof api;

contextBridge.exposeInMainWorld("diffScope", api);
