/// <reference lib="webworker" />
// 공용 기준 코드 `browser-free-tts` — 작업자(worker): 모델 받기(Cache API 저장)·세션 만들기·문장별 음성 계산. 화면이 멈추지 않게 여기서만 계산한다.
import type * as Ort from "onnxruntime-web";
import { TextToSpeech, UnicodeProcessor, loadVoiceStyle, chunkText, useOrt, type Style, type TtsConfig } from "./supertonic";
import { FREE_TTS_HF, FREE_TTS_CACHE, type WorkerIn, type WorkerOut } from "./protocol";

const post = (m: WorkerOut) => (self as unknown as Worker).postMessage(m);
const ONNX = `${FREE_TTS_HF}/onnx`;
const MODELS = ["duration_predictor", "text_encoder", "vector_estimator", "vocoder"] as const;
const SILENCE_SEC = 0.3;

let tts: TextToSpeech | null = null;
let loading: Promise<TextToSpeech> | null = null;
const styles = new Map<string, Style>();

async function bytesOf(url: string, onBytes: (n: number) => void): Promise<Uint8Array> {
  const cache = await caches.open(FREE_TTS_CACHE);
  const hit = await cache.match(url);
  if (hit) { const b = new Uint8Array(await hit.arrayBuffer()); onBytes(b.length); return b; }
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`download:${res.status}`);
  const reader = res.body.getReader(); const parts: Uint8Array[] = []; let got = 0;
  for (;;) { const { done, value } = await reader.read(); if (done) break; parts.push(value); got += value.length; onBytes(got); }
  const buf = new Uint8Array(got); let o = 0; for (const p of parts) { buf.set(p, o); o += p.length; }
  try { await cache.put(url, new Response(buf)); } catch { /* 저장 공간 부족이어도 이번 계산은 계속 */ }
  return buf;
}

async function load(threads: number): Promise<TextToSpeech> {
  if (tts) return tts;
  if (loading) return loading;
  loading = (async () => {
    const base = `${self.location.origin}/ort/`;
    const ort = (await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ `${base}ort.wasm.min.mjs`)) as typeof Ort;
    useOrt(ort);
    ort.env.wasm.wasmPaths = base;
    ort.env.wasm.numThreads = threads;
    const cfgs = (await (await fetch(`${ONNX}/tts.json`)).json()) as TtsConfig;
    const indexer = (await (await fetch(`${ONNX}/unicode_indexer.json`)).json()) as number[];
    const done: number[] = MODELS.map(() => 0);
    const sessions: Ort.InferenceSession[] = [];
    for (let i = 0; i < MODELS.length; i++) {
      const buf = await bytesOf(`${ONNX}/${MODELS[i]}.onnx`, (n) => { done[i] = n; post({ type: "progress", mb: done.reduce((a, b) => a + b, 0) / 1048576, step: i + 1, steps: MODELS.length }); });
      sessions.push(await ort.InferenceSession.create(buf, { executionProviders: ["wasm"], graphOptimizationLevel: "all" }));
    }
    tts = new TextToSpeech(cfgs, new UnicodeProcessor(indexer), sessions[0], sessions[1], sessions[2], sessions[3]);
    return tts;
  })();
  try { return await loading; } catch (e) { loading = null; throw e; }
}

async function styleOf(voice: string): Promise<Style> {
  const hit = styles.get(voice); if (hit) return hit;
  const s = await loadVoiceStyle(`${FREE_TTS_HF}/voice_styles/${voice}.json`);
  styles.set(voice, s); return s;
}

self.onmessage = async (ev: MessageEvent<WorkerIn>) => {
  const m = ev.data;
  try {
    if (m.type === "load") { await load(m.threads); post({ type: "ready" }); return; }
    const engine = await load(m.threads);
    const style = await styleOf(m.voice);
    // 문장 단위로 계산해 문장별 시각을 얻는다(자막 맞춤). 아주 짧은 문장은 40자 안에서 이웃과 합친다
    const chunks = chunkText(m.text, 40);
    const sr = engine.sampleRate, gap = Math.floor(SILENCE_SEC * sr);
    const pieces: Float32Array[] = []; const sentences: { text: string; start: number; end: number }[] = [];
    let at = 0;
    for (let i = 0; i < chunks.length; i++) {
      const { wav } = await engine.infer(chunks[i], m.lang, style, m.steps, m.speed);
      if (i > 0) { pieces.push(new Float32Array(gap)); at += gap; }
      sentences.push({ text: chunks[i], start: at / sr, end: (at + wav.length) / sr });
      pieces.push(wav); at += wav.length;
    }
    const all = new Float32Array(at); let o = 0; for (const p of pieces) { all.set(p, o); o += p.length; }
    post({ type: "done", id: m.id, samples: all, sampleRate: sr, sentences }, );
  } catch (e) {
    post({ type: "error", id: m.type === "speak" ? m.id : undefined, message: String((e as Error)?.message || e) });
  }
};
