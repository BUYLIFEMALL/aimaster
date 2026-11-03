// 비상업용 음악 엔진 YuE2(yue2.cpp) — 원본 기능을 옮김(2026-11-04, electron/native-engine.mjs).
// 받기(고정 주소·SHA-256 확인) → yue-server.exe 실행(실행마다 빈 번호) → /synth → /job 확인 → 결과(JSON + 48kHz 24bit WAV) → 보관함 저장.
// 모델은 CC BY-NC 4.0(비상업). 회원 PC가 공식 저장소에서 직접 받고, 우리 서버에는 두지 않는다.
import { createHash } from "node:crypto";
import { createReadStream, createWriteStream, existsSync } from "node:fs";
import { copyFile, mkdir, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { spawn, spawnSync } from "node:child_process";
import { Readable } from "node:stream";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pickFreePort } from "./acestep.mjs";

export const YUE2_LICENSE = "noncommercial";
export const YUE2_STYLE_MAX = 1000;
export const YUE2_LYRICS_MAX = 4000;

const CATALOG = JSON.parse(await readFile(fileURLToPath(new URL("./yue2-catalog.json", import.meta.url)), "utf8"));
export const yue2Catalog = () => CATALOG;

const GB = 1024 ** 3;

/** 그래픽 메모리로 구성 고르기 — 12GB 이상이면 최고 음질(BF16), 8GB 이상이면 Q8, 아니면 null(못 씀) */
export function pickYue2Profile(vramGb, catalog = CATALOG) {
  if (!Number.isFinite(vramGb)) return null;
  const fits = catalog.profiles.filter((p) => vramGb >= p.minVramGb).sort((a, b) => b.minVramGb - a.minVramGb);
  return fits[0] ?? null;
}

/** 이 PC에서 YuE2를 쓸 수 있는지(윈도우 + NVIDIA + 드라이버 580 이상 + 그래픽 메모리 8GB 이상) */
export function yue2Support({ platform, nvidia, vramGb, driver }, catalog = CATALOG) {
  if (platform !== "win32") return { ok: false, reason: "YuE2는 지금 윈도우 + NVIDIA 그래픽카드에서만 쓸 수 있습니다." };
  if (!nvidia) return { ok: false, reason: "YuE2는 NVIDIA 그래픽카드가 있어야 합니다." };
  const major = parseInt(String(driver ?? ""), 10);
  if (Number.isFinite(major) && major < catalog.minDriverMajor) return { ok: false, reason: `NVIDIA 드라이버 ${catalog.minDriverMajor} 이상이 필요합니다(지금 ${driver}).` };
  const profile = pickYue2Profile(vramGb, catalog);
  if (!profile) return { ok: false, reason: "YuE2는 그래픽 메모리 8GB 이상이 필요합니다." };
  return { ok: true, profile };
}

export function yue2Paths(dataDir) {
  const root = path.join(dataDir, "yue2");
  const runtimeDir = path.join(root, "runtime");
  return { root, runtimeDir, modelsDir: path.join(root, "models"), exe: path.join(runtimeDir, CATALOG.runtime.executable), cudaDll: path.join(runtimeDir, CATALOG.runtime.cudaSubdir, "ggml-cuda.dll") };
}

/** 이 구성에 필요한 파일들(받을 것) */
export function yue2Needs(profile, catalog = CATALOG) {
  const names = [profile.backbone, profile.vae];
  return catalog.models.filter((m) => names.includes(m.filename));
}

/** 받은 파일이 모두 있는가(크기 + 확인 표시 파일) */
export async function yue2Installed(dataDir, profile) {
  const p = yue2Paths(dataDir);
  if (!existsSync(p.exe) || !existsSync(p.cudaDll) || !CATALOG.cuda.files.every((f) => existsSync(path.join(p.runtimeDir, f)))) return false;
  for (const m of yue2Needs(profile)) {
    const s = await stat(path.join(p.modelsDir, m.filename)).catch(() => null);
    if (!s || s.size !== m.bytes || !existsSync(path.join(p.modelsDir, `${m.filename}.ok`))) return false;
  }
  return true;
}

