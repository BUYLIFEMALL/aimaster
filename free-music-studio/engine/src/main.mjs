#!/usr/bin/env node
// AI 무료음악 자동화 엔진 0.1 — 실행: `node src/main.mjs`
// 순서: 연결 문 열기(상태 「설치 중」) → ACE-Step 설치 확인 → 내부 서버 실행 → 「준비됨」.
// 시험용: FMS_ACESTEP_DIR(이미 설치된 ACE-Step 폴더) + FMS_PYTHON(그 폴더의 파이썬)이 있으면 설치를 건너뛰고 그 파이썬으로 띄운다.
import { spawn, spawnSync } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { checkTarget, freeBytes, listItems, moveHeavy, removeBestEffort, removeHeavy, sizeOf, SKIP_DIRS, HEAVY_ENTRIES } from "./storage.mjs";
import { ensureInstalled, hasUv, killStaleAcestep, uvCacheDir, missingModelGb, progressText, watchGrowth, pickFreePort, PYTHON_UTF8_ENV, hasFfmpeg, hasNvidia, launch, nvidiaVramGb, profileEnv, waitHealthy } from "./acestep.mjs";
import { checkItems, chooseDevice, qualityOptions, qualityProfile } from "./device.mjs";
import { inspectSystem, listInstalledModels } from "./system.mjs";
import { createGateway, GATEWAY_PORT } from "./gateway.mjs";
import { createLibrary } from "./library.mjs";
import { createQueue } from "./queue.mjs";
import { createRunner } from "./runner.mjs";
import { masterFile } from "./mastering.mjs";
import { createVideoStudio } from "./video.mjs";
import { newToken } from "./security.mjs";
import { ensureTools, useTools } from "./tools.mjs";
import { runYue2, yue2Installed, yue2MissingBytes, yue2Paths, yue2Support, YUE2_LICENSE } from "./yue2.mjs";
import { pyCatalog, pyEngine, pyInstalled, pyMissingGb, pyPaths, pySupport, removePyEngine, runPyEngine } from "./pyengines.mjs";

