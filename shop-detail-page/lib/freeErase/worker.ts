/// <reference lib="webworker" />
// 공용 기준 코드 `browser-free-erase` — 작업자(worker): 모델 받기(Cache API 저장)·세션 만들기·지우기/글자 찾기 계산. 화면이 멈추지 않게 여기서만 계산한다.
// onnxruntime-web은 묶지 않고 같은 주소 정적 파일(/ort/, scripts/copy-ort.mjs)에서 불러온다(docs/ERROR_LESSONS.md 2026-10-24).
import type * as Ort from "onnxruntime-web";
import { FREE_ERASE_CACHE, FREE_ERASE_MODELS, LAMA_SIZE, type Backend, type ModelKind, type WorkerIn, type WorkerOut } from "./protocol";

const post = (m: WorkerOut, transfer: Transferable[] = []) => (self as unknown as Worker).postMessage(m, transfer);

let ortP: Promise<typeof Ort> | null = null;
const sessions = new Map<ModelKind, { s: Ort.InferenceSession; backend: Backend }>();
const loading = new Map<ModelKind, Promise<{ s: Ort.InferenceSession; backend: Backend }>>();
const bytes = new Map<ModelKind, Uint8Array>();

function getOrt(threads: number): Promise<typeof Ort> {
  if (!ortP) {
    ortP = (async () => {
      const base = `${self.location.origin}/ort/`;
      const ort = (await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ `${base}ort.webgpu.min.mjs`)) as typeof Ort;
      ort.env.wasm.wasmPaths = base;
      ort.env.wasm.numThreads = threads;
      return ort;
    })();
    ortP.catch(() => { ortP = null; });
  }
  return ortP;
}

async function modelBytes(kind: ModelKind): Promise<Uint8Array> {
  const hit0 = bytes.get(kind); if (hit0) return hit0;
  const { url, bytes: total } = FREE_ERASE_MODELS[kind];
  const cache = await caches.open(FREE_ERASE_CACHE);
  const hit = await cache.match(url);
  if (hit) { const b = new Uint8Array(await hit.arrayBuffer()); post({ type: "progress", model: kind, loaded: b.length, total: b.length }); bytes.set(kind, b); return b; }
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`download:${res.status}`);
  const reader = res.body.getReader(); const parts: Uint8Array[] = []; let got = 0, last = 0;
  for (;;) {
    const { done, value } = await reader.read(); if (done) break;
    parts.push(value); got += value.length;
    if (got - last > 2 * 1048576) { last = got; post({ type: "progress", model: kind, loaded: got, total }); }
  }
  const buf = new Uint8Array(got); let o = 0; for (const p of parts) { buf.set(p, o); o += p.length; }
  post({ type: "progress", model: kind, loaded: got, total: got });
  try { await cache.put(url, new Response(buf)); } catch { /* 저장 공간 부족이어도 이번 계산은 계속 */ }
  bytes.set(kind, buf);
  return buf;
}

async function create(kind: ModelKind, threads: number, prefer: Backend[]): Promise<{ s: Ort.InferenceSession; backend: Backend }> {
  const ort = await getOrt(threads);
  const buf = await modelBytes(kind);
  let lastErr: unknown;
  for (const backend of prefer) {
    if (backend === "webgpu" && !("gpu" in navigator)) continue;
    try { return { s: await ort.InferenceSession.create(buf, { executionProviders: [backend], graphOptimizationLevel: "all" }), backend }; }
    catch (e) { lastErr = e; }
  }
  throw lastErr ?? new Error("no-backend");
}

function session(kind: ModelKind, threads: number) {
  const hit = sessions.get(kind); if (hit) return Promise.resolve(hit);
  let p = loading.get(kind);
  if (!p) {
    // 지우기는 WebGPU가 3~5배 빠르다(§7 ④). 글자 찾기는 작아서 WASM으로 충분
    p = create(kind, threads, kind === "lama" ? ["webgpu", "wasm"] : ["wasm"]).then((r) => { sessions.set(kind, r); return r; });
    loading.set(kind, p);
    p.catch(() => {}).finally(() => loading.delete(kind));
  }
  return p;
}

async function runLama(threads: number, image: Float32Array, mask: Float32Array): Promise<Float32Array> {
  const ort = await getOrt(threads);
  const feeds = (s: Ort.InferenceSession) => ({
    [s.inputNames[0]]: new ort.Tensor("float32", image, [1, 3, LAMA_SIZE, LAMA_SIZE]),
    [s.inputNames[1]]: new ort.Tensor("float32", mask, [1, 1, LAMA_SIZE, LAMA_SIZE]),
  });
  let cur = await session("lama", threads);
  try {
    const out = await cur.s.run(feeds(cur.s));
    return out[cur.s.outputNames[0]].data as Float32Array;
  } catch (e) {
    if (cur.backend !== "webgpu") throw e;
    // WebGPU에서 일부 연산이 안 되는 기기 → WASM으로 바꿔 한 번 더
    await cur.s.release().catch(() => {});
    sessions.delete("lama");
    cur = await create("lama", threads, ["wasm"]);
    sessions.set("lama", cur);
    post({ type: "ready", model: "lama", backend: cur.backend });
    const out = await cur.s.run(feeds(cur.s));
    return out[cur.s.outputNames[0]].data as Float32Array;
  }
}

self.onmessage = async (ev: MessageEvent<WorkerIn>) => {
  const m = ev.data;
  try {
    if (m.type === "load") { const r = await session(m.model, m.threads); post({ type: "ready", model: m.model, backend: r.backend }); return; }
    if (m.type === "erase") {
      const rgb = await runLama(m.threads, m.image, m.mask);
      const copy = new Float32Array(rgb); // 세션 버퍼를 넘기지 않도록 복사해 보낸다
      post({ type: "erased", id: m.id, rgb: copy }, [copy.buffer]);
      return;
    }
    const det = await session("det", m.threads);
    const ort = await getOrt(m.threads);
    const out = await det.s.run({ [det.s.inputNames[0]]: new ort.Tensor("float32", m.input, [1, 3, m.height, m.width]) });
    const t = out[det.s.outputNames[0]];
    const prob = new Float32Array(t.data as Float32Array);
    post({ type: "detected", id: m.id, prob, width: t.dims[3], height: t.dims[2] }, [prob.buffer]);
  } catch (e) {
    post({ type: "error", id: m.type === "load" ? undefined : m.id, model: m.type === "load" ? m.model : undefined, message: String((e as Error)?.message || e) });
  }
};