/** 아직 받지 않은 크기(바이트) */
export async function yue2MissingBytes(dataDir, profile) {
  const p = yue2Paths(dataDir);
  let total = 0;
  if (!existsSync(p.exe)) total += CATALOG.runtime.bytes;
  if (!CATALOG.cuda.files.every((f) => existsSync(path.join(p.runtimeDir, f)))) total += CATALOG.cuda.bytes;
  for (const m of yue2Needs(profile)) if (!existsSync(path.join(p.modelsDir, `${m.filename}.ok`))) total += m.bytes;
  return total;
}

const gbText = (b) => `${Math.round((b / GB) * 10) / 10}GB`;

/** 받으면서 SHA-256을 함께 계산하고, 맞을 때만 이름을 바꾼다(중간에 끊기면 다시 받음) */
export async function downloadVerified({ url, bytes, sha256 }, dest, { onProgress, signal, fetchImpl = fetch }) {
  await mkdir(path.dirname(dest), { recursive: true });
  const part = `${dest}.part`;
  const res = await fetchImpl(url, { redirect: "follow", signal });
  if (!res.ok || !res.body) throw new Error(`받지 못했습니다(HTTP ${res.status}): ${path.basename(dest)}`);
  const hash = createHash("sha256");
  const out = createWriteStream(part);
  let done = 0;
  let last = 0;
  try {
    for await (const chunk of Readable.fromWeb(res.body)) {
      hash.update(chunk);
      if (!out.write(chunk)) await new Promise((r) => out.once("drain", r));
      done += chunk.length;
      if (Date.now() - last > 1000) {
        last = Date.now();
        onProgress?.(done, bytes);
      }
    }
  } finally {
    await new Promise((r) => out.end(r));
  }
  if (done !== bytes) throw new Error(`받은 크기가 다릅니다: ${path.basename(dest)}(${done}/${bytes})`);
  if (hash.digest("hex") !== sha256) throw new Error(`파일 확인값(SHA-256)이 맞지 않습니다: ${path.basename(dest)}`);
  await rename(part, dest);
}

async function findFile(dir, name) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isFile() && e.name.toLowerCase() === name.toLowerCase()) return p;
    if (e.isDirectory()) {
      const f = await findFile(p, name);
      if (f) return f;
    }
  }
  return null;
}

const untar = (zip, to) => {
  const r = spawnSync(process.platform === "win32" ? path.join(process.env.SystemRoot ?? "C:\\Windows", "System32", "tar.exe") : "tar", ["-xf", zip, "-C", to], { windowsHide: true });
  if (r.status !== 0) throw new Error(`압축을 풀지 못했습니다: ${path.basename(zip)}`);
};