const VERSION = "0.6.8"; // 0.6.8: 곡 표지 — 같은 이름 그림을 표지로(GET /library/<id>/art, 목록 arts), MP3 받기에 표지 넣기, 곡 지우기·옮기기에 표지도 함께(기능 "cover") · 0.6.7: 앨범 그림을 노래 저장 폴더에 「곡 제목.png」로(POST /library/art, 기능 "art") · 0.6.6: 효과음 모드(Stable Audio 3, 가사 칸 [SFX], 1초부터) + 공식 앞머리(TrackType) 자동, MiniMax Music 3 24GB 이상 전용 · 0.6.5: MiniMax Music 3 받아 둔 고정 판 폴더를 직접 찾기(골라 받은 모델에 snapshot_download 검사가 「64개 없음」으로 막던 것) · 0.6.4: MiniMax Music 3 부품을 받아 둔 폴더에서 불러오기(오프라인 transformer 실패 수정), 손으로 옮긴 곡을 저장 폴더 세 단계 아래까지 찾기 · 0.6.3: LeVo 2 「No module named 'pkg_resources'」 — 실행 환경에 setuptools<81, runtimeRev로 설치된 PC도 한 번 다시 맞춤 · 0.6.2: LeVo 2 모델을 원본 코드가 지원하는 v1 SongGeneration-base-full로(v2-medium은 LmModel 불러오기 실패) · 0.6.1: GitHub 원본 압축 안 LFS 자리표시 글을 진짜 파일로(LeVo 2 tools/new_prompt.pt, sha256 확인) · 0.6.0: 2차 음악 엔진 MiniMax Music 3(상업용 조건부, diffusers 0.41.0), LeVo 2 「Weights only load failed」 수정(TORCH_FORCE_NO_WEIGHTS_ONLY_LOAD), 추가 엔진 실패 이유에 파이썬 오류 줄 · 0.5.0: 모델 저장 공간 관리 — 모델 저장 폴더 고르기(다른 드라이브로 옮기기·새로 받기, engine-settings.json modelsDir)·항목별 실제 크기·안 쓰는 모델 지우기(/storage), 설치 패키지 보관함도 그 폴더(UV_CACHE_DIR) · 0.4.1: 추가 엔진 설치 실패 수정 — PyTorch 저장소를 보조로(딸린 패키지가 날짜 제한에 걸려 torch를 못 맞추던 것, 마스터PC HeartMuLa 실물) · 0.4.0: 추가 음악 엔진 1차 — HeartMuLa(상업용 노래)·Stable Audio 3(상업용 조건부 연주곡)·LeVo 2(개인용 노래), 그래픽 메모리는 한 번에 한 엔진만 · 0.3.0: 설치 파일(엔진 실행 프로그램 desktop/)과 함께 — uv·ffmpeg 처음 켤 때 받기, 실행 환경 실측 크기(6.1GB)·받는 중 표시 · 0.2.1: 처음 받는 ACE-Step 모델·실행 환경도 「받는 중 · 3.2GB / 약 14.9GB」로 표시, 연결 문이 열린 뒤에만 연결 코드, 대기열 저장 한 번에 하나씩 · 0.2.0: 비상업용 음악 엔진 YuE2(새 곡 만들기) · 0.1.1: 내 PC 보관함(/library) · 0.1.2: 저장 폴더 고르기·제목 파일 이름 · 0.1.3: 사이트 안 한글 폴더 고르기(browse) · 0.1.4: 그래픽 메모리별 최고 음질 모델·FLAC 원음·MP3 320k · 0.1.5: PC 검사(/system)·음악 모델 구성 고르기(/quality) · 0.1.6: 작업 대기열(/queue) · 0.1.7: 음악 엔진 기록 파일(acestep-log.txt)·「이미 켜져 있음」 한국어 안내 · 0.1.8: 켜진 뒤 살아 있는지 확인·끌 때 음악 엔진도 함께 끄기 · 0.1.9: 내부 번호를 실행마다 비어 있는 번호로, 남은 음악 엔진은 실행 명령 이름으로 찾아 끄기 · 0.1.10: 음악 엔진이 알려 준 실패 이유를 대기열·엔진 창에 그대로 표시 · 0.1.11: 음악 엔진 글자 UTF-8(한국어 윈도우 cp949 오류 해결)
// 내부 음악 엔진 번호 — 실행마다 비어 있는 번호(0.1.9). 예전에는 47822로 고정해, 남은 음악 엔진이 잡고 있으면 새 음악 엔진이 켜지지 못했다.
const ACESTEP_PORT = await pickFreePort();

const dataDir =
  process.env.FMS_DATA_DIR ||
  (process.platform === "win32"
    ? path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local"), "FreeMusicEngine")
    : path.join(os.homedir(), "Library", "Application Support", "FreeMusicEngine"));
const tokensFile = path.join(dataDir, "paired.json");
const logLine = (s) => process.stdout.write(s.endsWith("\n") ? s : s + "\n");

