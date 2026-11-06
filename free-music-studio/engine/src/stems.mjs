// Stem 분리(엔진 0.6.9) — 원본 boks-music `setup-runtime.ps1`(stems)·`runner.py`·`stem-label.mjs`·`vocal-cache.mjs`(MIT, © 2026 boksajang)를 옮김.
// 보관함 곡을 BS-RoFormer로 보컬/반주 2트랙 또는 6트랙으로 나눠, 노래 저장 폴더 「Stem」 아래에 WAV로 둔다(서버로 보내지 않음).
// 설치는 추가 엔진 틀(ensurePyEngine)을 그대로 쓴다: uv 전용 파이썬 3.11 + 원본과 같은 고정 판 패키지(torch 2.8.0, audio-separator 0.47.0).
// 그래픽카드(NVIDIA 4GB 이상)가 없으면 CPU로 한다(느리지만 됨, 원본 stems-cpu).
import { mkdir, readFile, rename, rm, rmdir, stat, writeFile, copyFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ensurePyEngine, runPy } from "./pyengines.mjs";
import { safeFileName } from "./library.mjs";
import { createVocalCache } from "./vocal-cache.mjs";

const TWO_MODEL = "model_bs_roformer_ep_317_sdr_12.9755.ckpt"; // run_stems.py와 같게

const PY_DIR = fileURLToPath(new URL("./py/", import.meta.url));
export const STEM_MODES = ["two", "multi"];
export const MIN_STEM_VRAM_GB = 4;

/** 분리 장치 — NVIDIA 그래픽 메모리 4GB 이상이면 cuda, 아니면 cpu(윈도우만) */
export function stemDevice({ platform, nvidia, vramGb }) {
  if (platform !== "win32") return { ok: false, device: "", reason: "Stem 분리는 지금 윈도우에서만 쓸 수 있습니다." };
  return { ok: true, device: nvidia && Number.isFinite(vramGb) && vramGb >= MIN_STEM_VRAM_GB ? "cuda" : "cpu", reason: "" };
}

/** 장치별 설치 묶음(실행 환경 폴더가 따로) — 원본 setup-runtime.ps1과 같은 판 */
export function stemTool(device) {
  const cuda = device === "cuda";
  const torch = ["torch==2.8.0", "torchvision==0.23.0"];
  return {
    id: cuda ? "stems-cuda" : "stems-cpu",
    name: "Stem 분리",
    python: "3.11",
    runtimeRev: 1,
    // 음악 엔진 목록의 날짜 제한(--exclude-newer)은 쓰지 않는다 — 판을 모두 고정했다
    catalog: { indexes: { torch: cuda ? "https://download.pytorch.org/whl/cu128" : "https://download.pytorch.org/whl/cpu" } },
    steps: [
      { index: "torch", args: ["--only-binary", ":all:", ...torch] },
      {
        index: "torch",
        // PyPI onnxruntime 1.27+는 CUDA 13이 기본 — torch CUDA 12.8에 맞춘다(원본 주석)
        args: ["--only-binary", ":all:", ...torch, `audio-separator[${cuda ? "gpu" : "cpu"}]==0.47.0`, cuda ? "onnxruntime-gpu==1.23.2" : "onnxruntime==1.23.2", "imageio-ffmpeg==0.6.0", "numpy==2.2.6", "numba==0.61.2", "llvmlite==0.44.0", "scipy==1.15.3"],
      },
    ],
    weights: [], // 모델은 run_stems.py가 처음 쓸 때 받는다(2트랙은 audio-separator, 6트랙은 고정 판·SHA-256)
    weightsGb: 0,
    runtimeGb: cuda ? 5.5 : 1.5,
  };
}

