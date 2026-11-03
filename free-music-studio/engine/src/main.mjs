#!/usr/bin/env node
// AI 무료음악 자동화 엔진 0.1 — 실행: `node src/main.mjs`
// 순서: 연결 문 열기(상태 「설치 중」) → ACE-Step 설치 확인 → 내부 서버 실행 → 「준비됨」.
// 시험용: FMS_ACESTEP_DIR(이미 설치된 ACE-Step 폴더) + FMS_PYTHON(그 폴더의 파이썬)이 있으면 설치를 건너뛰고 그 파이썬으로 띄운다.
import { spawn, spawnSync } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { ensureInstalled, killStaleAcestep, pickFreePort, hasFfmpeg, hasNvidia, launch, nvidiaVramGb, profileEnv, waitHealthy } from "./acestep.mjs";
import { checkItems, chooseDevice, qualityOptions, qualityProfile } from "./device.mjs";
import { inspectSystem } from "./system.mjs";
import { createGateway, GATEWAY_PORT } from "./gateway.mjs";
import { createLibrary } from "./library.mjs";
import { createQueue } from "./queue.mjs";
import { createRunner } from "./runner.mjs";
import { newToken } from "./security.mjs";

const VERSION = "0.1.10"; // 0.1.1: 내 PC 보관함(/library) · 0.1.2: 저장 폴더 고르기·제목 파일 이름 · 0.1.3: 사이트 안 한글 폴더 고르기(browse) · 0.1.4: 그래픽 메모리별 최고 음질 모델·FLAC 원음·MP3 320k · 0.1.5: PC 검사(/system)·음악 모델 구성 고르기(/quality) · 0.1.6: 작업 대기열(/queue) · 0.1.7: 음악 엔진 기록 파일(acestep-log.txt)·「이미 켜져 있음」 한국어 안내 · 0.1.8: 켜진 뒤 살아 있는지 확인·끌 때 음악 엔진도 함께 끄기 · 0.1.9: 내부 번호를 실행마다 비어 있는 번호로, 남은 음악 엔진은 실행 명령 이름으로 찾아 끄기 · 0.1.10: 음악 엔진이 알려 준 실패 이유를 대기열·엔진 창에 그대로 표시
// 내부 음악 엔진 번호 — 실행마다 비어 있는 번호(0.1.9). 예전에는 47822로 고정해, 남은 음악 엔진이 잡고 있으면 새 음악 엔진이 켜지지 못했다.
const ACESTEP_PORT = await pickFreePort();

const dataDir =
  process.env.FMS_DATA_DIR ||
  (process.platform === "win32"
    ? path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local"), "FreeMusicEngine")
    : path.join(os.homedir(), "Library", "Application Support", "FreeMusicEngine"));
const tokensFile = path.join(dataDir, "paired.json");
const logLine = (s) => process.stdout.write(s.endsWith("\n") ? s : s + "\n");

const device = chooseDevice({ platform: process.platform, arch: process.arch, nvidia: process.platform === "win32" && hasNvidia() });
const vramGb = device.device === "cuda" ? nvidiaVramGb() : null;
const ffmpeg = hasFfmpeg();
const acestepDir = process.env.FMS_ACESTEP_DIR || path.join(dataDir, "acestep");
const checkpointsDir = path.join(acestepDir, "checkpoints");
const engineSettingsFile = path.join(dataDir, "engine-settings.json");

/** 회원이 고른 구성(없거나 이 PC에서 안 되면 추천 구성) */
async function readSavedTier() {
  try {
    return JSON.parse(await readFile(engineSettingsFile, "utf8")).tier ?? "";
  } catch {
    return "";
  }
}
async function systemReport() {
  const sys = await inspectSystem({ storageDir: acestepDir, checkpointsDir, ffmpeg });
  const options = qualityOptions({ device: device.supported ? device.device : "", vramGb: sys.vramGb ?? vramGb, freeGb: sys.freeGb, installedModels: sys.installedModels });
  const recommended = options.find((o) => o.recommended);
  return { system: sys, check: checkItems(sys, device, recommended), options, selected: profile.id, engines: [{ id: "acestep", name: "ACE-Step 1.5", note: "노래·연주곡 생성, 커버, 부분 수정", selected: true }] };
}
const savedTier = await readSavedTier();
const startOptions = qualityOptions({ device: device.supported ? device.device : "", vramGb, freeGb: null });
const savedOption = startOptions.find((o) => o.id === savedTier && o.supported);
let profile = savedOption ?? qualityProfile({ device: device.device, vramGb });
const state = { ready: false, stage: "시작 중", mode: device.mode, device: device.device, note: device.reason, error: "" };

await mkdir(dataDir, { recursive: true });
let tokens = new Set();
try {
  tokens = new Set(JSON.parse(await readFile(tokensFile, "utf8")).tokens ?? []);
} catch {}
const saveTokens = () => writeFile(tokensFile, JSON.stringify({ tokens: [...tokens] }, null, 2));

