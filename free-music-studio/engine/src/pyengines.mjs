// 파이썬으로 도는 추가 음악 엔진 공통 실행 틀(엔진 0.4.0, 2026-11-04 주인님: 「공개된 건 다 넣고 개인용과 상업용으로 나누면 되잖아」).
// 모델 하나 = pyengines-catalog.json 한 줄 + src/py/run_<id>.py.
// 설치(처음 고를 때 한 번): 원본 저장소(고정 판) 받기 → uv로 모델별 실행 환경 → 모델 받기(fms_download.py, 회원 본인 Hugging Face 토큰은 필요한 모델만).
// 실행: 작업마다 실행 스크립트를 한 번 띄운다(YuE2와 같이 그래픽 메모리를 혼자 쓴다 — main.mjs가 ACE-Step을 잠시 끈다).
import { spawn, spawnSync } from "node:child_process";
import { createWriteStream, existsSync } from "node:fs";
import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PYTHON_UTF8_ENV, dirSize, progressText, uvCacheDir, watchGrowth } from "./acestep.mjs";
import { downloadVerified, untar } from "./download.mjs";

const CATALOG = JSON.parse(await readFile(fileURLToPath(new URL("./pyengines-catalog.json", import.meta.url)), "utf8"));
const PY_DIR = fileURLToPath(new URL("./py/", import.meta.url));

export const pyCatalog = () => CATALOG;
export const pyEngineIds = () => CATALOG.engines.map((e) => e.id);
export const pyEngine = (id) => CATALOG.engines.find((e) => e.id === id) ?? null;

// ── 순수 함수(시험) ───────────────────────────────────────

/** 이 PC에서 쓸 수 있는지 — 지금은 윈도우 + NVIDIA + 그래픽 메모리 기준 */
export function pySupport(engine, { platform, nvidia, vramGb }) {
  if (platform !== "win32") return { ok: false, reason: `${engine.name}은(는) 지금 윈도우 + NVIDIA 그래픽카드에서만 쓸 수 있습니다.` };
  if (!nvidia) return { ok: false, reason: `${engine.name}은(는) NVIDIA 그래픽카드가 있어야 합니다.` };
  if (!Number.isFinite(vramGb) || vramGb < engine.minVramGb) return { ok: false, reason: `${engine.name}은(는) 그래픽 메모리 ${engine.minVramGb}GB 이상이 필요합니다${Number.isFinite(vramGb) ? `(이 PC ${vramGb}GB)` : ""}.` };
  return { ok: true, reason: "" };
}

export function pyPaths(dataDir, engine) {
  const root = path.join(dataDir, "engines", engine.id);
  const venv = path.join(root, ".venv");
  return {
    root,
    src: path.join(root, "src"),
    venv,
    python: process.platform === "win32" ? path.join(venv, "Scripts", "python.exe") : path.join(venv, "bin", "python"),
    models: path.join(root, "models"),
    hfHome: path.join(root, "hf"),
    stateFile: path.join(root, "install.json"),
    jobs: path.join(root, "jobs"),
  };
}

/** {src} 같은 자리를 실제 경로로 */
export const fillPath = (s, p) => String(s).replaceAll("{src}", p.src);

/** uv pip install 인자 목록(단계 하나) */
export function stepArgs(step, p, catalog = CATALOG) {
  const args = ["pip", "install", "--python", p.python];
  if (catalog.excludeNewer) args.push("--exclude-newer", catalog.excludeNewer);
  // PyTorch 저장소만 쓰면 filelock 같은 딸린 패키지에 올린 날짜가 없어 --exclude-newer에 모두 걸러진다(마스터PC 실물 실패 2026-11-04).
  // 그래서 PyTorch 저장소는 보조로 두고, 판이 가장 높은 것(torch는 +cu128)을 고르게 한다.
  if (step.index) args.push("--extra-index-url", catalog.indexes[step.index], "--index-strategy", "unsafe-best-match");
  if (step.override) args.push("--override", path.join(p.root, "overrides.txt"));
  return [...args, ...step.args.map((a) => fillPath(a, p))];
}

