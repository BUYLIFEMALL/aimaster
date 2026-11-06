// 자동 가사 정렬(엔진 0.6.9) — 원본 boks-music `electron/lyric-alignment.mjs`·`setup-lyrics.ps1`(MIT, © 2026 boksajang)를 옮김.
// 순서(원본 main.mjs lyricsAlign): 보컬만 분리(vocal-cache) → Qwen3-ForcedAligner(가사로 시작점) + Qwen3-ASR(받아쓰기로 교차 확인)
// → 두 추정이 맞는 줄만 「자동」, 나머지는 「확인 필요」 → 직접 맞춘 시작점은 그대로 둔다. 모델은 둘 다 Apache-2.0(2026-11-06 확인).
// 설치는 추가 엔진 틀(ensurePyEngine) — 원본과 같은 고정 판(torch 2.8.0, transformers 5.19.0).
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { mkdir, readFile, rm, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ensurePyEngine } from "./pyengines.mjs";
import { finalizeAutomaticTiming, normalizeLyrics, ONSET_POLICY, preserveManualStarts, sameTimingSource } from "./lyric-timing.mjs";
import { parseMediaInfo, probe } from "./mastering.mjs";

const PY_DIR = fileURLToPath(new URL("./py/", import.meta.url));

// 원본 LYRIC_ENGINES — 판은 setup_lyrics_models.py와 같아야 한다
export const LYRIC_ENGINES = Object.freeze([
  { id: "qwen", kind: "qwen3-forced-aligner", stage: "aligner", name: "Qwen ForcedAligner", role: "가사 시작점 정렬", version: "c07281df297b9905d24a508279258cccf987a064" },
  { id: "asr-1.7b", kind: "qwen3-asr", stage: "recognizer", name: "Qwen3-ASR 1.7B", role: "가사 인식 교차 확인", version: "bcd2b5b7f32b480ab5790554cfa8347f246a14f3" },
]);
// 원본이 실제 곡으로 확인한 언어만(한국어·영어)
export const LYRIC_LANGUAGES = Object.freeze([
  { code: "ko", name: "Korean", label: "한국어", script: /\p{Script=Hangul}/u, engineNames: { asr: "Korean", aligner: "Korean" } },
  { code: "en", name: "English", label: "영어", script: /\p{Script=Latin}/u, engineNames: { asr: "English", aligner: "English" } },
]);
export const LYRIC_ALIGNMENT_LIMITS = Object.freeze({ maxDurationSeconds: 600 });

export function detectLyricLanguage(lines) {
  const text = lines.map((l) => l.text).join("\n");
  return LYRIC_LANGUAGES.find((l) => l.script.test(text)) || null;
}
export function lyricAlignmentSupport({ lines, duration }) {
  const minutes = LYRIC_ALIGNMENT_LIMITS.maxDurationSeconds / 60;
  if (Number.isFinite(duration) && duration > LYRIC_ALIGNMENT_LIMITS.maxDurationSeconds) return { supported: false, language: null, reason: `${minutes}분을 넘는 곡은 자동 맞추기 범위를 벗어납니다.` };
  const language = detectLyricLanguage(lines);
  if (!language) return { supported: false, language: null, reason: `자동 맞추기는 ${LYRIC_LANGUAGES.map((l) => l.label).join("·")} 가사를 지원합니다. 다른 언어는 직접 맞춰 주세요.` };
  return { supported: true, language, reason: "" };
}
const engineRequest = () => {
  const pick = (stage) => LYRIC_ENGINES.filter((e) => e.stage === stage).map((e) => ({ folder: e.id, kind: e.kind }));
  return { aligner: pick("aligner")[0], asr: pick("recognizer")[0] };
};

/** 장치별 설치 묶음 — 원본 setup-lyrics.ps1과 같은 판 */
export function lyricTool(device) {
  const cuda = device === "cuda";
  return {
    id: cuda ? "lyrics-cuda" : "lyrics-cpu",
    name: "가사 자동 맞추기",
    python: "3.11",
    runtimeRev: 1,
    catalog: { indexes: { torch: cuda ? "https://download.pytorch.org/whl/cu128" : "https://download.pytorch.org/whl/cpu" } },
    steps: [
      { index: "torch", args: ["--only-binary", ":all:", "torch==2.8.0", "torchaudio==2.8.0"] },
      { args: ["--only-binary", ":all:", "transformers==5.19.0", "soundfile==0.13.1", "scipy==1.17.1", "soynlp==0.0.493", "librosa==0.11.0"] },
    ],
    weights: [], // 모델은 setup_lyrics_models.py가 고정 판·SHA-256으로 받는다(약 4.5GB)
    weightsGb: 0,
    runtimeGb: cuda ? 5 : 1.5,
  };
}