// 엔진 0.3.0: 데이터 폴더 tools/에 받아 둔 uv·ffmpeg를 먼저 쓴다(설치 파일 회원은 따로 설치하지 않음)
useTools(dataDir);
const device = chooseDevice({ platform: process.platform, arch: process.arch, nvidia: process.platform === "win32" && hasNvidia() });
const vramGb = device.device === "cuda" ? nvidiaVramGb() : null;
let ffmpeg = hasFfmpeg(); // 도구를 받은 뒤 다시 확인한다
const engineSettingsFile = path.join(dataDir, "engine-settings.json");
/** 엔진 설정 — tier(음악 모델 구성) · modelsDir(모델 저장 폴더, 0.5.0) */
async function readEngineSettings() {
  try {
    return JSON.parse(await readFile(engineSettingsFile, "utf8")) ?? {};
  } catch {
    return {};
  }
}
const saveEngineSettings = async (patch) => writeFile(engineSettingsFile, JSON.stringify({ ...(await readEngineSettings()), ...patch }, null, 2));
// 모델 저장 폴더(0.5.0) — 무거운 것(ACE-Step·YuE2·추가 엔진·설치 패키지 보관함·MP3 변환)만 여기에 둔다.
// 회원이 폴더를 고르면 설치 패키지 보관함도 그 안(uv-cache)으로 — 고르지 않았으면 예전처럼 데이터 폴더 + uv 기본 보관함.
const defaultUvCache = uvCacheDir();
let heavyDir = dataDir;
let acestepDir = "";
let checkpointsDir = "";
function applyHeavyDir(dir, custom) {
  heavyDir = dir;
  acestepDir = process.env.FMS_ACESTEP_DIR || path.join(heavyDir, "acestep");
  checkpointsDir = path.join(acestepDir, "checkpoints");
  if (custom) process.env.UV_CACHE_DIR = path.join(heavyDir, "uv-cache");
}
const startSettings = await readEngineSettings();
applyHeavyDir(typeof startSettings.modelsDir === "string" && startSettings.modelsDir ? startSettings.modelsDir : dataDir, !!startSettings.modelsDir);
const nvidiaDriver = () => {
  if (device.device !== "cuda") return "";
  const r = spawnSync("nvidia-smi", ["--query-gpu=driver_version", "--format=csv,noheader"], { encoding: "utf8", windowsHide: true });
  return r.status === 0 ? String(r.stdout).trim().split(/\r?\n/)[0] : "";
};
// 비상업용 음악 엔진 YuE2 — 되는 PC인지(윈도우 + NVIDIA 드라이버 580+ + 그래픽 메모리 8GB+)
const yue2 = yue2Support({ platform: process.platform, nvidia: device.device === "cuda", vramGb, driver: nvidiaDriver() });
// 추가 음악 엔진(0.4.0) — 이 PC에서 되는지
const pySupportOf = (e) => pySupport(e, { platform: process.platform, nvidia: device.device === "cuda", vramGb });
const pyOk = pyCatalog().engines.filter((e) => pySupportOf(e).ok).map((e) => e.id);
let hfToken = ""; // 회원 본인 Hugging Face 토큰 — 사이트가 작업을 넣을 때만 보내고, 파일에 남기지 않는다

/** /system에 넣을 추가 엔진 정보 */
async function pyReport(e) {
  const s = pySupportOf(e);
  const base = { id: e.id, name: e.name, note: e.note, license: e.license, kind: e.kind, licenseName: e.licenseName, licenseCondition: e.licenseCondition ?? "", hfToken: !!e.hfToken, gatedUrl: e.gatedUrl ?? "", maxSec: e.maxSec, minVramGb: e.minVramGb, selected: false };
  if (!s.ok) return { ...base, supported: false, reason: s.reason };
  const installed = await pyInstalled(heavyDir, e).catch(() => false);
  return { ...base, supported: true, reason: "", installed, downloadGb: installed ? 0 : await pyMissingGb(heavyDir, e).catch(() => null) };
}