/** 실행 도구·CUDA·모델 받기(처음 한 번). onStage로 「YuE2 받는 중 · 1.2/4.3GB」 */
export async function ensureYue2(dataDir, profile, { onStage = () => {}, signal, fetchImpl } = {}) {
  const p = yue2Paths(dataDir);
  await mkdir(p.root, { recursive: true });
  const need = await yue2MissingBytes(dataDir, profile);
  let base = 0;
  const progress = (label) => (done) => onStage(`YuE2 받는 중 · ${label} · ${gbText(base + done)} / ${gbText(need)}`);

  if (!existsSync(p.exe) || !existsSync(p.cudaDll)) {
    const zip = path.join(p.root, "runtime.zip");
    await downloadVerified(CATALOG.runtime, zip, { onProgress: progress("실행 도구"), signal, fetchImpl });
    base += CATALOG.runtime.bytes;
    onStage("YuE2 실행 도구 푸는 중");
    const tmp = path.join(p.root, "runtime-tmp");
    await rm(tmp, { recursive: true, force: true });
    await mkdir(tmp, { recursive: true });
    untar(zip, tmp);
    const exe = await findFile(tmp, CATALOG.runtime.executable);
    if (!exe) throw new Error("실행 도구 안에서 yue-server.exe를 찾지 못했습니다.");
    await rm(p.runtimeDir, { recursive: true, force: true });
    await rename(path.dirname(exe), p.runtimeDir);
    await rm(tmp, { recursive: true, force: true });
    await rm(zip, { force: true });
  }
  if (!CATALOG.cuda.files.every((f) => existsSync(path.join(p.runtimeDir, f)))) {
    const zip = path.join(p.root, "cublas.zip");
    await downloadVerified(CATALOG.cuda, zip, { onProgress: progress("CUDA 라이브러리"), signal, fetchImpl });
    base += CATALOG.cuda.bytes;
    onStage("CUDA 라이브러리 푸는 중");
    const tmp = path.join(p.root, "cublas-tmp");
    await rm(tmp, { recursive: true, force: true });
    await mkdir(tmp, { recursive: true });
    untar(zip, tmp);
    for (const f of CATALOG.cuda.files) {
      const src = await findFile(tmp, f);
      if (!src) throw new Error(`CUDA 라이브러리에서 ${f}를 찾지 못했습니다.`);
      await copyFile(src, path.join(p.runtimeDir, f));
    }
    await rm(tmp, { recursive: true, force: true });
    await rm(zip, { force: true });
  }
  for (const m of yue2Needs(profile)) {
    const dest = path.join(p.modelsDir, m.filename);
    if (existsSync(`${dest}.ok`)) continue;
    await downloadVerified(m, dest, { onProgress: progress(m.filename), signal, fetchImpl });
    await writeFile(`${dest}.ok`, m.sha256);
    base += m.bytes;
  }
}

// ── 결과 읽기(순수 함수 — 시험) ─────────────────────────────

/** 결과는 multipart 두 조각: JSON(다시 만들기 정보) + WAV. 서버가 준 파일 이름은 쓰지 않는다. */
export function parseYue2Multipart(buffer, contentType) {
  const boundary = /boundary="?([^";\s]+)/i.exec(contentType ?? "")?.[1];
  if (!boundary || boundary.length > 100) throw new Error("YuE2 결과 형식이 올바르지 않습니다(경계).");
  const marker = Buffer.from(`--${boundary}`);
  const sep = Buffer.from("\r\n\r\n");
  const parts = [];
  let pos = 0;
  while ((pos = buffer.indexOf(marker, pos)) >= 0) {
    pos += marker.length;
    if (buffer.subarray(pos, pos + 2).toString() === "--") break;
    const headerEnd = buffer.indexOf(sep, pos);
    if (headerEnd < 0) throw new Error("YuE2 결과 머리가 잘렸습니다.");
    const next = buffer.indexOf(Buffer.from(`\r\n--${boundary}`), headerEnd + 4);
    if (next < 0) throw new Error("YuE2 결과 데이터가 잘렸습니다.");
    const type = /content-type:\s*([^\r\n]+)/i.exec(buffer.subarray(pos, headerEnd).toString())?.[1]?.trim();
    parts.push({ type, data: buffer.subarray(headerEnd + 4, next) });
    pos = next + 2;
  }
  if (parts.length !== 2 || parts[0].type !== "application/json" || !["audio/wav", "audio/mpeg"].includes(parts[1].type)) throw new Error("YuE2 결과 형식이 예상과 다릅니다.");
  return { replay: JSON.parse(parts[0].data.toString("utf8")), audio: parts[1].data, ext: parts[1].type === "audio/wav" ? "wav" : "mp3" };
}

