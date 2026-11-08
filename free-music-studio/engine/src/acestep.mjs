// ACE-Step 1.5(MIT) 설치·실행 — 2026-11-03 사전 검증을 통과한 버전 하나로 고정한다.
import { spawn, spawnSync } from "node:child_process";
import { createWriteStream } from "node:fs";
import { access, mkdir, readdir, rename, rm, stat, writeFile, readFile } from "node:fs/promises";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import net from "node:net";
import path from "node:path";

export const ACESTEP_COMMIT = "ca1e85fe9430179831e6bc6be790c332190a3866";
const ARCHIVE_URL = `https://github.com/ace-step/ACE-Step-1.5/archive/${ACESTEP_COMMIT}.zip`;

const exists = (p) => access(p).then(() => true, () => false);

/** uv(파이썬 패키지 도구)가 있는지 — 0.1은 미리 설치된 uv를 쓴다(0.2에서 함께 묶음) */
export function hasUv() {
  const r = spawnSync("uv", ["--version"], { encoding: "utf8" });
  return r.status === 0 ? r.stdout.trim() : null;
}

/** NVIDIA 그래픽카드가 있는지 */
export function hasNvidia() {
  const r = spawnSync("nvidia-smi", ["-L"], { encoding: "utf8" });
  return r.status === 0 && /GPU \d/.test(r.stdout);
}

/** 첫 NVIDIA 그래픽카드의 메모리(GB). 모르면 null. */
export function nvidiaVramGb() {
  const r = spawnSync("nvidia-smi", ["--query-gpu=memory.total", "--format=csv,noheader,nounits"], { encoding: "utf8" });
  const mib = r.status === 0 ? parseInt(String(r.stdout).split(/\r?\n/)[0], 10) : NaN;
  return Number.isFinite(mib) ? Math.round((mib / 1024) * 10) / 10 : null;
}

/** ffmpeg가 있는지(FLAC 원음 → MP3 320kbps 변환에 씀) */
export function hasFfmpeg() {
  return spawnSync("ffmpeg", ["-version"], { encoding: "utf8" }).status === 0;
}

/**
 * 음악 엔진(파이썬)이 글자를 UTF-8로 쓰게 한다. 한국어 윈도우 기본(cp949)으로 두면 진행 문구의 긴 줄표(—, —)를
 * 쓰다가 'cp949' codec can't encode 오류로 곡 만들기가 바로 실패했다(2026-11-04 마스터PC).
 */
export const PYTHON_UTF8_ENV = { PYTHONUTF8: "1", PYTHONIOENCODING: "utf-8" };

/** 음질 설정을 ACE-Step 환경 변수로 — 모델은 첫 사용 때 엔진이 스스로 받는다. */
export function profileEnv(profile) {
  const env = { ACESTEP_CONFIG_PATH: profile.dit, ACESTEP_INIT_LLM: profile.lm ? "true" : "false" };
  if (profile.lm) env.ACESTEP_LM_MODEL_PATH = profile.lm;
  if (profile.offload) env.ACESTEP_OFFLOAD_DIT_TO_CPU = "true";
  return env;
}

// ── 받는 중 표시(2026-11-04 주인님: 「처음 받는 모델도 다운로드되는 것을 보여 줘, 동작하고 있는지 알 수 있게」) ──
// ACE-Step은 모델을 스스로 받으므로, 받는 폴더 크기를 몇 초마다 재서 「받는 중 · 3.2GB / 약 13.5GB」로 보인다.

/** 모델 폴더(checkpoints 안 이름)별 대략 크기(GB) — device.mjs 근거와 같음(미니PC 실측·공식 크기) */
export const MODEL_SIZE_GB = {
  "acestep-v15-xl-sft": 10,
  "acestep-v15-xl-turbo": 10,
  "acestep-v15-turbo": 4.5,
  "acestep-5Hz-lm-4B": 8,
  "acestep-5Hz-lm-1.7B": 3.5,
  "acestep-5Hz-lm-0.6B": 1.3,
};
const COMMON_MODELS_GB = 1.4; // 소리 복원·글자 이해 모델(처음 한 번)
// uv sync 실측(2026-11-04 미니PC 처음 설치): 먼저 uv 보관 폴더에 약 4.3GB를 받고, 실행 환경(.venv)에 6.1GB를 깐다
export const RUNTIME_DL_GB = 4.3;
export const RUNTIME_GB = 6.1;
/** uv가 받은 패키지를 쌓는 폴더(UV_CACHE_DIR이 없으면 기본 위치) */
export const uvCacheDir = () =>
  process.env.UV_CACHE_DIR ||
  (process.platform === "win32" ? path.join(process.env.LOCALAPPDATA || "", "uv", "cache") : path.join(process.env.HOME || "", ".cache", "uv"));