/** /system에 넣을 YuE2 정보(설치 여부·더 받을 크기) */
async function yue2Report() {
  const base = { id: "yue2", name: "YuE2", note: "노래 만들기 · 비상업용(CC BY-NC 4.0) — 수익 영상·판매에는 쓸 수 없습니다", license: YUE2_LICENSE, selected: false };
  if (!yue2.ok) return { ...base, supported: false, reason: yue2.reason };
  const installed = await yue2Installed(heavyDir, yue2.profile).catch(() => false);
  const missing = installed ? 0 : await yue2MissingBytes(heavyDir, yue2.profile).catch(() => null);
  return { ...base, supported: true, reason: "", profile: yue2.profile.label, installed, downloadGb: missing == null ? null : Math.round((missing / 1024 ** 3) * 10) / 10 };
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
    engines: [
      { id: "acestep", name: "ACE-Step 1.5", note: "노래·연주곡 생성, 커버, 부분 수정 · 상업용 사용 가능", license: "commercial", kind: "both", supported: device.supported, selected: true },
      { ...(await yue2Report()), kind: "vocal" },
      ...(await Promise.all(pyCatalog().engines.map(pyReport))),
    ],
  };
}
// 회원이 고른 구성(없거나 이 PC에서 안 되면 추천 구성)
const savedTier = startSettings.tier ?? "";
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
  // 모델 저장 폴더를 바꾸면 따라가도록 쓸 때마다 읽는다
  watch: {
    get dir() {
      return checkpointsDir;
    },
    missingGb: async () => missingModelGb(profile, await listInstalledModels(checkpointsDir)),
  },
});
const yue2LogFile = path.join(dataDir, "yue2-log.txt");

/**
 * YuE2 작업 — 그래픽 메모리를 비우려고 ACE-Step을 잠시 끄고, 다음 작업이 YuE2가 아니면 다시 켠다.
 * (16GB 그래픽카드에 ACE-Step XL과 YuE2 BF16을 함께 올리면 메모리가 모자란다)
 */
async function yue2Run(job, signal, stage) {
  if (!yue2.ok) throw new Error(yue2.reason);
  return exclusiveRun("YuE2", yue2LogFile, yue2.profile.label, stage, (log) => runYue2({ dataDir: heavyDir, profile: yue2.profile, library, log }, job, signal, stage));
}

/** 추가 음악 엔진(0.4.0) 작업 — YuE2와 같이 ACE-Step을 잠시 끄고 그래픽 메모리를 혼자 쓴다 */
async function pyRun(job, signal, stage) {
  const e = pyEngine(job.engine);
  if (!e) throw new Error("없는 음악 엔진입니다.");
  const s = pySupportOf(e);
  if (!s.ok) throw new Error(s.reason);
  const logFile = path.join(dataDir, `${e.id}-log.txt`);
  return exclusiveRun(e.name, logFile, e.name, stage, (log) => runPyEngine({ dataDir: heavyDir, engine: e, vramGb, library, hfToken, log }, job, signal, stage));
}

/** ACE-Step이 아닌 엔진은 그래픽 메모리를 혼자 쓴다 — 끝나면 다음 작업이 ACE-Step일 때 다시 켠다 */
async function exclusiveRun(name, logFile, label, stage, fn) {
  yue2Running = true;
  if (child && child.exitCode == null) {
    stage("그래픽 메모리 비우는 중(ACE-Step 잠시 멈춤)");
    yue2Pausing = true;
    state.ready = false;
    state.stage = `${name} 사용 중`;
    await killTree(child);
  }
  const log = createWriteStream(logFile, { flags: "w" });
  log.write(`# ${new Date().toISOString()} · 엔진 ${VERSION} · ${label}\n`);
  try {
    return await fn((s) => log.write(s));
  } catch (err) {
    if (err?.name !== "AbortError") throw new Error(`${err instanceof Error ? err.message : err} (자세한 이유: ${logFile})`);
    throw err;
  } finally {
    log.end();
    yue2Running = false;
    const next = queue.list().find((j) => j.status === "queued");
    if (!next || next.engine === "acestep") resumeAce();
  }
}

/** 다른 엔진 때문에 멈춘 ACE-Step을 다시 켠다(기다리지 않음 — 다 켜지면 startMusicEngine이 대기열을 이어서 돌린다) */
function resumeAce() {
  if (!yue2Pausing || yue2Running) return;
  yue2Pausing = false;
  startMusicEngine().then(
    () => logLine("✔ ACE-Step 다시 준비됨"),
    (e) => ((state.stage = "오류"), (state.error = e.message), logLine(`⚠ ${e.message}`))
  );
}