/** 모델 받기 목록(fms_download.py에 넘김) — dir 없는 것은 HF_HOME 보관 폴더로, allow가 있으면 그 파일만(MiniMax: diffusers용만 받아 57GB → 28.5GB) */
export function weightsPlan(engine, p) {
  return engine.weights.map((w) => ({
    repo: w.repo,
    revision: w.revision,
    ...(w.dir ? { dir: path.isAbsolute(fillPath(w.dir, p)) ? fillPath(w.dir, p) : path.join(p.models, w.dir) } : {}),
    ...(w.allow ? { allow: w.allow } : {}),
  }));
}

/** 설치가 끝났는지(install.json의 판이 목록과 같아야) */
export function isInstalledState(state, engine) {
  return !!state && state.status === "installed" && state.commit === sourceCommit(engine) && state.weights === weightsKey(engine) && runtimeCurrent(state, engine);
}
/**
 * Git LFS 자리표시 글이면 { oid, size } — GitHub 압축 파일(archive/<commit>.zip)은 LFS로 둔 큰 파일을 진짜 내용 대신
 * 「version https://git-lfs.github.com/spec/v1 / oid sha256:… / size …」 글(약 130바이트)로 담는다(2026-11-04 마스터PC LeVo 2 tools/new_prompt.pt).
 */
export function parseLfsPointer(text) {
  const s = String(text ?? "");
  if (!s.startsWith("version https://git-lfs.github.com/spec/v1")) return null;
  const oid = /^oid sha256:([0-9a-f]{64})$/m.exec(s)?.[1];
  const size = Number(/^size (\d+)$/m.exec(s)?.[1]);
  return oid && Number.isFinite(size) ? { oid, size } : null;
}
/** LFS 진짜 파일 주소(GitHub 미디어 서버, 판 고정) */
export const lfsMediaUrl = (repo, commit, rel) => `https://media.githubusercontent.com/media/${repo}/${commit}/${rel.split(path.sep).join("/")}`;

/** 파이썬 오류 줄(「ModuleNotFoundError: No module named 'x'」·「torch.OutOfMemoryError: …」)이면 그 줄(300자까지), 아니면 "" */
export function pyErrorCause(line) {
  const s = String(line ?? "").trim();
  if (!/^[A-Za-z_][\w.]*(Error|Exception|Interrupt)(: |$)/.test(s)) return "";
  return s.slice(0, 300);
}
/** 원본 코드 판 — 정식 패키지만으로 도는 엔진(MiniMax Music 3, 0.6.0)은 원본 코드가 없다 */
export const sourceCommit = (engine) => engine.source?.commit ?? "none";
export const weightsKey = (engine) => engine.weights.map((w) => `${w.repo}@${w.revision}`).join(",");
/** 실행 환경 단계가 목록과 같은 판인지 — 단계를 고치면 목록의 runtimeRev를 올려 설치된 PC도 한 번 다시 맞춘다 */
export const runtimeCurrent = (state, engine) => !!state.runtime && (state.runtimeRev ?? 0) === (engine.runtimeRev ?? 0);

/**
 * 우리 가사 형식([Verse] 줄바꿈 줄)을 LeVo 형식으로: 「[intro-short] ; [verse] 줄. 줄. ; [chorus] …」
 * 노래 구간(verse·chorus·bridge)만 가사를 넣고, 소리만 나는 구간은 짧은 간주로 바꾼다. 가사가 없으면 연주곡 구조.
 */
