// AI 무료음악 자동화 엔진 — 바깥 껍데기(2026-11-04, 플랜 docs/PLAN_20261104_ENGINE_INSTALLER.md).
// 하는 일: 작업 표시줄 아이콘·상태 창, 한 번만 실행, PC 켤 때 자동 실행, 엔진(../engine/src/main.mjs)을 Electron 안의 Node로 띄우기,
// 꺼지면 다시 띄우기, 예전에 손으로 켠 엔진 정리, 새 버전 알림, 끌 때 엔진이 띄운 음악 엔진(ACE-Step·YuE2)까지 함께 끄기.
// 엔진 코드는 고치지 않고 그대로 담는다 — 기능은 engine/src에서 계속 추가한다.
const { app, BrowserWindow, Menu, Tray, ipcMain, nativeImage, shell } = require("electron");
const { spawn, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const SITE = "https://free-music-studio.buylife.xyz";
const LATEST_URL = `${SITE}/downloads/engine-latest.json`;
const PORT = 47821;
const STATUS_URL = `http://127.0.0.1:${PORT}/status`;
const DATA_DIR = path.join(process.env.LOCALAPPDATA || path.join(require("node:os").homedir(), "AppData", "Local"), "FreeMusicEngine");
const ENGINE_DIR = app.isPackaged ? path.join(process.resourcesPath, "engine") : path.join(__dirname, "..", "engine");
const ICON = app.isPackaged ? path.join(process.resourcesPath, "icon.png") : path.join(__dirname, "build", "icon.png");

// 한 번만 실행 — 두 번째로 켜면 켜진 창을 앞으로(사이트 [엔진 켜기]도 여기로 들어온다)
if (!app.requestSingleInstanceLock()) {
  app.quit();
  return;
}
// 사이트 [엔진 켜기] 주소·자동 실행은 설치한 프로그램만 등록한다(개발 모드로 켜면 개발용 electron.exe가 등록돼 꼬였음 — 2026-11-04)
if (app.isPackaged) app.setAsDefaultProtocolClient("freemusic-engine");

let tray = null;
let win = null;
let child = null;
let quitting = false;
let restarts = 0;
const shell_ = { pairCode: "", status: null, lines: [], running: false, message: "", latest: null };

const settingsFile = () => path.join(app.getPath("userData"), "desktop-settings.json");
function readSettings() {
  try {
    return JSON.parse(fs.readFileSync(settingsFile(), "utf8"));
  } catch {
    return {};
  }
}
function writeSettings(s) {
  fs.mkdirSync(path.dirname(settingsFile()), { recursive: true });
  fs.writeFileSync(settingsFile(), JSON.stringify(s, null, 2));
}
const autoStart = () => app.getLoginItemSettings().openAtLogin;
function setAutoStart(on) {
  if (app.isPackaged) app.setLoginItemSettings({ openAtLogin: on, args: ["--hidden"] });
}

function push(state) {
  win?.webContents.send("state", { ...shell_, autoStart: autoStart(), version: app.getVersion(), ...state });
  updateTray();
}

function addLines(text) {
  for (const line of String(text).split(/\r?\n/)) {
    if (!line.trim()) continue;
    shell_.lines.push(line);
    const code = /연결 코드:\s*(\d{6})/.exec(line);
    if (code) shell_.pairCode = code[1];
  }
  if (shell_.lines.length > 300) shell_.lines.splice(0, shell_.lines.length - 300);
  push();
}

async function getStatus() {
  try {
    const r = await fetch(STATUS_URL, { signal: AbortSignal.timeout(1500) });
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}

/**
 * 손으로 켠 예전 엔진(PowerShell `node src/main.mjs`)을 찾아 끈다 — 우리 자식은 빼고.
 * 회원 PC의 다른 Node 프로그램을 끄지 않도록: node.exe + 명령이 src/main.mjs로 끝남 + 그 실행 폴더에 엔진 파일(src/acestep.mjs)이 있을 때만.
 */
function killManualEngines() {
  const ps =
    "Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | " +
    `Where-Object { $_.ProcessId -ne ${child?.pid ?? 0} -and $_.CommandLine -match 'src[\\\\/]main\\.mjs"?\\s*$' } | ` +
    "ForEach-Object { [pscustomobject]@{ pid = $_.ProcessId; cmd = $_.CommandLine } } | ConvertTo-Json -Compress";
  const r = spawnSync("powershell.exe", ["-NoProfile", "-Command", ps], { encoding: "utf8", windowsHide: true });
  let list = [];
  try {
    const j = JSON.parse(String(r.stdout || "").trim() || "[]");
    list = Array.isArray(j) ? j : [j];
  } catch {}
  const killed = [];
  for (const { pid, cmd } of list) {
    // 명령에 폴더가 적혀 있으면 그 폴더, 아니면(상대 경로 실행) 확인할 길이 없어 연결 문 주인인지로 판단 — 연결 문을 쓰는 node만 남아 있음
    const m = /"?([^"]*?)[\\/]src[\\/]main\.mjs/.exec(cmd || "");
    if (m && m[1] && !fs.existsSync(path.join(m[1], "src", "acestep.mjs"))) continue;
    spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], { windowsHide: true });
    killed.push(pid);
  }
  return killed;
}