/** 이 구성에서 아직 받지 않은 모델 크기(GB) — 처음이면 공통 모델도 더한다 */
export function missingModelGb(profile, installed) {
  let gb = installed.length === 0 ? COMMON_MODELS_GB : 0;
  for (const m of [profile.dit, profile.lm]) if (m && !installed.includes(m)) gb += MODEL_SIZE_GB[m] ?? 0;
  return Math.round(gb * 10) / 10;
}

/** 폴더 전체 크기(바이트). 없으면 0. 받는 중 바뀌는 파일은 건너뛴다. */
export async function dirSize(dir) {
  let total = 0;
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) total += await dirSize(p);
    else if (e.isFile()) total += (await stat(p).catch(() => ({ size: 0 }))).size;
  }
  return total;
}

export const gbText = (bytes) => `${(bytes / 1024 ** 3).toFixed(1)}GB`;

/** 「… · 1.2GB / 약 4.3GB」 — 예상보다 크면 「약」 크기는 뺀다 */
export function progressText(label, doneBytes, expectGb) {
  const done = gbText(doneBytes);
  return expectGb && doneBytes / 1024 ** 3 < expectGb ? `${label} · ${done} / 약 ${expectGb}GB` : `${label} · ${done}`;
}

/** 폴더가 커지는 동안 every ms마다 onGrow(늘어난 바이트)를 부른다. stop()으로 멈춘다. */
export function watchGrowth(dir, onGrow, every = 3000) {
  let base = null;
  let last = 0;
  let stopped = false;
  const tick = async () => {
    if (stopped) return;
    const now = await dirSize(dir);
    if (base == null) base = now;
    else if (now > last) onGrow(now - base);
    last = now;
    if (!stopped) timer = setTimeout(tick, every);
  };
  let timer = setTimeout(tick, 0);
  return () => ((stopped = true), clearTimeout(timer));
}

