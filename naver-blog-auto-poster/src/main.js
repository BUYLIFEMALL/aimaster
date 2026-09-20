"use strict";

const path = require("node:path");
const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const { ensureNaverSession } = require("./lib/naverSession");
const { inspectEditorStructure } = require("./lib/blogEditorInspector");
const { fillTitleAndBody, insertImage, fillTags, selectCategory } = require("./lib/naverBlogAutomation");

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
    height: 860,
    resizable: true,
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

// 프로토타입 2 — 사용자가 "네이버 세션 확인"으로 연 브라우저 창에서 블로그 글쓰기
// 화면으로 직접 이동한 뒤 이 버튼을 누르면, 현재 화면(모든 iframe 포함)의 구조를
// 로컬 JSON 파일로 저장한다.
ipcMain.handle("naver:inspectEditor", async () => {
  if (!naverContext) {
    return {
      ok: false,
      error: "먼저 '네이버 세션 확인' 버튼으로 브라우저를 연 뒤, 그 창에서 블로그 글쓰기 화면으로 이동해주세요."
    };
  }

  try {
    const pages = naverContext.pages();
    const page = pages[pages.length - 1];
    const outPath = await inspectEditorStructure(page, getRuntimeRoot());
    return { ok: true, outPath };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
});

// 프로토타입 3 — 제목/본문 자동 입력 테스트. 발행/저장은 절대 대신 누르지 않는다 —
// 사람이 결과를 직접 확인하고 최종 발행하는 구조를 유지한다.
ipcMain.handle("naver:autoFillPost", async (_event, { title, body } = {}) => {
  if (!naverContext) {
    return {
      ok: false,
      error: "먼저 '네이버 세션 확인' 버튼으로 브라우저를 연 뒤, 그 창에서 블로그 글쓰기 화면으로 이동해주세요."
    };
  }
  if (!title || !body) {
    return { ok: false, error: "제목과 본문을 모두 입력해주세요." };
  }

  try {
    const pages = naverContext.pages();
    const page = pages[pages.length - 1];
    await fillTitleAndBody(page, { title, body });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
});

// 프로토타입 3 확장 — 이미지 업로드. Playwright가 OS 파일창을 가로채기 때문에, 어떤
// 파일을 넣을지는 우리 앱이 먼저 사용자에게 직접 물어봐야 한다.
ipcMain.handle("naver:insertImage", async () => {
  if (!naverContext) {
    return {
      ok: false,
      error: "먼저 '네이버 세션 확인' 버튼으로 브라우저를 연 뒤, 그 창에서 블로그 글쓰기 화면으로 이동해주세요."
    };
  }

  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: "블로그에 넣을 이미지 선택",
    properties: ["openFile"],
    filters: [{ name: "이미지", extensions: ["jpg", "jpeg", "png", "gif", "webp"] }]
  });
  if (canceled || filePaths.length === 0) {
    return { ok: false, error: "이미지 선택이 취소되었습니다." };
  }

  try {
    const pages = naverContext.pages();
    const page = pages[pages.length - 1];
    await insertImage(page, filePaths[0]);
    return { ok: true, filePath: filePaths[0] };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
});

// 프로토타입 3 확장 — 태그 입력. "발행" 버튼은 사람이 직접 눌러서 발행 설정창을 열어야
// 한다 — 이 앱은 그 버튼을 절대 대신 누르지 않는다.
ipcMain.handle("naver:fillTags", async (_event, { tags } = {}) => {
  if (!naverContext) {
    return {
      ok: false,
      error: "먼저 '네이버 세션 확인' 버튼으로 브라우저를 연 뒤, 그 창에서 블로그 글쓰기 화면으로 이동해주세요."
    };
  }
  if (!Array.isArray(tags) || tags.length === 0) {
    return { ok: false, error: "태그를 하나 이상 입력해주세요." };
  }

  try {
    const pages = naverContext.pages();
    const page = pages[pages.length - 1];
    await fillTags(page, tags);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
});

// 프로토타입 3 확장 — 카테고리 선택. "발행" 버튼은 사람이 직접 눌러서 발행 설정창을
// 열어야 한다 — 이 앱은 그 버튼을 절대 대신 누르지 않는다.
ipcMain.handle("naver:selectCategory", async (_event, { categoryName } = {}) => {
  if (!naverContext) {
    return {
      ok: false,
      error: "먼저 '네이버 세션 확인' 버튼으로 브라우저를 연 뒤, 그 창에서 블로그 글쓰기 화면으로 이동해주세요."
    };
  }
  if (!categoryName) {
    return { ok: false, error: "카테고리 이름을 입력해주세요." };
  }

  try {
    const pages = naverContext.pages();
    const page = pages[pages.length - 1];
    await selectCategory(page, categoryName);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
});