function killTree(c) {
  if (!c || c.exitCode != null) return;
  spawnSync("taskkill", ["/PID", String(c.pid), "/T", "/F"], { windowsHide: true });
}

async function startEngine() {
  if (child && child.exitCode == null) return;
  // 이미 다른 엔진이 연결 문을 쓰고 있으면(예전에 PowerShell로 켠 엔진) 끄고 우리가 띄운다
  if (await getStatus()) {
    const pids = killManualEngines();
    shell_.message = pids.length ? `예전에 켜 둔 엔진을 끄고 새로 켰습니다(PID ${pids.join(", ")}).` : "";
    await new Promise((r) => setTimeout(r, 2500));
  }
  shell_.pairCode = "";
  child = spawn(process.execPath, [path.join(ENGINE_DIR, "src", "main.mjs")], {
    cwd: ENGINE_DIR,
    windowsHide: true,
    env: { ...process.env, ELECTRON_RUN_AS_NODE: "1", FMS_DESKTOP: app.getVersion() },
    stdio: ["ignore", "pipe", "pipe"],
  });
  shell_.running = true;
  child.stdout.on("data", addLines);
  child.stderr.on("data", addLines);
  child.on("exit", (code) => {
    shell_.running = false;
    addLines(`— 엔진이 꺼졌습니다(코드 ${code})`);
    if (quitting) return;
    // 갑자기 꺼지면 잠시 뒤 다시 켠다(계속 꺼지면 3번에서 멈추고 창에 알림)
    if (restarts < 3) {
      restarts += 1;
      setTimeout(startEngine, 5000);
    } else {
      shell_.message = "엔진이 계속 꺼집니다. [기록 보기]의 마지막 줄을 확인하거나 [엔진 다시 켜기]를 눌러 주세요.";
      push();
    }
  });
  push();
}

async function restartEngine() {
  restarts = 0;
  killTree(child);
  await new Promise((r) => setTimeout(r, 1500));
  await startEngine();
}

// 상태 읽기 — 2초마다(창·아이콘 표시)
setInterval(async () => {
  const s = await getStatus();
  shell_.status = s;
  if (s?.ready) restarts = 0;
  push();
}, 2000);

/** 새 버전 확인 — 사이트의 engine-latest.json(없으면 조용히 넘어감) */
const newer = (a, b) => {
  const pa = String(a).split(".").map(Number), pb = String(b).split(".").map(Number);
  for (let i = 0; i < 3; i++) if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0);
  return false;
};
async function checkLatest() {
  try {
    const r = await fetch(LATEST_URL, { signal: AbortSignal.timeout(8000), cache: "no-store" });
    const j = r.ok ? await r.json() : null;
    shell_.latest = j && typeof j.version === "string" && newer(j.version, app.getVersion()) ? j : null;
    push();
  } catch {}
}