export function levoLyric(lyrics) {
  const text = String(lyrics ?? "").replace(/\r/g, "").trim();
  if (!text || /^\[instrumental\]$/i.test(text)) return "[intro-medium] ; [inst-medium] ; [inst-medium] ; [outro-medium]";
  const sections = [];
  let cur = null;
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const tag = /^\[([^\]]+)\]$/.exec(line)?.[1]?.toLowerCase();
    if (tag) {
      cur = { kind: levoKind(tag), lines: [] };
      sections.push(cur);
      continue;
    }
    if (!cur) sections.push((cur = { kind: "verse", lines: [] }));
    cur.lines.push(line.replace(/[.;\[\]。，！？、]/g, " ").replace(/\s+/g, " ").trim());
  }
  const parts = ["[intro-short]"];
  for (const s of sections) {
    if (s.kind === "inst") parts.push("[inst-short]");
    else if (s.kind === "intro" || s.kind === "outro") continue;
    else if (s.lines.length) parts.push(`[${s.kind}] ${s.lines.filter(Boolean).join(". ")}.`);
  }
  parts.push("[outro-short]");
  return parts.join(" ; ");
}
function levoKind(tag) {
  if (/chorus|hook|후렴/.test(tag)) return "chorus";
  if (/bridge|브릿지/.test(tag)) return "bridge";
  if (/intro|인트로/.test(tag)) return "intro";
  if (/outro|ending|아웃트로/.test(tag)) return "outro";
  if (/inst|solo|break|interlude|간주/.test(tag)) return "inst";
  return "verse";
}

/** LeVo descriptions: 문장 말고 쉼표로 이은 짧은 태그(원본 안내) */
export const levoDescriptions = (style) =>
  String(style ?? "")
    .toLowerCase()
    .split(/[,\n.]/)
    .map((s) => s.trim())
    .filter((s) => s && s.split(/\s+/).length <= 3)
    .slice(0, 8)
    .join(", ");

/** 실행 스크립트에 넘길 작업 내용 */
export function buildPyJob(engine, job, { p, out, vramGb }) {
  const t = job.track ?? {};
  const base = { out, vramGb, seed: Number.isInteger(t.seed) && t.seed > 0 ? t.seed : 0 };
  if (engine.id === "levo2") {
    const lyrics = String(t.lyrics ?? "").trim();
    const bgm = !lyrics || /^\[instrumental\]$/i.test(lyrics);
    return { ...base, gtLyric: levoLyric(lyrics), descriptions: levoDescriptions(t.style_prompt), bgm, srcDir: p.src, modelDir: weightsPlan(engine, p)[1].dir };
  }
  // 효과음(가사 칸 [SFX], 2026-11-05)은 3~30초라 1초까지 허용한다 — 곡은 지금처럼 10초부터
  const sfx = /^\[sfx\]$/i.test(String(t.lyrics ?? "").trim());
  const durationSec = Math.min(Math.max(Number(t.duration_sec) || 120, sfx ? 1 : 10), engine.maxSec);
  if (engine.id === "stableaudio3") return { ...base, style: String(t.style_prompt ?? "").trim(), lyrics: "", durationSec, sfx };
  if (engine.id === "heartmula") return { ...base, style: heartTags(t.style_prompt), lyrics: t.lyrics ?? "", durationSec, modelDir: path.join(p.models, "ckpt") };
  if (engine.id === "minimax3") return { ...base, style: String(t.style_prompt ?? "").trim(), lyrics: String(t.lyrics ?? ""), durationSec, repo: engine.weights[0].repo, revision: engine.weights[0].revision };
  return { ...base, style: String(t.style_prompt ?? "").trim(), lyrics: "", durationSec };
}

/** HeartMuLa 태그: 소문자, 쉼표로 이은 짧은 말(원본 assets/tags.txt 형식) */
export const heartTags = (style) =>
  String(style ?? "")
    .toLowerCase()
    .split(/[,\n.]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 12)
    .join(",");

/** 실행 스크립트 출력 한 줄 → { stage } | { error } | { done } | null */
export function parsePyLine(line) {
  const s = /^FMS_STAGE (.+)$/.exec(line)?.[1];
  if (s) return { stage: s.trim() };
  const e = /^FMS_ERROR (.+)$/.exec(line)?.[1];
  if (e) return { error: e.trim() };
  if (/^FMS_DONE\b/.test(line)) return { done: true };
  return null;
}

