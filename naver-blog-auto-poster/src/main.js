"use strict";

const path = require("node:path");
const { app, BrowserWindow, ipcMain } = require("electron");
const { ensureNaverSession } = require("./lib/naverSession");

let mainWindow = null;
let naverContext = null; // 프로토타입 1: 세션 확인 중 열어둔 Playwright context (재사용).

function getRuntimeRoot() {
  // 개발 중에는 프로젝트 폴더 안 runtime/, 빌드 후에는 사용자 데이터 폴더 안 runtime/.
  return app.isPackaged
    ? path.join(app.getPath("userData"), "runtime")
    : path.join(__dirname, "..", "runtime");
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 480,
    height: 420,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));
}

app.whenReady().then(() => {
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  naverContext?.close().catch(() => {});
});

// 렌더러(UI)의 "네이버 세션 확인" 버튼 → 프로토타입 1 핵심 동작.
ipcMain.handle("naver:checkSession", async () => {
  const sendStatus = (status) => mainWindow?.webContents.send("naver:sessionStatus", status);

  try {
    if (naverContext) {
      await naverContext.close().catch(() => {});
      naverContext = null;
    }

    const { context, profileDir } = await ensureNaverSession({
      runtimeRoot: getRuntimeRoot(),
      accountKey: "default",
      onStatus: sendStatus
    });
    naverContext = context;

    return { ok: true, profileDir };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
});
