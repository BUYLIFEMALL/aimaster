"use strict";

const path = require("node:path");
const fs = require("node:fs");
const { app, BrowserWindow, ipcMain, dialog, shell } = require("electron");
const { ensureNaverSession } = require("./lib/naverSession");
const { inspectEditorStructure } = require("./lib/blogEditorInspector");
const { runDraftStep, runPublishSettingsStep } = require("./lib/naverBlogAutomation");
const { getAimasterToken, setAimasterToken } = require("./lib/appConfig");

// AIMaster 본체 웹사이트 주소. "웹 로그인 -> 토큰 발급 -> 여기 붙여넣기"로 계정을
// 연동한다 — 아이디/비밀번호를 이 앱에 직접 입력하지 않는다.
// 주의: 반드시 www까지 정확히 써야 한다 — buylife.xyz(www 없음)는 www.buylife.xyz로
// 307 리다이렉트되는데, 이때 fetch가 리다이렉트를 자동으로 따라가면서 서로 다른
// 하위 도메인으로 이동하는 것으로 간주해 Authorization 헤더를 떼어내 버린다
// (2026-09-20 실사용 테스트에서 "Authorization 헤더가 없습니다" 오류로 발견).
const AIMASTER_BASE_URL = "https://www.buylife.xyz";

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
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
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

async function checkAimasterToken(token) {
  if (!token) return { linked: false };
  try {
    const response = await fetch(`${AIMASTER_BASE_URL}/api/naver-blog-auto-poster/whoami`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      return { linked: false, error: body.error || `연동 확인 실패 (${response.status})` };
    }
    const body = await response.json();
    return { linked: true, email: body.email, name: body.name };
  } catch (error) {
    return { linked: false, error: error instanceof Error ? error.message : String(error) };
  }
}

// AIMaster 계정 연동 상태 조회 — 앱 시작 시 저장된 토큰이 아직 유효한지 확인한다.
ipcMain.handle("aimaster:getStatus", async () => {
  const token = getAimasterToken(getRuntimeRoot());
  return checkAimasterToken(token);
});

// 토큰 붙여넣기 — 저장 전에 바로 유효성을 확인해서 결과를 알려준다.
ipcMain.handle("aimaster:setToken", async (_event, token) => {
  const trimmed = (token || "").trim();
  if (!trimmed) return { linked: false, error: "토큰을 입력해주세요." };

  const result = await checkAimasterToken(trimmed);
  if (result.linked) {
    setAimasterToken(getRuntimeRoot(), trimmed);
  }
  return result;
});

ipcMain.handle("aimaster:clearToken", async () => {
  setAimasterToken(getRuntimeRoot(), null);
  return { linked: false };
});

// AI 초안 생성 — 서버가 사용자 본인의 OpenAI/Gemini 키로 대신 호출하고 결과(1차 초안 ->
// 2차 셀프 리뷰를 거친 최종 제목/본문, 선택적으로 이미지)만 돌려준다. 이 앱은 API 키를
// 절대 직접 보관/사용하지 않는다. 이미지는 base64로 받아서 이 컴퓨터의 runtime 폴더에
// 파일로 저장해둔다 — Playwright의 이미지 삽입(insertImage)이 실제 파일 경로를 필요로
// 하기 때문(브라우저의 filechooser 이벤트에 경로를 넘기는 방식이라 base64를 직접 못 씀).
ipcMain.handle("aimaster:generateDraft", async (_event, { topic, includeImage, imageModel } = {}) => {
  const token = getAimasterToken(getRuntimeRoot());
  if (!token) {
    return { ok: false, error: "먼저 위에서 AIMaster 계정 연동을 완료해주세요." };
  }
  if (!topic || !topic.trim()) {
    return { ok: false, error: "주제를 입력해주세요." };
  }

  try {
    const response = await fetch(`${AIMASTER_BASE_URL}/api/naver-blog-auto-poster/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ topic: topic.trim(), includeImage: Boolean(includeImage), imageModel })
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { ok: false, error: body.error || `생성 실패 (${response.status})` };
    }

    let imagePath = null;
    let imageDataUrl = null;
    if (body.image?.base64) {
      const imagesDir = path.join(getRuntimeRoot(), "generated-images");
      fs.mkdirSync(imagesDir, { recursive: true });
      const ext = body.image.mimeType?.includes("png") ? "png" : "jpg";
      imagePath = path.join(imagesDir, `ai-image-${Date.now()}.${ext}`);
      fs.writeFileSync(imagePath, Buffer.from(body.image.base64, "base64"));
      // 렌더러가 미리보기로 바로 쓸 수 있도록 data URL도 같이 내려준다(파일 경로는
      // Playwright 삽입 전용 — contextIsolation 렌더러에서 로컬 파일을 직접 못 읽음).
      imageDataUrl = `data:${body.image.mimeType || "image/png"};base64,${body.image.base64}`;
    }

    return {
      ok: true,
      title: body.title,
      body: body.body,
      imagePath,
      imageDataUrl,
      imageError: body.imageError || null
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
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

// 1단계 — 초안 작성(제목+본문+선택적 이미지). "발행" 버튼을 열기 전에 하는 작업이라
// 사람의 발행 버튼 클릭이 필요 없다. 이미지를 포함하면서 AI가 이미 생성해둔 파일 경로
// (aiImagePath)가 있으면 그걸 그대로 쓰고, 없을 때만 Playwright가 가로채는 OS 파일창을
// 앱이 먼저 띄워 사용자에게 직접 물어본다.
ipcMain.handle("naver:runDraftStep", async (_event, { title, body, includeImage, aiImagePath } = {}) => {
  if (!naverContext) {
    return {
      ok: false,
      error: "먼저 '네이버 세션 확인' 버튼으로 브라우저를 연 뒤, 그 창에서 블로그 글쓰기 화면으로 이동해주세요."
    };
  }
  if (!title || !body) {
    return { ok: false, error: "제목과 본문을 모두 입력해주세요." };
  }

  let imagePath = includeImage ? aiImagePath || null : null;
  if (includeImage && !imagePath) {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: "블로그에 넣을 이미지 선택",
      properties: ["openFile"],
      filters: [{ name: "이미지", extensions: ["jpg", "jpeg", "png", "gif", "webp"] }]
    });
    if (canceled || filePaths.length === 0) {
      return { ok: false, error: "이미지 선택이 취소되었습니다." };
    }
    imagePath = filePaths[0];
  }

  try {
    const pages = naverContext.pages();
    const page = pages[pages.length - 1];
    await runDraftStep(page, { title, body, imagePath });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
});

// 2단계 — 발행 정보 입력(태그+카테고리). 반드시 사람이 먼저 브라우저 창에서 "발행" 버튼을
// 직접 눌러 발행 설정창을 연 뒤에 써야 한다 — 이 앱은 그 버튼을 절대 대신 누르지 않는다.
ipcMain.handle("naver:runPublishSettingsStep", async (_event, { tags, categoryName } = {}) => {
  if (!naverContext) {
    return {
      ok: false,
      error: "먼저 '네이버 세션 확인' 버튼으로 브라우저를 연 뒤, 그 창에서 블로그 글쓰기 화면으로 이동해주세요."
    };
  }
  if ((!Array.isArray(tags) || tags.length === 0) && !categoryName) {
    return { ok: false, error: "태그 또는 카테고리 중 하나는 입력해주세요." };
  }

  try {
    const pages = naverContext.pages();
    const page = pages[pages.length - 1];
    await runPublishSettingsStep(page, { tags, categoryName });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
});