// ── 저장 공간(0.5.0) ─────────────────────────────────────
const activeJobs = () => queue.list().filter((j) => j.status === "queued" || j.status === "running");
const isWorking = () => moving || restarting || aceStarting || yue2Running || queue.list().some((j) => j.status === "running");

/** 항목 목록(크기 포함) — GET /storage */
async function storageItemsNow() {
  const custom = !!(await readEngineSettings()).modelsDir;
  const uv = uvCacheDir();
  return listItems({
    acestepDir,
    aceEntries: await readdir(acestepDir).catch(() => []),
    checkpoints: await listInstalledModels(checkpointsDir),
    profile,
    yue2Root: yue2Paths(heavyDir).root,
    yue2Exists: existsSync(yue2Paths(heavyDir).root),
    pyEngines: pyCatalog().engines.map((e) => ({ id: e.id, name: e.name, root: pyPaths(heavyDir, e).root, exists: existsSync(pyPaths(heavyDir, e).root) })),
    uvCache: uv,
    uvCacheExists: existsSync(uv),
    oldUvCache: custom && path.resolve(defaultUvCache) !== path.resolve(uv) ? defaultUvCache : "",
    oldUvCacheExists: custom && existsSync(defaultUvCache),
    mp3Cache: path.join(heavyDir, "mp3-cache"),
    mp3Exists: existsSync(path.join(heavyDir, "mp3-cache")),
    busy: new Set(activeJobs().map((j) => j.engine || "acestep")),
    working: isWorking(),
  });
}
async function storageReport() {
  const items = await storageItemsNow();
  const sized = await Promise.all(items.map(async (it) => ({ ...it, bytes: (await Promise.all(it.paths.map((p) => sizeOf(p)))).reduce((a, b) => a + b, 0) })));
  return {
    dir: heavyDir,
    isDefault: path.resolve(heavyDir) === path.resolve(dataDir) && !(await readEngineSettings()).modelsDir,
    freeBytes: await freeBytes(heavyDir),
    totalBytes: sized.reduce((a, b) => a + b.bytes, 0),
    moving,
    stage: moving ? state.stage : "",
    items: sized.map(({ paths, ...it }) => ({ ...it, path: paths[0] ?? "" })),
  };
}
/** POST /storage/remove { id } */
async function removeStorageItem(id) {
  const it = (await storageItemsNow()).find((x) => x.id === id);
  if (!it) return { ok: false, status: 404, error: "그 항목이 없습니다(이미 지웠을 수 있음)." };
  if (!it.removable) return { ok: false, status: 409, error: it.note || "지금은 지울 수 없습니다." };
  let all = true;
  for (const p of it.paths) all = (await removeBestEffort(p)) && all;
  logLine(`🗑 ${it.label}${all ? "을(를) 지웠습니다." : " — 사용 중인 파일 일부는 남겼습니다."}`);
  return { ok: true, partial: !all };
}
/**
 * POST /storage/move { path, mode: "move" | "fresh" } — 모델 저장 폴더 바꾸기. 바로 답하고 뒤에서 옮긴다(상태 「모델 폴더 옮기는 중 · 3.2GB / 약 40GB」).
 * 옮기는 동안 ACE-Step을 끄고 대기열은 기다린다. 실패하면 예전 폴더 그대로 쓴다.
 */
