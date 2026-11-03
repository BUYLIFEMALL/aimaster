#!/usr/bin/env node
// AI 무료음악 자동화 엔진 0.1 — 실행: `node src/main.mjs`
// 순서: 연결 문 열기(상태 「설치 중」) → ACE-Step 설치 확인 → 내부 서버 실행 → 「준비됨」.
// 시험용: FMS_ACESTEP_DIR(이미 설치된 ACE-Step 폴더) + FMS_PYTHON(그 폴더의 파이썬)이 있으면 설치를 건너뛰고 그 파이썬으로 띄운다.
import { spawn, spawnSync } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { ensureInstalled, killStaleAcestep, missingModelGb, progressText, watchGrowth, pickFreePort, PYTHON_UTF8_ENV, hasFfmpeg, hasNvidia, launch, nvidiaVramGb, profileEnv, waitHealthy } from "./acestep.mjs";
import { checkItems, chooseDevice, qualityOptions, qualityProfile } from "./device.mjs";
import { inspectSystem, listInstalledModels } from "./system.mjs";
import { createGateway, GATEWAY_PORT } from "./gateway.mjs";
import { createLibrary } from "./library.mjs";
import { createQueue } from "./queue.mjs";
import { createRunner } from "./runner.mjs";
import { newToken } from "./security.mjs";
import { runYue2, yue2Installed, yue2MissingBytes, yue2Support, YUE2_LICENSE } from "./yue2.mjs";

const VERSION = "0.2.1"; // 0.2.1: 처음 받는 ACE-Step 모델·실행 환경도 「받는 중 · 3.2GB / 약 14.9GB」로 표시, 연결 문이 열린 뒤에만 연결 코드, 대기열 저장 한 번에 하나씩 · 0.2.0: 비상업용 음악 엔진 YuE2(새 곡 만들기) · 0.1.1: 내 PC 보관함(/library) · 0.1.2: 저장 폴더 고르기·제목 파일 이름 · 0.1.3: 사이트 안 한글 폴더 고르기(browse) · 0.1.4: 그래픽 메모리별 최고 음질 모델·FLAC 원음·MP3 320k · 0.1.5: PC 검사(/system)·음악 모델 구성 고르기(/quality) · 0.1.6: 작업 대기열(/queue) · 0.1.7: 음악 엔진 기록 파일(acestep-log.txt)·「이미 켜져 있음」 한국어 안내 · 0.1.8: 켜진 뒤 살아 있는지 확인·끌 때 음악 엔진도 함께 끄기 · 0.1.9: 내부 번호를 실행마다 비어 있는 번호로, 남은 음악 엔진은 실행 명령 이름으로 찾아 끄기 · 0.1.10: 음악 엔진이 알려 준 실패 이유를 대기열·엔진 창에 그대로 표시 · 0.1.11: 음악 엔진 글자 UTF-8(한국어 윈도우 cp949 오류 해결)
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
const nvidiaDriver = () => {
  if (device.device !== "cuda") return "";
  const r = spawnSync("nvidia-smi", ["--query-gpu=driver_version", "--format=csv,noheader"], { encoding: "utf8", windowsHide: true });
  return r.status === 0 ? String(r.stdout).trim().split(/\r?\n/)[0] : "";
};
// 비상업용 음악 엔진 YuE2 — 되는 PC인지(윈도우 + NVIDIA 드라이버 580+ + 그래픽 메모리 8GB+)
const yue2 = yue2Support({ platform: process.platform, nvidia: device.device === "cuda", vramGb, driver: nvidiaDriver() });

