// 공용 기준 코드 `browser-free-tts` — 화면 쪽 연결: 작업자 하나를 두고 모델 받기·음성 만들기를 맡긴다
import { freeTtsErrorText, writeWav, type FreeSentence, type WorkerIn, type WorkerOut } from "./protocol";

export interface FreeTtsProgress { mb: number; step: number; steps: number }
export class FreeTtsError extends Error { constructor(message: string, readonly raw: string) { super(message); } }

let worker: Worker | null = null;
let seq = 0;
const jobs = new Map<number, { ok: (m: Extract<WorkerOut, { type: "done" }>) => void; no: (e: Error) => void }>();
const listeners = new Set<(p: FreeTtsProgress) => void>();
let ready: Promise<void> | null = null;
let readyOk: (() => void) | null = null, readyNo: ((e: Error) => void) | null = null;

/** 교차 출처 격리(COOP/COEP)면 여러 줄 계산, 아니면 한 줄(사파리 등) */
export const freeTtsThreads = () => (typeof self !== "undefined" && self.crossOriginIsolated ? Math.min(8, navigator.hardwareConcurrency || 4) : 1);

function fail(raw: string) { return new FreeTtsError(freeTtsErrorText(raw), raw); }

function getWorker(): Worker {
  if (worker) return worker;
  const w = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
  w.onmessage = (ev: MessageEvent<WorkerOut>) => {
    const m = ev.data;
    if (m.type === "progress") listeners.forEach((f) => f(m));
    else if (m.type === "ready") readyOk?.();
    else if (m.type === "done") { jobs.get(m.id)?.ok(m); jobs.delete(m.id); }
    else if (m.type === "error") {
      const e = fail(m.message);
      if (m.id != null) { jobs.get(m.id)?.no(e); jobs.delete(m.id); } else { readyNo?.(e); ready = null; }
    }
  };
  w.onerror = (ev) => { const e = fail(ev.message || "worker"); readyNo?.(e); ready = null; jobs.forEach((j) => j.no(e)); jobs.clear(); worker?.terminate(); worker = null; };
  worker = w; return w;
}

/** 모델 준비(처음 약 400MB 내려받기, 두 번째부터 브라우저 저장분) */
export function loadFreeTts(onProgress?: (p: FreeTtsProgress) => void): Promise<void> {
  if (onProgress) listeners.add(onProgress);
  if (!ready) {
    ready = new Promise<void>((ok, no) => { readyOk = ok; readyNo = no; });
    getWorker().postMessage({ type: "load", threads: freeTtsThreads() } satisfies WorkerIn);
  }
  return ready.finally(() => { if (onProgress) listeners.delete(onProgress); });
}

/** 글 → WAV 음성(16bit 모노)과 문장별 시각 */
export async function speak(text: string, o: { voice: string; speed: number; steps?: number; lang?: string }): Promise<{ wav: Blob; sec: number; sentences: FreeSentence[] }> {
  await loadFreeTts();
  const id = ++seq;
  const m = await new Promise<Extract<WorkerOut, { type: "done" }>>((ok, no) => {
    jobs.set(id, { ok, no });
    getWorker().postMessage({ type: "speak", id, threads: freeTtsThreads(), text, voice: o.voice, speed: o.speed, steps: o.steps ?? 8, lang: o.lang ?? "ko" } satisfies WorkerIn);
  });
  return { wav: new Blob([writeWav(m.samples, m.sampleRate)], { type: "audio/wav" }), sec: m.samples.length / m.sampleRate, sentences: m.sentences };
}