const LABEL = { vocals: "보컬", vocal: "보컬", instrumental: "반주", no_vocals: "반주", drums: "드럼", drum: "드럼", bass: "베이스", guitar: "기타", piano: "피아노", other: "그 외 소리", strings: "현악기" };
const ORDER = ["보컬", "반주", "드럼", "베이스", "기타", "피아노", "현악기", "그 외 소리"];
/** 결과 파일 이름 「stem_(Vocals).wav」 → 한국어 이름표(원본 stemLabel) */
export function stemLabel(file = "") {
  const name = String(file).replace(/\\/g, "/").split("/").pop() ?? "";
  const part = [...name.matchAll(/\(([^)]+)\)/g)].at(-1)?.[1];
  if (part) return LABEL[part.toLowerCase()] ?? part.replace(/[-_]/g, " ");
  const lower = name.toLowerCase();
  const found = Object.keys(LABEL).find((k) => new RegExp(`(^|[^a-z])${k}([^a-z]|$)`).test(lower));
  return found ? LABEL[found] : "소리";
}
const rank = (label) => (ORDER.includes(label) ? ORDER.indexOf(label) : ORDER.length);
export const sortStems = (files) => [...files].sort((a, b) => rank(a.label) - rank(b.label));

/**
 * @param {{ dataDir: () => string, library: object, recordFile: string, getDevice: () => {ok:boolean, device:string, reason:string}, log?: (s:string)=>void }} p
 */
