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
export function launch(dir, { port, apiKey, device, initLlm }, log = () => {}) {
  const child = spawn("uv", ["run", "acestep-api"], {
    cwd: dir,
    windowsHide: true,
    env: {
      ...process.env,
      ACESTEP_API_HOST: "127.0.0.1",
      ACESTEP_API_PORT: String(port),
      ACESTEP_API_KEY: apiKey,
      ACESTEP_DEVICE: device,
      ACESTEP_INIT_LLM: initLlm ? "true" : "false",
    },
  });
  child.stdout.on("data", (d) => log(String(d)));
  child.stderr.on("data", (d) => log(String(d)));
  return child;
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