/** /system에 넣을 YuE2 정보(설치 여부·더 받을 크기) */
async function yue2Report() {
  const base = { id: "yue2", name: "YuE2", note: "노래 만들기 · 비상업용(CC BY-NC 4.0) — 수익 영상·판매에는 쓸 수 없습니다", license: YUE2_LICENSE, selected: false };
  if (!yue2.ok) return { ...base, supported: false, reason: yue2.reason };
  const installed = await yue2Installed(dataDir, yue2.profile).catch(() => false);
  const missing = installed ? 0 : await yue2MissingBytes(dataDir, yue2.profile).catch(() => null);
  return { ...base, supported: true, reason: "", profile: yue2.profile.label, installed, downloadGb: missing == null ? null : Math.round((missing / 1024 ** 3) * 10) / 10 };
}

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
  return {
    system: sys,
    check: checkItems(sys, device, recommended),
    options,
    selected: profile.id,
    engines: [{ id: "acestep", name: "ACE-Step 1.5", note: "노래·연주곡 생성, 커버, 부분 수정 · 상업용 사용 가능", license: "commercial", supported: device.supported, selected: true }, await yue2Report()],
  };
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
const aceRun = createRunner({
  port: ACESTEP_PORT,
  key: acestepKey,
  library,
  sourceDir: queueSourceDir,
  // 이 구성의 모델을 아직 안 받았으면 받는 동안 「음악 모델 받는 중 · 3.2GB / 약 13.5GB」
  watch: { dir: checkpointsDir, missingGb: async () => missingModelGb(profile, await listInstalledModels(checkpointsDir)) },
});
const yue2LogFile = path.join(dataDir, "yue2-log.txt");

/**
 * YuE2 작업 — 그래픽 메모리를 비우려고 ACE-Step을 잠시 끄고, 다음 작업이 YuE2가 아니면 다시 켠다.
 * (16GB 그래픽카드에 ACE-Step XL과 YuE2 BF16을 함께 올리면 메모리가 모자란다)
 */
async function yue2Run(job, signal, stage) {
  if (!yue2.ok) throw new Error(yue2.reason);
  yue2Running = true;
  if (child && child.exitCode == null) {
    stage("그래픽 메모리 비우는 중(ACE-Step 잠시 멈춤)");
    yue2Pausing = true;
    state.ready = false;
    state.stage = "YuE2 사용 중";
    await killTree(child);
  }
  const log = createWriteStream(yue2LogFile, { flags: "w" });
  log.write(`# ${new Date().toISOString()} · 엔진 ${VERSION} · ${yue2.profile.label}\n`);
  try {
    return await runYue2({ dataDir, profile: yue2.profile, library, log: (s) => log.write(s) }, job, signal, stage);
  } catch (err) {
    if (err?.name !== "AbortError") throw new Error(`${err instanceof Error ? err.message : err} (자세한 이유: ${yue2LogFile})`);
    throw err;
  } finally {
    log.end();
    yue2Running = false;
    const next = queue.list().find((j) => j.status === "queued");
    if (next?.engine !== "yue2") resumeAce();
  }
}

/** YuE2 때문에 멈춘 ACE-Step을 다시 켠다(기다리지 않음 — 다 켜지면 startMusicEngine이 대기열을 이어서 돌린다) */
function resumeAce() {
  if (!yue2Pausing || yue2Running) return;
  yue2Pausing = false;
  startMusicEngine().then(
    () => logLine("✔ ACE-Step 다시 준비됨"),
    (e) => ((state.stage = "오류"), (state.error = e.message), logLine(`⚠ ${e.message}`))
  );
}