/** WAV가 비어 있거나 무음이 아닌지 — 길이(초)를 돌려준다 */
export function checkYue2Wav(buf) {
  if (buf.length < 44 || buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WAVE") throw new Error("YuE2가 올바른 WAV를 돌려주지 않았습니다.");
  let fmt = null;
  let data = null;
  for (let off = 12; off + 8 <= buf.length; ) {
    const name = buf.toString("ascii", off, off + 4);
    const size = buf.readUInt32LE(off + 4);
    const start = off + 8;
    if (start + size > buf.length) throw new Error("YuE2 WAV가 잘렸습니다.");
    if (name === "fmt " && size >= 16) fmt = { channels: buf.readUInt16LE(start + 2), rate: buf.readUInt32LE(start + 4), bits: buf.readUInt16LE(start + 14) };
    if (name === "data") data = buf.subarray(start, start + size);
    off = start + size + (size % 2);
  }
  if (!fmt || !data?.length || fmt.bits !== 24 || data.length % 3) throw new Error("YuE2 WAV 형식이 예상(24bit)과 다릅니다.");
  let peak = 0;
  for (let o = 0; o + 3 <= data.length && !peak; o += 3) peak = Math.abs(data.readIntLE(o, 3));
  if (!peak) throw new Error("YuE2가 소리 없는(무음) 음원을 돌려줬습니다. 다시 만들어 주세요.");
  const frame = fmt.channels * 3;
  return { seconds: data.length / frame / fmt.rate, ...fmt };
}

/** 진행 문구 → 대기열 표시 */
export function parseYue2Progress(line) {
  const ar = /\[AR\] (Score|Semantic)/.exec(line);
  if (ar) return ar[1] === "Score" ? "YuE2 · 악보 만드는 중" : "YuE2 · 음악 만드는 중";
  const step = /\[NAR\] Step (\d+)\/(\d+)/.exec(line);
  if (step) return `YuE2 · 소리 다듬는 중 ${step[1]}/${step[2]}`;
  if (/\[(VAE|Decode)\]/i.test(line)) return "YuE2 · 소리 복원 중";
  return null;
}

/** 가사가 비었거나 「[Instrumental]」이면 연주곡 */
export const isInstrumental = (lyrics) => !String(lyrics ?? "").trim() || /^\[instrumental\]$/i.test(String(lyrics).trim());

/** 곡 만들기 요청 본문(원본과 같은 칸). 연주곡은 원본처럼 가사를 비우고 연주곡 지시문을 붙인다(cot off). */
export function buildYue2Synth({ style, lyrics, seed, durationSec }) {
  const sd = Number.isInteger(seed) ? seed : Math.floor(Math.random() * 2 ** 31);
  const common = { seed: sd, lm_seed: sd, lm_batch_size: 1, synth_batch_size: 1, output_format: "wav24" };
  const s = String(style ?? "").trim();
  if (isInstrumental(lyrics)) {
    const secs = [120, 180, 240, 300].reduce((a, b) => (Math.abs(b - (durationSec || 180)) < Math.abs(a - (durationSec || 180)) ? b : a));
    const minutes = { 120: "two", 180: "three", 240: "four", 300: "five" }[secs];
    const brief = `Instrumental music only; no singing, speech, humming, choir or vocal samples. Complete approximately ${minutes}-minute composition with a developed main theme, contrasting middle section, varied reprise and a natural ending.`;
    const room = YUE2_STYLE_MAX - brief.length - 2;
    return { style: s ? `${s.slice(0, room)}\n\n${brief}` : brief, lyrics: "", cot: "off", ...common };
  }
  return { style: s.slice(0, YUE2_STYLE_MAX), lyrics: String(lyrics).slice(0, YUE2_LYRICS_MAX), cot: "full", ...common };
}

// ── 실행 ───────────────────────────────────────────────

const sleep = (ms, signal) =>
  new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => (clearTimeout(t), reject(Object.assign(new Error("취소됨"), { name: "AbortError" }))), { once: true });
  });

const killTree = (child) => {
  if (!child?.pid || child.exitCode != null) return;
  if (process.platform === "win32") spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true });
  else child.kill("SIGKILL");
};