/** WAV(16·24·32bit 정수, 32bit 실수)가 비어 있거나 무음이 아닌지 — 길이(초) */
export function checkWav(buf) {
  if (buf.length < 44 || buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WAVE") throw new Error("올바른 WAV가 아닙니다.");
  let fmt = null;
  let data = null;
  for (let off = 12; off + 8 <= buf.length; ) {
    const name = buf.toString("ascii", off, off + 4);
    const size = buf.readUInt32LE(off + 4);
    const start = off + 8;
    if (name === "fmt " && size >= 16) fmt = { format: buf.readUInt16LE(start), channels: buf.readUInt16LE(start + 2), rate: buf.readUInt32LE(start + 4), bits: buf.readUInt16LE(start + 14) };
    if (name === "data") data = buf.subarray(start, Math.min(start + size, buf.length));
    off = start + size + (size % 2);
  }
  if (!fmt || !data?.length || ![16, 24, 32].includes(fmt.bits)) throw new Error("WAV 형식을 읽지 못했습니다.");
  const bytes = fmt.bits / 8;
  let loud = false;
  for (let o = 0; o + bytes <= data.length && !loud; o += bytes * 64) {
    const v = fmt.bits === 16 ? data.readInt16LE(o) : fmt.bits === 24 ? data.readIntLE(o, 3) : fmt.format === 3 ? data.readFloatLE(o) : data.readInt32LE(o);
    loud = Math.abs(v) > (fmt.format === 3 ? 1e-4 : 4);
  }
  if (!loud) throw new Error("소리 없는(무음) 음원이 나왔습니다. 다시 만들어 주세요.");
  return { seconds: data.length / (bytes * fmt.channels) / fmt.rate, ...fmt };
}

// ── 설치 ───────────────────────────────────────────────

const GB = 1024 ** 3;

/** 아직 받지 않은 크기(GB, 대략) */
export async function pyMissingGb(dataDir, engine) {
  const p = pyPaths(dataDir, engine);
  const state = await readState(p);
  if (isInstalledState(state, engine)) return 0;
  const have = (await dirSize(p.root)) / GB;
  return Math.max(0, Math.round((engine.weightsGb + engine.runtimeGb - have) * 10) / 10);
}

async function readState(p) {
  try {
    return JSON.parse(await readFile(p.stateFile, "utf8"));
  } catch {
    return null;
  }
}

export async function pyInstalled(dataDir, engine) {
  return isInstalledState(await readState(pyPaths(dataDir, engine)), engine) && existsSync(pyPaths(dataDir, engine).python);
}

function run(cmd, args, { cwd, env, signal, log, onLine } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, env: { ...process.env, ...PYTHON_UTF8_ENV, ...env }, windowsHide: true });
    let tail = "";
    let errorText = "";
    let cause = ""; // 파이썬이 남긴 마지막 오류 줄(「RuntimeError: …」) — 「코드 1」만 보이던 것을 화면에서 바로 알 수 있게(2026-11-04 마스터PC LeVo 2)
    const onData = (d) => {
      const text = d.toString("utf8");
      log?.(text);
      tail = (tail + text).slice(-2000);
      for (const line of text.split(/\r?\n/)) {
        const r = parsePyLine(line);
        if (r?.error) errorText = r.error;
        const c = pyErrorCause(line);
        if (c) cause = c;
        onLine?.(line, r);
      }
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    const abort = () => killTree(child);
    signal?.addEventListener("abort", abort, { once: true });
    child.on("error", reject);
    child.on("close", (code) => {
      signal?.removeEventListener("abort", abort);
      if (signal?.aborted) return reject(Object.assign(new Error("취소됨"), { name: "AbortError" }));
      if (code === 0) return resolve();
      if (errorText) return reject(new Error(cause && !errorText.includes(cause) ? `${errorText} — 원인: ${cause}` : errorText));
      reject(new Error(`${path.basename(cmd)} 실패(코드 ${code}) — ${cause || tail.trim().split(/\r?\n/).slice(-2).join(" / ").slice(0, 300)}`));
    });
  });
}

function killTree(child) {
  if (!child?.pid || child.exitCode != null) return;
  if (process.platform === "win32") spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true });
  else child.kill("SIGKILL");
}