function run(cmd, args, opts, log) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { ...opts, windowsHide: true });
    child.stdout?.on("data", (d) => log(String(d)));
    child.stderr?.on("data", (d) => log(String(d)));
    child.on("error", reject);
    child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(" ")} 실패(코드 ${code})`))));
  });
}

/**
 * 설치: 고정 버전 압축 파일 받기 → 풀기 → `uv sync`. 끝나면 install-state.json에 기록하고,
 * 다음 실행 때 같은 버전이면 건너뛴다.
 */
export async function ensureInstalled(dataDir, { onStage = () => {}, log = () => {} } = {}) {
  const dir = path.join(dataDir, "acestep");
  const stateFile = path.join(dataDir, "install-state.json");
  try {
    const state = JSON.parse(await readFile(stateFile, "utf8"));
    if (state.commit === ACESTEP_COMMIT && state.status === "installed" && (await exists(dir))) return dir;
  } catch {}

  if (!hasUv()) throw new Error("uv가 없습니다. 안내 화면의 순서대로 uv를 먼저 설치해 주세요.");
  await mkdir(dataDir, { recursive: true });
  await writeFile(stateFile, JSON.stringify({ commit: ACESTEP_COMMIT, status: "installing", startedAt: new Date().toISOString() }, null, 2));

  if (!(await exists(path.join(dir, "pyproject.toml")))) {
    onStage("음악 엔진 내려받는 중");
    const zip = path.join(dataDir, `acestep-${ACESTEP_COMMIT.slice(0, 7)}.zip`);
    const res = await fetch(ARCHIVE_URL, { redirect: "follow" });
    if (!res.ok || !res.body) throw new Error(`음악 엔진을 받지 못했습니다(HTTP ${res.status}). 인터넷 연결을 확인해 주세요.`);
    let got = 0;
    let shown = 0;
    const counter = new Transform({
      transform(chunk, _enc, cb) {
        got += chunk.length;
        if (Date.now() - shown > 1000) ((shown = Date.now()), onStage(`음악 엔진 내려받는 중 · ${(got / 1024 ** 2).toFixed(0)}MB`));
        cb(null, chunk);
      },
    });
    await pipeline(Readable.fromWeb(res.body), counter, createWriteStream(zip));
    onStage("압축 푸는 중");
    const tmp = path.join(dataDir, "acestep-tmp");
    await rm(tmp, { recursive: true, force: true });
    await mkdir(tmp, { recursive: true });
    await run("tar", ["-xf", zip, "-C", tmp], {}, log); // 윈도우 10 이상·맥에 기본 포함
    const [top] = await readdir(tmp);
    await rm(dir, { recursive: true, force: true });
    await rename(path.join(tmp, top), dir);
    await rm(tmp, { recursive: true, force: true });
    await rm(zip, { force: true });
  }

  onStage("필요한 구성 설치 중(처음 한 번, 수 분)");
  // 받는 동안은 uv 보관 폴더가, 까는 동안은 실행 환경 폴더가 커진다 — 커지는 쪽을 보인다
  const stopDl = watchGrowth(uvCacheDir(), (b) => onStage(progressText("필요한 구성 받는 중(처음 한 번)", b, RUNTIME_DL_GB)), 5000);
  const stopVenv = watchGrowth(path.join(dir, ".venv"), (b) => onStage(progressText("필요한 구성 설치 중(처음 한 번)", b, RUNTIME_GB)));
  try {
    await run("uv", ["sync"], { cwd: dir }, log);
  } finally {
    stopDl();
    stopVenv();
  }
  await writeFile(stateFile, JSON.stringify({ commit: ACESTEP_COMMIT, status: "installed", installedAt: new Date().toISOString() }, null, 2));
  return dir;
}

/**
 * 실행: 내부 포트에 ACE-Step 서버를 띄운다. 키(apiKey)를 걸어 연결 문을 거치지 않은 요청은 받지 않게 한다.
 * 음악 모델(약 10GB)은 첫 생성 요청 때 ACE-Step이 스스로 받는다.
 */
export function launch(dir, { port, apiKey, device, profile }, log = () => {}) {
  const child = spawn("uv", ["run", "acestep-api"], {
    cwd: dir,
    windowsHide: true,
    env: {
      ...process.env,
      ...PYTHON_UTF8_ENV,
      ACESTEP_API_HOST: "127.0.0.1",
      ACESTEP_API_PORT: String(port),
      ACESTEP_API_KEY: apiKey,
      ACESTEP_DEVICE: device,
      ...profileEnv(profile),
    },
  });
  child.stdout.on("data", (d) => log(String(d)));
  child.stderr.on("data", (d) => log(String(d)));
  return child;
}

/** 지금 비어 있는 번호 하나(실행마다 새로) — 남은 음악 엔진이 옛 번호를 잡고 있어도 부딪히지 않게 */
export function pickFreePort(host = "127.0.0.1") {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.unref();
    s.on("error", reject);
    s.listen(0, host, () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });
}

/** 프로그램 목록(JSON)에서 음악 엔진 서버(acestep-api) 프로그램 번호만 — 순수 함수(시험용) */
export function staleAcestepPids(processes, keep = []) {
  const list = Array.isArray(processes) ? processes : processes ? [processes] : [];
  return list
    .filter((p) => /acestep-api|acestep\.api_server/i.test(String(p?.CommandLine ?? "")))
    .map((p) => Number(p.ProcessId))
    .filter((pid) => Number.isInteger(pid) && pid > 0 && !keep.includes(pid));
}

/**
 * 예전 엔진이 남긴 음악 엔진 서버를 실행 명령 이름으로 찾아 끈다(그래픽 메모리도 돌려받음).
 * 이 PC에서는 netstat에 그 프로그램이 안 보이는 일이 있어(2026-11-04 마스터PC) 명령 이름으로 찾는다.
 * @returns {number[]} 끈 프로그램 번호
 */
export function killStaleAcestep(keep = []) {
  if (process.platform !== "win32") return [];
  const ps = spawnSync(
    "powershell.exe",
    ["-NoProfile", "-Command", "Get-CimInstance Win32_Process -Filter \"Name='python.exe' OR Name='pythonw.exe' OR Name='acestep-api.exe' OR Name='uv.exe'\" | Select-Object ProcessId, CommandLine | ConvertTo-Json -Compress"],
    { encoding: "utf8", windowsHide: true, timeout: 20_000 }
  );
  let procs = [];
  try {
    procs = JSON.parse(String(ps.stdout).trim() || "[]");
  } catch {}
  const pids = staleAcestepPids(procs, keep);
  for (const pid of pids) spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], { windowsHide: true });
  return pids;
}

export async function waitHealthy(port, { timeoutMs = 180_000, alive } = {}) {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    // 0.7.6: 켜는 중에 꺼졌으면 3분을 채우지 않고 바로 알린다(마스터PC 2026-11-08 「멈췄습니다(코드 2)」 뒤 3분 기다림)
    if (alive && !alive()) return "exited";
    try {
      const r = await fetch(`http://127.0.0.1:${port}/health`);
      if (r.ok) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 2000));
  }
  return false;
}