const queue = createQueue({
  file: path.join(dataDir, "queue.json"),
  run: (job, signal, stage) => (job.engine === "yue2" ? yue2Run(job, signal, stage) : aceRun(job, signal, stage)),
  // ACE-Step 작업은 ACE-Step이 준비돼야, YuE2 작업은 ACE-Step을 켜거나 구성을 바꾸는 중이 아니면 된다
  canRun: (job) => {
    if (job.engine === "yue2") return !restarting && !aceStarting;
    if (yue2Pausing) resumeAce(); // 뒤에 있던 YuE2 작업이 취소돼 ACE-Step이 멈춘 채 남은 경우
    return state.ready && !restarting && !yue2Pausing;
  },
  // 취소한 커버 작업의 원곡 파일은 바로 지운다(실패는 [다시 하기]를 위해 남김)
  onFinished: async (job) => {
    if (job.status === "cancelled" && job.source) await rm(path.join(queueSourceDir, job.source.file), { force: true });
    logLine(`🎵 대기열: ${job.title} — ${job.stage}${job.error ? ` (${job.error})` : ""}`);
    if (job.status === "failed") logLine(`   자세한 이유는 음악 엔진 기록 파일에 있습니다: ${aceLogFile}`);
  },
  log: (e) => logLine(`⚠ 대기열 오류: ${e instanceof Error ? e.message : e}`),
});
await queue.load();
let gatewayOpen = false;
let pendingPairCode = "";
const showPairCode = (code) => logLine(`\n  🔑 연결 코드: ${code}  (사이트 「내 PC 엔진」 화면에 입력)\n`);
const gateway = createGateway({
  version: VERSION,
  getState: () => ({ ...state, paired: tokens.size > 0, features: ["library", "folder", "browse", "quality", "system", "queue", "engines", ...(yue2.ok ? ["yue2"] : [])], libraryDir: library.dir, quality: { ...profile, vramGb, ffmpeg } }),
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
  // 연결 문이 열린 뒤에만 코드를 보인다(이미 켜진 엔진이 있어 실패하면 쓸 수 없는 코드가 먼저 찍혀 헷갈렸음 — 2026-11-04 마스터PC)
  onPairCode: (code) => (gatewayOpen ? showPairCode(code) : (pendingPairCode = code)),
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
  if (yue2.ok) logLine(`  🎛️ 비상업용 음악 엔진 YuE2 사용 가능 — ${yue2.profile.label}`);
  gatewayOpen = true;
  if (pendingPairCode) showPairCode(pendingPairCode);
});

let child = null;
let restarting = false;
let aceStarting = false; // ACE-Step을 켜는 중(이때 YuE2를 띄우면 그래픽 메모리가 겹친다)
let yue2Pausing = false; // YuE2 때문에 ACE-Step을 잠시 끈 상태
let yue2Running = false;
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
  aceStarting = true;
  try {
    await startMusicEngineInner();
  } finally {
    aceStarting = false;
    void queue.pump(); // 기다리던 작업이 있으면 이어서 만든다(실패했어도 YuE2 작업은 돌 수 있다)
  }
}

async function startMusicEngineInner() {
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
        ...PYTHON_UTF8_ENV,
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
    if (restarting || yue2Pausing) return;
    state.ready = false;
    state.stage = "멈춤";
    state.error = `음악 엔진이 멈췄습니다(코드 ${code}). 엔진을 다시 실행해 주세요.`;
    logLine(`⚠ ${state.error}`);
  });
  // 켜는 동안 모델을 받으면 엔진 상태에도 받는 크기를 보인다
  const missingGb = missingModelGb(profile, await listInstalledModels(checkpointsDir));
  const stopWatch = missingGb
    ? watchGrowth(checkpointsDir, (b) => (state.stage = progressText("음악 모델 받는 중(처음 한 번)", b, missingGb)))
    : () => {};
  const ok = await waitHealthy(ACESTEP_PORT).finally(stopWatch);
  if (!ok) throw new Error("음악 엔진이 3분 안에 켜지지 않았습니다.");
  // 다른 음악 엔진이 대신 대답했을 수 있다 — 우리가 띄운 음악 엔진이 살아 있어야 준비된 것
  await new Promise((r) => setTimeout(r, 2000));
  if (child.exitCode != null) throw new Error(`음악 엔진이 켜지자마자 꺼졌습니다(코드 ${child.exitCode}). 자세한 이유: ${aceLogFile}`);
  state.ready = true;
  state.stage = "준비됨";
}

/**
 * 음악 모델 구성 바꾸기 — 저장하고 음악 엔진을 새 구성으로 다시 켠다(새 모델은 첫 생성 때 받음).
 * @returns {Promise<{ ok: true, quality: object } | { ok: false, error: string, status: number }>}
 */
async function setQuality(tierId) {
  if (restarting) return { ok: false, status: 409, error: "구성을 바꾸는 중입니다. 잠시 뒤 다시 시도해 주세요." };
  if (yue2Pausing) return { ok: false, status: 409, error: "YuE2로 곡을 만드는 중입니다. 끝난 뒤 다시 시도해 주세요." };
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