/** 원본 폴더의 LFS 자리표시 글(1KB 미만 파일만 읽음)을 GitHub 미디어 서버의 진짜 파일로 바꾼다 — 확인값(sha256)·크기가 맞아야 저장. 바꾼 개수 */
export async function fixLfsFiles(engine, p, { onStage = () => {}, signal, fetchImpl } = {}) {
  const found = [];
  const walk = async (dir) => {
    for (const e of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name !== ".git") await walk(full);
      } else if (e.isFile()) {
        const s = await stat(full).catch(() => null);
        if (s && s.size < 1024) {
          const ptr = parseLfsPointer(await readFile(full, "utf8").catch(() => ""));
          if (ptr) found.push({ full, ptr });
        }
      }
    }
  };
  await walk(p.src);
  for (const [i, f] of found.entries()) {
    const rel = path.relative(p.src, f.full);
    onStage(`${engine.name} 원본 큰 파일 받는 중 ${i + 1}/${found.length} · ${rel.split(path.sep).join("/")}`);
    await downloadVerified({ url: lfsMediaUrl(engine.source.repo, engine.source.commit, rel), bytes: f.ptr.size, sha256: f.ptr.oid }, f.full, { signal, fetchImpl });
  }
  return found.length;
}

async function fetchSource(engine, p, { onStage, signal }) {
  const url = `https://github.com/${engine.source.repo}/archive/${engine.source.commit}.zip`;
  const zip = path.join(p.root, "src.zip");
  const res = await fetch(url, { redirect: "follow", signal });
  if (!res.ok || !res.body) throw new Error(`${engine.name} 원본을 받지 못했습니다(HTTP ${res.status}). 인터넷 연결을 확인해 주세요.`);
  let got = 0;
  let shown = 0;
  const counter = new Transform({
    transform(chunk, _e, cb) {
      got += chunk.length;
      if (Date.now() - shown > 1000) ((shown = Date.now()), onStage(`${engine.name} 원본 받는 중 · ${(got / 1024 ** 2).toFixed(0)}MB`));
      cb(null, chunk);
    },
  });
  await pipeline(Readable.fromWeb(res.body), counter, createWriteStream(zip));
  onStage(`${engine.name} 원본 푸는 중`);
  const tmp = path.join(p.root, "src-tmp");
  await rm(tmp, { recursive: true, force: true });
  await mkdir(tmp, { recursive: true });
  untar(zip, tmp);
  const [top] = await readdir(tmp);
  await rm(p.src, { recursive: true, force: true });
  await rename(path.join(tmp, top), p.src);
  await rm(tmp, { recursive: true, force: true });
  await rm(zip, { force: true });
}

/**
 * 처음 한 번 설치. 단계마다 install.json에 남겨, 끊겨도 다음에 이어서 한다.
 * @param {{ onStage?: (s: string) => void, signal?: AbortSignal, hfToken?: string, log?: (s: string) => void }} opts
 */
