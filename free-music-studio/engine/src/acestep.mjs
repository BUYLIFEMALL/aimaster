// ACE-Step 1.5(MIT) 설치·실행 — 2026-11-03 사전 검증을 통과한 버전 하나로 고정한다.
import { spawn, spawnSync } from "node:child_process";
import { createWriteStream } from "node:fs";
import { access, mkdir, readdir, rename, rm, writeFile, readFile } from "node:fs/promises";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
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

/** 음질 설정을 ACE-Step 환경 변수로 — 모델은 첫 사용 때 엔진이 스스로 받는다. */
export function profileEnv(profile) {
  const env = { ACESTEP_CONFIG_PATH: profile.dit, ACESTEP_INIT_LLM: profile.lm ? "true" : "false" };
  if (profile.lm) env.ACESTEP_LM_MODEL_PATH = profile.lm;
  if (profile.offload) env.ACESTEP_OFFLOAD_DIT_TO_CPU = "true";
  return env;
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
    await pipeline(Readable.fromWeb(res.body), createWriteStream(zip));
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
  await run("uv", ["sync"], { cwd: dir }, log);
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

/** netstat 출력에서 그 번호를 기다리는(LISTENING) 프로그램 번호들 — 순수 함수(시험용) */
export function listeningPids(netstatText, port) {
  const pids = new Set();
  for (const line of String(netstatText).split(/\r?\n/)) {
    const cols = line.trim().split(/\s+/);
    if (cols[0] !== "TCP" || !cols[1]?.endsWith(`:${port}`) || !/LISTEN/i.test(cols[3] ?? "")) continue;
    if (/^\d+$/.test(cols[4] ?? "") && cols[4] !== "0") pids.add(Number(cols[4]));
  }
  return [...pids];
}

/**
 * 내부 음악 엔진 번호를 예전 엔진이 남긴 음악 엔진(python·uv)이 잡고 있으면 끈다.
 * 예전 엔진 창을 닫아도 그 엔진이 띄운 python이 남아, 새 음악 엔진이 번호를 못 잡고 꺼지는 일이 있었다(2026-11-04 마스터PC).
 * 다른 프로그램이 잡고 있으면 끄지 않고 이유를 돌려준다.
 * @returns {{ ok: true, freed: number[] } | { ok: false, error: string }}
 */
export function freeStalePort(port) {
  if (process.platform !== "win32") return { ok: true, freed: [] };
  const ns = spawnSync("netstat", ["-ano", "-p", "TCP"], { encoding: "utf8", windowsHide: true });
  const pids = listeningPids(ns.stdout, port);
  const freed = [];
  for (const pid of pids) {
    const tl = spawnSync("tasklist", ["/FI", `PID eq ${pid}`, "/FO", "CSV", "/NH"], { encoding: "utf8", windowsHide: true });
    const name = (String(tl.stdout).match(/^"([^"]+)"/m)?.[1] ?? "").toLowerCase();
    if (!/^(python|pythonw|uv)\.exe$/.test(name)) {
      return { ok: false, error: `내부 음악 엔진 번호 ${port}번을 다른 프로그램(${name || `PID ${pid}`})이 쓰고 있습니다. 그 프로그램을 끄고 엔진을 다시 실행해 주세요.` };
    }
    spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], { windowsHide: true });
    freed.push(pid);
  }
  return { ok: true, freed };
}

export async function waitHealthy(port, { timeoutMs = 180_000 } = {}) {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/health`);
      if (r.ok) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 2000));
  }
  return false;
}