export function createStems({ dataDir, library, recordFile, getDevice, log = () => {} }) {
  let records = null;
  const load = async () => {
    if (records) return records;
    try {
      const v = JSON.parse(await readFile(recordFile, "utf8"));
      records = Array.isArray(v) ? v : [];
    } catch {
      records = [];
    }
    return records;
  };
  const save = async () => {
    const tmp = `${recordFile}.${randomUUID()}.tmp`;
    await writeFile(tmp, JSON.stringify(records, null, 1));
    await rename(tmp, recordFile);
  };
  const stemRoot = () => path.join(library.dir, "Stem");
  const inside = (p) => {
    const rel = path.relative(stemRoot(), p);
    return !!rel && !rel.startsWith("..") && !path.isAbsolute(rel);
  };

  return {
    stemRoot,
    /** 대기열 작업 실행 — job.task { sourceId, mode }, job.track.id = 이번 분리 번호 */
    async run(job, signal, stage) {
      const dev = getDevice();
      if (!dev.ok) throw new Error(dev.reason);
      const mode = job.task?.mode === "multi" ? "multi" : "two";
      const src = await library.fileOf(job.task?.sourceId);
      if (!src) throw new Error("이 PC 보관함에 원곡 음원이 없습니다(옮기거나 지웠을 수 있음).");
      const tool = stemTool(dev.device);
      const p = await ensurePyEngine(dataDir(), tool, { onStage: stage, signal, log });
      const work = path.join(p.root, "jobs", job.id);
      const resultFile = path.join(work, "result.json");
      const jobFile = path.join(work, "job.json");
      await rm(work, { recursive: true, force: true });
      await mkdir(work, { recursive: true });
      try {
        await writeFile(jobFile, JSON.stringify({ mode, audioPath: src, outDir: path.join(work, "out"), modelDir: path.join(dataDir(), "engines", "stems-models"), device: dev.device, resultFile }));
        stage("Stem 분리 켜는 중");
        await runPy(p.python, [path.join(PY_DIR, "run_stems.py"), jobFile], {
          cwd: p.root,
          signal,
          log,
          env: { HF_HUB_DISABLE_TELEMETRY: "1" },
          onLine: (_l, r) => r?.stage && stage(r.stage),
        });
        const result = JSON.parse(await readFile(resultFile, "utf8"));
        stage("노래 저장 폴더에 옮기는 중");
        const title = safeFileName(job.title.replace(/ \((2트랙|6트랙) Stem\)$/, ""));
        let dir = path.join(stemRoot(), `${title} (${mode === "multi" ? "6트랙" : "2트랙"})`);
        for (let n = 2; await stat(dir).then(() => true, () => false); n++) dir = path.join(stemRoot(), `${title} (${mode === "multi" ? "6트랙" : "2트랙"}) ${n}`);
        await mkdir(dir, { recursive: true });
        const files = [];
        for (const f of result.stems) {
          const label = stemLabel(f);
          const target = path.join(dir, `${label}.wav`);
          try {
            await rename(f, target);
          } catch (e) {
            if (e.code !== "EXDEV") throw e;
            await copyFile(f, target);
          }
          files.push({ label, file: target, size: (await stat(target)).size });
        }
        const record = { id: job.track.id, sourceId: job.task.sourceId, title: job.title, mode, dir, createdAt: new Date().toISOString(), device: result.device, model: result.model, files: sortStems(files) };
        await load();
        records.unshift(record);
        await save();
        log(`🎚 Stem 분리: ${job.title} → ${dir} (${files.length}트랙, ${result.device})`);
        return { stemId: record.id, mode, count: files.length };
      } finally {
        await rm(work, { recursive: true, force: true }).catch(() => {});
      }
    },
    /**
     * 가사 분석용 보컬 WAV — 원본 vocal-cache: 같은 음원·모델이면 한 번 분리한 것을 다시 쓴다(최대 5GB, 오래된 것부터 정리).
     * 결과는 「Stem」 폴더가 아니라 엔진 데이터 폴더 vocal-cache에 둔다.
     */
    async vocalFor(src, signal, stage) {
      const dev = getDevice();
      if (!dev.ok) throw new Error(dev.reason);
      const cache = createVocalCache({ root: path.join(dataDir(), "vocal-cache") });
      const key = await cache.key(src, TWO_MODEL);
      const hit = await cache.get(key);
      if (hit) return hit;
      const p = await ensurePyEngine(dataDir(), stemTool(dev.device), { onStage: (s) => stage(`가사 분석용 보컬 · ${s}`), signal, log });
      const work = path.join(p.root, "jobs", `vocal-${randomUUID()}`);
      const resultFile = path.join(work, "result.json");
      await mkdir(work, { recursive: true });
      try {
        await writeFile(path.join(work, "job.json"), JSON.stringify({ mode: "two", singleStem: "Vocals", audioPath: src, outDir: path.join(work, "out"), modelDir: path.join(dataDir(), "engines", "stems-models"), device: dev.device, resultFile }));
        await runPy(p.python, [path.join(PY_DIR, "run_stems.py"), path.join(work, "job.json")], { cwd: p.root, signal, log, onLine: (_l, r) => r?.stage && stage(`가사 분석용 보컬 · ${r.stage}`) });
        const result = JSON.parse(await readFile(resultFile, "utf8"));
        signal?.throwIfAborted?.();
        return await cache.put(key, result.stems[0]);
      } finally {
        await rm(work, { recursive: true, force: true }).catch(() => {});
      }
    },
    /** 한 곡의 분리 결과(최근 것부터) — 파일이 없어진 트랙은 missing */
    async listFor(sourceId) {
      const out = [];
      for (const r of (await load()).filter((x) => x.sourceId === sourceId)) {
        const files = [];
        for (const f of r.files) files.push({ label: f.label, size: f.size, missing: !(await stat(f.file).then((s) => s.isFile(), () => false)) });
        out.push({ id: r.id, mode: r.mode, createdAt: r.createdAt, dir: r.dir, device: r.device, files });
      }
      return out;
    },
    async fileOf(id, index) {
      const r = (await load()).find((x) => x.id === id);
      const f = r?.files[index];
      if (!f || !(await stat(f.file).then((s) => s.isFile(), () => false))) return null;
      return f;
    },
    /** 분리 결과 지우기 — 「Stem」 폴더 안 파일만 지운다 */
    async remove(id) {
      const list = await load();
      const r = list.find((x) => x.id === id);
      if (!r) return false;
      for (const f of r.files) if (inside(f.file)) await rm(f.file, { force: true });
      if (inside(r.dir)) await rmdir(r.dir).catch(() => {}); // 비었을 때만 — 회원이 넣은 다른 파일이 있으면 폴더는 남긴다
      records = list.filter((x) => x.id !== id);
      await save();
      return true;
    },
  };
}