export async function ensurePyEngine(dataDir, engine, { onStage = () => {}, signal, hfToken = "", log = () => {} } = {}) {
  const p = pyPaths(dataDir, engine);
  await mkdir(p.root, { recursive: true });
  let state = (await readState(p)) ?? {};
  if (isInstalledState(state, engine) && existsSync(p.python)) return p;
  if (state.commit !== sourceCommit(engine)) state = { commit: sourceCommit(engine) };
  const save = (patch) => writeFile(p.stateFile, JSON.stringify((state = { ...state, ...patch }), null, 2));

  if (engine.source && (!state.source || !existsSync(path.join(p.src)))) {
    await fetchSource(engine, p, { onStage, signal });
    await save({ source: true, runtime: false, lfs: false });
  }
  // 원본 압축에 든 LFS 자리표시 글을 진짜 파일로(0.6.1) — 이미 설치된 PC도 한 번 점검한다
  if (engine.source && !state.lfs) {
    const n = await fixLfsFiles(engine, p, { onStage, signal });
    if (n) log(`# LFS 자리표시 ${n}개를 진짜 파일로 바꿈\n`);
    await save({ lfs: true });
  }
  if (!runtimeCurrent(state, engine) || !existsSync(p.python)) {
    onStage(`${engine.name} 실행 환경 만드는 중(처음 한 번)`);
    await run("uv", ["venv", "--python", engine.python, "--allow-existing", p.venv], { signal, log });
    if (engine.overrides) await writeFile(path.join(p.root, "overrides.txt"), engine.overrides.join("\n") + "\n");
    const stopDl = watchGrowth(uvCacheDir(), (b) => onStage(progressText(`${engine.name} 필요한 구성 받는 중(처음 한 번)`, b, engine.runtimeGb)), 5000);
    try {
      for (const step of engine.steps) await run("uv", stepArgs(step, p), { cwd: p.root, signal, log });
    } finally {
      stopDl();
    }
    await save({ runtime: true, runtimeRev: engine.runtimeRev ?? 0 });
  }
  if (state.weights !== weightsKey(engine)) {
    if (engine.hfToken && !hfToken) throw new Error(`${engine.name} 모델은 회원 본인 Hugging Face 토큰이 있어야 받을 수 있습니다. 사이트 「설정」에 토큰을 등록하고, ${engine.gatedUrl} 에서 약관에 동의한 뒤 다시 만들어 주세요.`);
    const plan = weightsPlan(engine, p);
    const planFile = path.join(p.root, "weights.json");
    await writeFile(planFile, JSON.stringify(plan, null, 2));
    const stop = watchGrowth(p.root, (b) => onStage(progressText(`${engine.name} 모델 받는 중(처음 한 번)`, b, engine.weightsGb)), 4000);
    try {
      await run(p.python, [path.join(PY_DIR, "fms_download.py"), planFile], { cwd: p.root, signal, log, env: { HF_HOME: p.hfHome, HF_HUB_DISABLE_TELEMETRY: "1", ...(hfToken ? { HF_TOKEN: hfToken } : {}) } });
    } finally {
      stop();
    }
    await save({ weights: weightsKey(engine), status: "installed", installedAt: new Date().toISOString() });
  } else if (state.status !== "installed") await save({ status: "installed" });
  return p;
}

/** 받은 모델·실행 환경 지우기(회원 PC 공간 돌려받기) */
export async function removePyEngine(dataDir, engine) {
  await rm(pyPaths(dataDir, engine).root, { recursive: true, force: true });
}

// ── 실행 ───────────────────────────────────────────────

/**
 * 대기열 작업 하나를 이 엔진으로 만든다.
 * @param {{ dataDir: string, engine: object, vramGb: number, library: { save: Function }, hfToken?: string, log?: (s: string) => void }} ctx
 */
export async function runPyEngine(ctx, job, signal, stage) {
  const { dataDir, engine, vramGb, library, hfToken = "", log = () => {} } = ctx;
  const p = await ensurePyEngine(dataDir, engine, { onStage: stage, signal, hfToken, log });
  await mkdir(p.jobs, { recursive: true });
  const ext = engine.id === "levo2" ? "flac" : "wav";
  const out = path.join(p.jobs, `${job.track.id}.${ext}`);
  const jobFile = path.join(p.jobs, `${job.track.id}.json`);
  await rm(out, { force: true });
  await writeFile(jobFile, JSON.stringify(buildPyJob(engine, job, { p, out, vramGb })));
  stage(`${engine.name} 켜는 중`);
  try {
    await run(p.python, [path.join(PY_DIR, engine.runner), jobFile], {
      cwd: engine.source ? p.src : p.root,
      signal,
      log,
      // 모델은 받아 둔 것만 쓴다(만드는 중에는 인터넷에 묻지 않음)
      env: { HF_HOME: p.hfHome, HF_HUB_OFFLINE: "1", TRANSFORMERS_OFFLINE: "1", HF_HUB_DISABLE_TELEMETRY: "1" },
      onLine: (_line, r) => r?.stage && stage(r.stage),
    });
    const audio = await readFile(out).catch(() => null);
    if (!audio?.length) throw new Error(`${engine.name} 결과 파일이 없습니다.`);
    if (ext === "wav") checkWav(audio);
    stage("보관함에 저장하는 중");
    await library.save(job.track.id, audio, job.title, ext);
    return { trackId: job.track.id, ext, engine: engine.id, license: engine.license };
  } finally {
    await rm(jobFile, { force: true });
    await rm(out, { force: true });
  }
}
