import { existsSync } from "node:fs";
import { join } from "node:path";
import { app, BrowserWindow } from "electron";
import { registerIpcHandlers } from "./ipc";
import { SidebarChangedEvent } from "../shared/ipc";
import { RepositoryStore } from "./store/repositories";
import { SidebarWatcher } from "./watcher";

function createWindow(): void {
  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false,
    },
  });

  if (process.env["ELECTRON_RENDERER_URL"]) {
    window.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    window.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

// userData 경로를 dev(diff-scope 이름)와 패키징(DiffScope 이름) 양쪽에서 동일하게 유지해
// 등록된 저장소 목록(repositories.json)이 이어지도록 한다.
app.setName("diff-scope");

app.whenReady().then(() => {
  // 개발 실행에서도 Dock에 앱 아이콘을 표시한다 (패키징 시에는 icns가 대신한다)
  if (process.platform === "darwin") {
    const iconPath = join(__dirname, "../../resources/icon.png");
    if (existsSync(iconPath)) app.dock?.setIcon(iconPath);
  }

  const store = new RepositoryStore(join(app.getPath("userData"), "repositories.json"));
  const watcher = new SidebarWatcher(() => {
    for (const window of BrowserWindow.getAllWindows()) {
      window.webContents.send(SidebarChangedEvent);
    }
  });
  watcher.start();
  app.on("before-quit", () => watcher.dispose());

  registerIpcHandlers(store, watcher);
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