async function moveModels(target, mode) {
  if (moving) return { ok: false, status: 409, error: "이미 옮기는 중입니다." };
  if (restarting || aceStarting) return { ok: false, status: 409, error: "엔진을 켜거나 구성을 바꾸는 중입니다. 잠시 뒤 다시 시도해 주세요." };
  if (yue2Running || queue.list().some((j) => j.status === "running")) return { ok: false, status: 409, error: "곡을 만드는 중입니다. 끝난 뒤 바꿔 주세요." };
  if (mode !== "move" && mode !== "fresh") return { ok: false, status: 400, error: "옮기기 방식이 올바르지 않습니다." };
  if (process.env.FMS_ACESTEP_DIR) return { ok: false, status: 400, error: "시험용 설정(FMS_ACESTEP_DIR)으로 켠 엔진은 모델 폴더를 바꿀 수 없습니다." };
  const t = checkTarget(target, { current: heavyDir });
  if (t.error) return { ok: false, status: 400, error: t.error };
  const to = t.dir;
  try {
    await mkdir(to, { recursive: true });
  } catch (e) {
    return { ok: false, status: 400, error: `그 폴더를 만들 수 없습니다. ${e.message}` };
  }
  if (mode === "move") {
    let need = 0;
    for (const e of HEAVY_ENTRIES) need += await sizeOf(path.join(heavyDir, e), SKIP_DIRS);
    if (!(await readEngineSettings()).modelsDir) need += await sizeOf(uvCacheDir()); // 처음 폴더에서 옮기면 uv 보관함도 함께
    const free = await freeBytes(to);
    const sameDrive = path.parse(path.resolve(to)).root.toLowerCase() === path.parse(path.resolve(heavyDir)).root.toLowerCase();
    if (!sameDrive && free != null && free < need + 2 * 1024 ** 3) {
      return { ok: false, status: 400, error: `그 드라이브 남은 공간이 모자랍니다(필요 약 ${Math.ceil(need / 1024 ** 3) + 2}GB, 남은 ${Math.floor(free / 1024 ** 3)}GB).` };
    }
  }
  const from = heavyDir;
  moving = true;
  restarting = true;
  state.ready = false;
  state.error = "";
  state.stage = mode === "move" ? "모델 폴더 옮기는 중" : "모델 폴더 바꾸는 중";
  logLine(`📦 모델 저장 폴더 바꾸기: ${from} → ${to} (${mode === "move" ? "받은 모델 옮기기" : "새로 받기"})`);
  (async () => {
    try {
      await killTree(child);
      killStaleAcestep();
      if (mode === "move") {
        const wasCustom = !!(await readEngineSettings()).modelsDir;
        const { copied } = await moveHeavy(from, to, { uvCacheFrom: wasCustom ? "" : uvCacheDir(), onProgress: (done, total) => (state.stage = progressText("모델 폴더 옮기는 중", done, Math.round((total / 1024 ** 3) * 10) / 10)) });
        // 실행 환경은 새 자리에서 다시 만든다 — ACE-Step은 설치 기록을 「설치 중」으로 돌려 다음에 켤 때 uv sync
        const stFile = path.join(to, "install-state.json");
        try {
          const st = JSON.parse(await readFile(stFile, "utf8"));
          await writeFile(stFile, JSON.stringify({ ...st, status: "installing" }, null, 2));
        } catch {}
        await saveEngineSettings({ modelsDir: to });
        applyHeavyDir(to, true);
        state.stage = "예전 폴더 정리 중";
        for (const p of copied) await removeBestEffort(p);
      } else {
        await saveEngineSettings({ modelsDir: to });
        applyHeavyDir(to, true);
        state.stage = "예전 폴더 정리 중";
        await removeHeavy(from);
      }
      logLine(`✔ 모델 저장 폴더: ${to}`);
    } catch (err) {
      state.error = `모델 폴더를 옮기지 못했습니다 — 예전 폴더를 그대로 씁니다. ${err.message}`;
      logLine(`⚠ ${state.error}`);
    } finally {
      moving = false;
      restarting = false;
      try {
        await startMusicEngine();
      } catch (err) {
        state.stage = "오류";
        state.error = err.message;
        logLine(`⚠ ${err.message}`);
      }
    }
  })();
  return { ok: true, dir: to };
}