/** 받은 모델이 고정 판·크기 그대로인지(원본 verifyModelFiles) */
export async function verifyModelFiles(modelRoot, names = LYRIC_ENGINES.map((m) => m.id)) {
  for (const name of names) {
    const folder = path.join(modelRoot, name);
    const manifest = JSON.parse(await readFile(path.join(folder, "boks-model-manifest.json"), "utf8"));
    if (!Array.isArray(manifest.files) || !manifest.files.some((f) => f.filename.endsWith(".safetensors"))) throw new Error("가사 분석 모델 파일이 없습니다.");
    if (manifest.revision !== LYRIC_ENGINES.find((m) => m.id === name)?.version) throw new Error("가사 분석 모델 버전이 다릅니다.");
    for (const f of manifest.files) {
      const target = path.resolve(folder, f.filename);
      const rel = path.relative(folder, target);
      if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) throw new Error("가사 분석 모델 경로가 올바르지 않습니다.");
      const info = await stat(target);
      if (!info.isFile() || (f.bytes && info.size !== f.bytes)) throw new Error("가사 분석 모델 파일이 불완전합니다.");
    }
  }
}

/** 파이썬을 띄워 JSON을 넘기고 JSONL을 받는다(원본 processJson) */
function processJson(executable, args, { input, signal, onProgress = () => {}, log = () => {}, env = {} } = {}) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new Error("작업이 취소되었습니다."));
    const child = spawn(executable, args, { windowsHide: true, shell: false, stdio: ["pipe", "pipe", "pipe"], env: { ...process.env, PYTHONUTF8: "1", PYTHONIOENCODING: "utf-8", ...env } });
    let result, failure, stderr = "";
    const abort = () => {
      if (!child.pid) return;
      if (process.platform === "win32") spawn("taskkill.exe", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" }).on("error", () => child.kill());
      else child.kill("SIGKILL");
    };
    signal?.addEventListener("abort", abort, { once: true });
    const lines = createInterface({ input: child.stdout });
    lines.on("line", (line) => {
      try {
        const row = JSON.parse(line.replace(/^﻿/, ""));
        if (row.type === "progress") onProgress(row);
        else if (row.type === "result") result = row;
        else if (row.type === "error") failure = row.message;
        else log(line + "\n");
      } catch {
        log(line + "\n");
      }
    });
    child.stderr.on("data", (c) => {
      stderr = (stderr + c).slice(-5000);
      log(String(c));
    });
    child.stdin.on("error", () => {});
    child.stdin.end(input ? JSON.stringify(input) : undefined);
    child.on("error", (e) => (signal?.removeEventListener("abort", abort), reject(e)));
    child.on("close", (code) => {
      signal?.removeEventListener("abort", abort);
      lines.close();
      if (signal?.aborted) reject(new Error("작업이 취소되었습니다."));
      else if (code || failure || !result) reject(new Error(failure || "가사 시간 분석에 실패했습니다. " + stderr.slice(-600)));
      else resolve(result);
    });
  });
}

/** 원본 결과 → 우리 가사 시간 형식(사이트 lyricTiming.ts) — 「unmatched」는 「확인 필요」로 */
export function toSiteTiming(timing) {
  const cues = timing.cues.map((c) => ({
    lineId: c.lineId,
    text: c.text,
    start: Number.isFinite(c.start) ? Math.round(c.start * 1000) / 1000 : null,
    end: Number.isFinite(c.end) ? Math.round(c.end * 1000) / 1000 : null,
    status: c.status === "automatic" || c.status === "manual" ? c.status : "review",
  }));
  return { lyricsHash: timing.lyricsHash, duration: Math.round(timing.duration * 1000) / 1000, status: cues.every((c) => c.status !== "review") ? "automatic" : "review", cues };
}