const acestepKey = newToken(); // 실행할 때마다 새로 — 연결 문만 안다
const library = createLibrary(dataDir);
await library.init();
const queueSourceDir = path.join(dataDir, "queue-src");
const queue = createQueue({
  file: path.join(dataDir, "queue.json"),
  run: createRunner({ port: ACESTEP_PORT, key: acestepKey, library, sourceDir: queueSourceDir }),
  canRun: () => state.ready && !restarting,
  // 취소한 커버 작업의 원곡 파일은 바로 지운다(실패는 [다시 하기]를 위해 남김)
  onFinished: async (job) => {
    if (job.status === "cancelled" && job.source) await rm(path.join(queueSourceDir, job.source.file), { force: true });
    logLine(`🎵 대기열: ${job.title} — ${job.stage}${job.error ? ` (${job.error})` : ""}`);
    if (job.status === "failed") logLine(`   자세한 이유는 음악 엔진 기록 파일에 있습니다: ${aceLogFile}`);
  },
  log: (e) => logLine(`⚠ 대기열 오류: ${e instanceof Error ? e.message : e}`),
});
await queue.load();
const gateway = createGateway({
  version: VERSION,
  getState: () => ({ ...state, paired: tokens.size > 0, features: ["library", "folder", "browse", "quality", "system", "queue"], libraryDir: library.dir, quality: { ...profile, vramGb, ffmpeg } }),
  systemReport,
  setQuality,
  queue,
  queueSourceDir,
  library,
  ffmpeg,
  mp3CacheDir: path.join(dataDir, "mp3-cache"),
  tokens,
  saveTokens,
  acestepPort: ACESTEP_PORT,
  acestepKey,
  onPairCode: (code) => logLine(`\n  🔑 연결 코드: ${code}  (사이트 「내 PC 엔진」 화면에 입력)\n`),
});
gateway.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    logLine(`\n⚠ 엔진이 이미 켜져 있습니다(연결 문 ${GATEWAY_PORT}번을 다른 엔진이 쓰는 중).`);
    logLine("   예전 엔진 창을 닫고 다시 실행해 주세요. 창이 안 보이면 PowerShell에서:");
    logLine(`   netstat -ano | findstr ${GATEWAY_PORT}   → 맨 끝 숫자(PID)를 확인한 뒤   taskkill /PID <숫자> /T /F`);
  } else logLine(`⚠ 연결 문을 열지 못했습니다: ${err.message}`);
  process.exit(1);
});
gateway.listen(GATEWAY_PORT, "127.0.0.1", () => {
  logLine(`AI 무료음악 자동화 엔진 ${VERSION} — 연결 문 http://127.0.0.1:${GATEWAY_PORT}  · ${device.mode}`);
  logLine(`  🎚️ 음질: ${profile.label}${vramGb ? ` (그래픽 메모리 ${vramGb}GB)` : ""} · MP3 변환 ${ffmpeg ? "가능" : "불가(ffmpeg 없음 — FLAC 원음만)"}`);
});

let child = null;
let restarting = false;
let installedDir = process.env.FMS_ACESTEP_DIR || "";

/** 윈도우에서 uv run이 띄운 파이썬까지 함께 끈다 */
function killTree(c) {
  if (!c || c.exitCode != null) return Promise.resolve();
  return new Promise((resolve) => {
    c.once("exit", () => resolve());
    if (process.platform === "win32") spawn("taskkill", ["/pid", String(c.pid), "/T", "/F"], { windowsHide: true });
    else c.kill();
    setTimeout(resolve, 10_000);
  });
}

// 음악 엔진(ACE-Step)이 화면에 쓰는 내용 — 곡을 못 만들었을 때 이유를 찾을 수 있게 데이터 폴더에 남긴다(켤 때마다 새로).
const aceLogFile = path.join(dataDir, "acestep-log.txt");
let aceLog = null;
const writeAceLog = (d) => aceLog?.write(d);