/**
 * 마스터링 작업(0.6.9, 원본 boks-music mastering.mjs) — 보관함의 원곡을 ffmpeg로만 처리해(그래픽카드 안 씀)
 * 24bit WAV 새 곡으로 저장하고, 원곡 표지가 있으면 같이 붙인다.
 */
async function masterRun(job, signal, stage) {
  if (!ffmpeg) throw new Error("이 PC에 ffmpeg가 없어 마스터링할 수 없습니다.");
  const src = await library.fileOf(job.task?.sourceId);
  if (!src) throw new Error("이 PC 보관함에 원곡 음원이 없습니다(옮기거나 지웠을 수 있음).");
  const outDir = path.join(dataDir, "tmp", `master-${job.id}`);
  try {
    const r = await masterFile({ src, outDir, options: job.task.options }, { signal, stage });
    stage("보관함에 저장하는 중");
    await library.save(job.track.id, await readFile(r.file), job.title, "wav");
    const art = await library.artOf(job.task.sourceId);
    if (art) await library.setArt(job.track.id, await readFile(art), path.extname(art).slice(1).toLowerCase()).catch(() => {});
    const m = r.metadata;
    logLine(`🎚 마스터링: ${job.title} — ${m.before.integratedLufs} → ${m.after.integratedLufs} LUFS, True Peak ${m.after.truePeakDbtp} dBTP${m.compressorApplied ? ", 압축 적용" : ""}`);
    return { trackId: job.track.id, ext: "wav", engine: "master", license: job.license, mastering: m };
  } finally {
    await rm(outDir, { recursive: true, force: true }).catch(() => {});
  }
}

const queue = createQueue({
  file: path.join(dataDir, "queue.json"),
  run: (job, signal, stage) =>
    job.kind === "master" ? masterRun(job, signal, stage) : job.engine === "yue2" ? yue2Run(job, signal, stage) : job.engine === "acestep" || !job.engine ? aceRun(job, signal, stage) : pyRun(job, signal, stage),
  // ACE-Step 작업은 ACE-Step이 준비돼야, 다른 엔진 작업은 ACE-Step을 켜거나 구성을 바꾸는 중이 아니면 된다
  canRun: (job) => {
    if (job.engine && job.engine !== "acestep") return !restarting && !aceStarting;
    if (yue2Pausing) resumeAce(); // 뒤에 있던 YuE2 작업이 취소돼 ACE-Step이 멈춘 채 남은 경우
    return state.ready && !restarting && !yue2Pausing;
  },
  // 취소한 커버 작업의 원곡 파일은 바로 지운다(실패는 [다시 하기]를 위해 남김)
  onFinished: async (job) => {
    if (job.status === "cancelled" && job.source) await rm(path.join(queueSourceDir, job.source.file), { force: true });
    logLine(`🎵 대기열: ${job.title} — ${job.stage}${job.error ? ` (${job.error})` : ""}`);
    if (job.status === "failed") logLine(`   자세한 이유는 음악 엔진 기록 파일에 있습니다: ${aceLogFile}`);
  },
  // 오래돼 정리한 작업(0.6.9: 30일·100개)의 원곡 사본도 지운다
  onDrop: (job) => (job.source?.file ? rm(path.join(queueSourceDir, path.basename(job.source.file)), { force: true }) : undefined),
  log: (e) => logLine(`⚠ 대기열 오류: ${e instanceof Error ? e.message : e}`),
});
await queue.load();
// 플레이리스트 영상(0.6.9) — 화면이 그린 H.264 조각을 받아 ffmpeg로 담는다(그래픽카드 음악 작업과 따로)
const video = createVideoStudio({ dataDir, library, getFfmpeg: () => ffmpeg, log: logLine });
let gatewayOpen = false;
let pendingPairCode = "";
const showPairCode = (code) => logLine(`\n  🔑 연결 코드: ${code}  (사이트 「내 PC 엔진」 화면에 입력)\n`);
const gateway = createGateway({
  version: VERSION,
  getState: () => ({ ...state, paired: tokens.size > 0, features: ["library", "folder", "browse", "quality", "system", "queue", "engines", "pyengines", "storage", "art", "cover", "waveform", "safe-delete", ...(ffmpeg ? ["master", "video"] : []), ...(yue2.ok ? ["yue2"] : []), ...pyOk], libraryDir: library.dir, modelsDir: heavyDir, quality: { ...profile, vramGb, ffmpeg } }),
  systemReport,
  // 엔진 이름 → 분류(없는 엔진·이 PC에서 안 되는 엔진은 null)
  engineLicense: (id) => (id === "yue2" ? (yue2.ok ? YUE2_LICENSE : null) : pyOk.includes(id) ? pyEngine(id).license : null),
  setHfToken: (t) => (hfToken = t),
  removeEngine: async (id) => {
    const e = pyEngine(id);
    if (!e) return { ok: false, status: 400, error: "지울 수 없는 엔진입니다." };
    if (queue.list().some((j) => j.engine === id && (j.status === "queued" || j.status === "running"))) return { ok: false, status: 409, error: "이 엔진으로 만드는 작업이 끝난 뒤 지워 주세요." };
    await removePyEngine(heavyDir, e);
    logLine(`🗑 ${e.name} 받은 모델·실행 환경을 지웠습니다.`);
    return { ok: true };
  },
  setQuality,
  queue,
  queueSourceDir,
  library,
  video,
  get ffmpeg() {
    return ffmpeg;
  },
  get mp3CacheDir() {
    return path.join(heavyDir, "mp3-cache");
  },
  storage: { report: storageReport, remove: removeStorageItem, move: moveModels },
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
  if (pyOk.length) logLine(`  🎛️ 추가 음악 엔진 사용 가능 — ${pyOk.map((id) => pyEngine(id).name).join(", ")} (처음 고를 때 받음)`);
  gatewayOpen = true;
  if (pendingPairCode) showPairCode(pendingPairCode);
});