/**
 * 대기열 작업 하나를 YuE2로 만든다.
 * @param {{ dataDir: string, profile: object, library: { save: Function }, log?: (s: string) => void }} ctx
 */
export async function runYue2(ctx, job, signal, stage) {
  const { dataDir, profile, library, log = () => {} } = ctx;
  if (!(await yue2Installed(dataDir, profile))) {
    await ensureYue2(dataDir, profile, { onStage: stage, signal });
  }
  const p = yue2Paths(dataDir);
  const port = await pickFreePort();
  const origin = `http://127.0.0.1:${port}`;
  const cudaCache = path.join(p.root, "cuda-cache");
  await mkdir(cudaCache, { recursive: true });
  const args = ["--model", path.join(p.modelsDir, profile.backbone), "--vae", path.join(p.modelsDir, profile.vae), "--host", "127.0.0.1", "--port", String(port), "--max-batch", "1"];
  stage("YuE2 켜는 중");
  const child = spawn(p.exe, args, {
    cwd: p.runtimeDir,
    windowsHide: true,
    env: { ...process.env, CUDA_CACHE_PATH: cudaCache, PATH: p.runtimeDir + path.delimiter + (process.env.PATH ?? ""), GGML_BACKEND: "CUDA0", YUE_CUDA_BACKEND: p.cudaDll },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let exited = null;
  child.on("exit", (code) => (exited = code));
  for (const s of [child.stdout, child.stderr]) {
    s.on("data", (d) => {
      const text = d.toString("utf8");
      log(text);
      for (const line of text.split(/\r?\n/)) {
        const st = parseYue2Progress(line);
        if (st) stage(st);
      }
    });
  }
  const http = async (route, init = {}) => {
    if (exited != null) throw new Error(`YuE2가 꺼졌습니다(코드 ${exited}). 엔진 기록 파일을 확인해 주세요.`);
    const r = await fetch(origin + route, { ...init, signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(30_000)]) : AbortSignal.timeout(30_000) });
    if (!r.ok) throw new Error(`YuE2 요청 실패(${r.status}): ${(await r.text()).slice(0, 300)}`);
    return r;
  };
  try {
    const until = Date.now() + 180_000;
    for (;;) {
      try {
        await http("/health");
        break;
      } catch (e) {
        if (exited != null || signal?.aborted) throw e;
        if (Date.now() > until) throw new Error("YuE2가 3분 안에 켜지지 않았습니다.");
        await sleep(1000, signal);
      }
    }
    stage("YuE2 · 곡 만드는 중");
    const { id } = await (await http("/synth", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(buildYue2Synth({ style: job.track.style_prompt, lyrics: job.track.lyrics, durationSec: job.track.duration_sec })) })).json();
    if (typeof id !== "string" || !id) throw new Error("YuE2가 작업 번호를 주지 않았습니다.");
    for (;;) {
      await sleep(500, signal);
      const { status } = await (await http(`/job?id=${encodeURIComponent(id)}`)).json();
      if (status === "done") break;
      if (status === "failed" || status === "cancelled") throw new Error(status === "cancelled" ? "YuE2 작업이 취소됐습니다." : "YuE2가 곡을 만들지 못했습니다.");
      if (status !== "running" && status !== "queued") throw new Error(`YuE2 작업 상태를 알 수 없습니다(${status}).`);
    }
    const res = await http(`/job?id=${encodeURIComponent(id)}&result=1`);
    const out = parseYue2Multipart(Buffer.from(await res.arrayBuffer()), res.headers.get("content-type"));
    if (out.ext === "wav") checkYue2Wav(out.audio);
    stage("보관함에 저장하는 중");
    await library.save(job.track.id, out.audio, job.title, out.ext);
    return { trackId: job.track.id, ext: out.ext, engine: "yue2", license: YUE2_LICENSE };
  } finally {
    killTree(child);
  }
}