/** 지금 구성(profile)으로 음악 엔진(ACE-Step)을 띄우고 준비될 때까지 기다린다 */
async function startMusicEngine() {
  state.ready = false;
  state.error = "";
  aceLog?.end();
  aceLog = createWriteStream(aceLogFile, { flags: "w" });
  aceLog.write(`# ${new Date().toISOString()} · 엔진 ${VERSION} · 구성 ${profile.label}\n`);
  // 예전 엔진이 남긴 음악 엔진 서버를 먼저 끈다(그래픽 메모리를 잡고 있을 수 있음). 내부 번호는 실행마다 비어 있는 번호라 부딪히지 않는다.
  const stale = killStaleAcestep();
  if (stale.length) {
    logLine(`… 예전 엔진이 남긴 음악 엔진을 정리했습니다(PID ${stale.join(", ")})`);
    await new Promise((r) => setTimeout(r, 1500));
  }
  if (process.env.FMS_ACESTEP_DIR && process.env.FMS_PYTHON) {
    state.stage = "음악 엔진 켜는 중";
    const dir = process.env.FMS_ACESTEP_DIR;
    child = spawn(process.env.FMS_PYTHON, ["-c", "from acestep.api_server import main; main()"], {
      cwd: dir,
      windowsHide: true,
      env: {
        ...process.env,
        PYTHONPATH: dir,
        ACESTEP_API_HOST: "127.0.0.1",
        ACESTEP_API_PORT: String(ACESTEP_PORT),
        ACESTEP_API_KEY: acestepKey,
        ACESTEP_DEVICE: device.device,
        ...profileEnv(profile),
      },
    });
    child.stdout.on("data", writeAceLog);
    child.stderr.on("data", writeAceLog);
  } else {
    installedDir = await ensureInstalled(dataDir, { onStage: (s) => ((state.stage = s), logLine(`… ${s}`)) });
    state.stage = "음악 엔진 켜는 중";
    child = launch(installedDir, { port: ACESTEP_PORT, apiKey: acestepKey, device: device.device, profile }, writeAceLog);
  }
  child.on("exit", (code) => {
    if (restarting) return;
    state.ready = false;
    state.stage = "멈춤";
    state.error = `음악 엔진이 멈췄습니다(코드 ${code}). 엔진을 다시 실행해 주세요.`;
    logLine(`⚠ ${state.error}`);
  });
  const ok = await waitHealthy(ACESTEP_PORT);
  if (!ok) throw new Error("음악 엔진이 3분 안에 켜지지 않았습니다.");
  // 다른 음악 엔진이 대신 대답했을 수 있다 — 우리가 띄운 음악 엔진이 살아 있어야 준비된 것
  await new Promise((r) => setTimeout(r, 2000));
  if (child.exitCode != null) throw new Error(`음악 엔진이 켜지자마자 꺼졌습니다(코드 ${child.exitCode}). 자세한 이유: ${aceLogFile}`);
  state.ready = true;
  state.stage = "준비됨";
  void queue.pump(); // 기다리던 작업이 있으면 이어서 만든다
}

/**
 * 음악 모델 구성 바꾸기 — 저장하고 음악 엔진을 새 구성으로 다시 켠다(새 모델은 첫 생성 때 받음).
 * @returns {Promise<{ ok: true, quality: object } | { ok: false, error: string, status: number }>}
 */
async function setQuality(tierId) {
  if (restarting) return { ok: false, status: 409, error: "구성을 바꾸는 중입니다. 잠시 뒤 다시 시도해 주세요." };
  const report = await systemReport();
  const opt = report.options.find((o) => o.id === tierId);
  if (!opt) return { ok: false, status: 400, error: "없는 구성입니다." };
  if (!opt.supported) return { ok: false, status: 400, error: opt.reason };
  await writeFile(engineSettingsFile, JSON.stringify({ tier: opt.id }, null, 2));
  if (opt.id === profile.id && state.ready) return { ok: true, quality: { ...profile, vramGb, ffmpeg } };
  const { supported, recommended, installed, reason, ...tier } = opt;
  profile = tier;
  logLine(`🎚️ 음질 구성 바꾸는 중: ${profile.label}`);
  restarting = true;
  state.ready = false;
  state.stage = "구성 바꾸는 중";
  (async () => {
    try {
      await killTree(child);
      restarting = false;
      await startMusicEngine();
      logLine(`✔ 새 구성으로 준비됨 — ${profile.label}`);
    } catch (err) {
      restarting = false;
      state.stage = "오류";
      state.error = err.message;
      logLine(`⚠ ${err.message}`);
    }
  })();
  return { ok: true, quality: { ...profile, vramGb, ffmpeg } };
}

// 엔진을 끌 때(Ctrl+C·창 닫기) 음악 엔진(python)도 함께 끈다 — 남으면 다음 엔진이 내부 번호를 못 잡는다.
const killChildNow = () => {
  if (!child || child.exitCode != null) return;
  if (process.platform === "win32") spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true });
  else child.kill();
};
process.on("exit", killChildNow);
for (const sig of ["SIGINT", "SIGTERM", "SIGHUP", "SIGBREAK"]) process.on(sig, () => process.exit(0));

if (!device.supported) {
  state.stage = "미지원";
  state.error = device.reason;
  logLine(`⚠ ${device.reason}`);
} else {
  try {
    await startMusicEngine();
    logLine("✔ 준비됨 — 사이트에서 노래를 만들 수 있습니다.");
    logLine(`  💾 저장 폴더: ${library.dir}  (사이트 「내 PC 엔진」 화면에서 바꿀 수 있음)`);
  } catch (err) {
    state.stage = "오류";
    state.error = err.message;
    logLine(`⚠ ${err.message}`);
  }
}