let child = null;
let restarting = false;
let moving = false; // 모델 저장 폴더를 옮기는 중(0.5.0)
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
    installedDir = await ensureInstalled(heavyDir, { onStage: (s) => ((state.stage = s), logLine(`… ${s}`)) });
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
  if (restarting) return { ok: false, status: 409, error: moving ? "모델 폴더를 옮기는 중입니다. 끝난 뒤 다시 시도해 주세요." : "구성을 바꾸는 중입니다. 잠시 뒤 다시 시도해 주세요." };
  if (yue2Pausing) return { ok: false, status: 409, error: "다른 음악 엔진으로 곡을 만드는 중입니다. 끝난 뒤 다시 시도해 주세요." };
  const report = await systemReport();
  const opt = report.options.find((o) => o.id === tierId);
  if (!opt) return { ok: false, status: 400, error: "없는 구성입니다." };
  if (!opt.supported) return { ok: false, status: 400, error: opt.reason };
  await saveEngineSettings({ tier: opt.id });
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
  // 도구 받기 — uv는 꼭 필요(없으면 음악 엔진을 설치 못 함), ffmpeg는 없으면 MP3만 못 함(FLAC 원음은 됨)
  const onStage = (s) => ((state.stage = s), logLine(`… ${s}`));
  try {
    if (!hasUv()) await ensureTools(dataDir, ["uv"], { onStage });
  } catch (err) {
    logLine(`⚠ 파이썬 도구(uv)를 받지 못했습니다: ${err.message}`);
  }
  try {
    if (!ffmpeg) await ensureTools(dataDir, ["ffmpeg"], { onStage });
  } catch (err) {
    logLine(`⚠ MP3 변환 도구를 받지 못했습니다(FLAC 원음은 그대로 됩니다): ${err.message}`);
  }
  useTools(dataDir);
  ffmpeg = hasFfmpeg();
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
