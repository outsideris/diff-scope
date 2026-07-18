import { existsSync } from "node:fs";
import { join } from "node:path";
import { app, BrowserWindow } from "electron";
import { registerIpcHandlers } from "./ipc";
import { RepositoryStore } from "./store/repositories";

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

app.whenReady().then(() => {
  // 개발 실행에서도 Dock에 앱 아이콘을 표시한다 (패키징 시에는 icns가 대신한다)
  if (process.platform === "darwin") {
    const iconPath = join(__dirname, "../../resources/icon.png");
    if (existsSync(iconPath)) app.dock?.setIcon(iconPath);
  }

  const store = new RepositoryStore(join(app.getPath("userData"), "repositories.json"));
  registerIpcHandlers(store);
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