function statusText() {
  const s = shell_.status;
  if (!shell_.running) return "꺼짐";
  if (!s) return "켜는 중";
  return s.ready ? "준비됨" : s.stage || "준비 중";
}

function updateTray() {
  if (!tray) return;
  tray.setToolTip(`AI 무료음악 엔진 · ${statusText()}`);
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: `상태: ${statusText()}`, enabled: false },
      { label: "상태 창 열기", click: showWindow },
      { label: "사이트 열기", click: () => shell.openExternal(SITE) },
      { label: "노래 저장 폴더 열기", click: () => openLibrary() },
      { type: "separator" },
      { label: "PC 켤 때 자동 실행", type: "checkbox", checked: autoStart(), click: (i) => (setAutoStart(i.checked), push()) },
      { label: "엔진 다시 켜기", click: restartEngine },
      { type: "separator" },
      { label: "끄기", click: quitAll },
    ])
  );
}

function openLibrary() {
  const dir = shell_.status?.libraryDir;
  shell.openPath(dir && fs.existsSync(dir) ? dir : DATA_DIR);
}

function showWindow() {
  if (!win) {
    win = new BrowserWindow({
      width: 460,
      height: 820,
      resizable: true,
      title: "AI 무료음악 자동화 엔진",
      icon: ICON,
      backgroundColor: "#070b14",
      autoHideMenuBar: true,
      webPreferences: { preload: path.join(__dirname, "preload.cjs"), contextIsolation: true, nodeIntegration: false },
    });
    win.loadFile(path.join(__dirname, "status.html"));
    win.webContents.on("did-finish-load", () => {
      push();
      // 개발 확인용: FMS_DESKTOP_SNAPSHOT=<파일.png>이면 8초 뒤 창 화면을 저장한다(화면 캡처가 막힌 환경에서 모양 확인)
      const snap = process.env.FMS_DESKTOP_SNAPSHOT;
      if (snap) setTimeout(() => win.webContents.capturePage().then((img) => fs.writeFileSync(snap, img.toPNG()), () => {}), 8000);
    });
    // X는 숨기기만 — 완전히 끄려면 [끄기]
    win.on("close", (e) => {
      if (!quitting) {
        e.preventDefault();
        win.hide();
      }
    });
  }
  win.show();
  win.focus();
}

function quitAll() {
  quitting = true;
  killTree(child);
  app.quit();
}

ipcMain.handle("action", async (_e, name, value) => {
  if (name === "site") return shell.openExternal(SITE);
  if (name === "engine-page") return shell.openExternal(`${SITE}/engine`);
  if (name === "library") return openLibrary();
  if (name === "logs") return shell.openPath(DATA_DIR);
  if (name === "restart") return restartEngine();
  if (name === "autostart") return (setAutoStart(!!value), push());
  if (name === "download" && shell_.latest?.url) return shell.openExternal(shell_.latest.url);
  if (name === "quit") return quitAll();
});

app.on("second-instance", () => showWindow());
app.on("before-quit", () => {
  quitting = true;
  killTree(child);
});
app.on("window-all-closed", (e) => e.preventDefault()); // 창을 닫아도 작업 표시줄에 남는다

app.whenReady().then(async () => {
  // 처음 설치한 뒤 한 번: 자동 실행 켜기(회원이 끄면 그대로 둔다)
  const st = readSettings();
  if (!st.autoStartInitialized) {
    setAutoStart(true);
    writeSettings({ ...st, autoStartInitialized: true });
  }
  tray = new Tray(nativeImage.createFromPath(ICON).resize({ width: 16, height: 16 }));
  tray.on("click", showWindow);
  updateTray();
  if (!process.argv.includes("--hidden")) showWindow();
  await startEngine();
  checkLatest();
  setInterval(checkLatest, 6 * 60 * 60 * 1000);
});