/**
 * @param {{ dataDir: () => string, library: object, stems: ReturnType<typeof import("./stems.mjs").createStems>, getDevice: () => {ok:boolean,device:string,reason:string}, log?: (s:string)=>void }} p
 */
export function createLyricAligner({ dataDir, library, stems, getDevice, log = () => {} }) {
  const modelRoot = () => path.join(dataDir(), "engines", "lyrics-models");
  return {
    /** 대기열 작업 — task { sourceId, lyrics, previousTiming } → { sourceId, timing(사이트 형식), review } */
    async run(job, signal, stage) {
      const dev = getDevice();
      if (!dev.ok) throw new Error(dev.reason);
      const src = await library.fileOf(job.task?.sourceId);
      if (!src) throw new Error("이 PC 보관함에 원곡 음원이 없습니다(옮기거나 지웠을 수 있음).");
      const lyrics = String(job.task.lyrics ?? "");
      const { lines, lyricsHash } = normalizeLyrics(lyrics);
      if (!lines.length) throw new Error("대괄호 태그를 뺀 가사가 있어야 합니다.");
      const duration = parseMediaInfo(await probe("ffmpeg", src)).duration;
      if (!Number.isFinite(duration) || duration <= 0) throw new Error("곡 길이를 확인하지 못했습니다(ffmpeg가 있는지 확인해 주세요).");
      const support = lyricAlignmentSupport({ lines, duration });
      if (!support.supported) throw new Error(support.reason);
      const vocal = await stems.vocalFor(src, signal, stage);
      const p = await ensurePyEngine(dataDir(), lyricTool(dev.device), { onStage: (s) => stage(`가사 분석 · ${s}`), signal, log });
      try {
        await verifyModelFiles(modelRoot());
      } catch {
        stage("가사 분석 모델 받는 중(처음 한 번, 약 4.5GB)");
        await processJson(p.python, [path.join(PY_DIR, "setup_lyrics_models.py"), "--model-root", modelRoot()], { signal, log, onProgress: (r) => stage(`가사 분석 모델 · ${r.stage}${r.progress ? ` ${Math.round(r.progress)}%` : ""}`) });
        await verifyModelFiles(modelRoot());
      }
      const previous = job.task.previousTiming ?? null;
      const preservedCues = sameTimingSource(previous, lyricsHash, duration) ? previous.cues?.filter((c) => ["automatic", "manual"].includes(c.status)) || [] : [];
      const work = path.join(p.root, "jobs", job.id);
      await mkdir(work, { recursive: true });
      try {
        stage(dev.device === "cuda" ? "가사 시작점 찾는 중" : "가사 시작점 찾는 중(CPU — 몇 분 걸림)");
        const result = await processJson(p.python, [path.join(PY_DIR, "lyric_alignment.py")], {
          signal,
          log,
          onProgress: (r) => stage(r.stage),
          env: dev.device === "cpu" ? { CUDA_VISIBLE_DEVICES: "" } : {},
          input: {
            audioPath: vocal,
            lines,
            language: { code: support.language.code, ...support.language.engineNames },
            engines: engineRequest(),
            onsetPolicy: ONSET_POLICY,
            maxDurationSeconds: LYRIC_ALIGNMENT_LIMITS.maxDurationSeconds,
            preservedCues,
            modelRoot: modelRoot(),
            outputPath: path.join(work, "lyric-timing.raw.json"),
          },
        });
        const cues = finalizeAutomaticTiming({ lines, result, duration });
        const timing = preserveManualStarts(
          { lyricsHash, duration, cues, models: result.models, automation: { ...result.automation, timingMode: "line-starts", needsConfirmation: cues.filter((c) => !["automatic", "manual"].includes(c.status)).map((c) => c.lineId) } },
          previous
        );
        const site = toSiteTiming(timing);
        const review = site.cues.filter((c) => c.status === "review").length;
        log(`🎤 가사 자동 맞추기: ${job.title} — ${lines.length}줄 중 확인 필요 ${review}줄 (${support.language.label}, ${dev.device})`);
        return { sourceId: job.task.sourceId, timing: site, review };
      } finally {
        await rm(work, { recursive: true, force: true }).catch(() => {});
      }
    },
  };
}
