// 공용 기준 코드 `browser-free-erase` — 화면 쪽 연결: 작업자 하나에 모델 받기·지우기·글자 찾기를 맡기고, 자르기·크기 맞추기·붙이기는 여기서 한다.
// 쓰는 법: await loadFreeErase("lama", p => …) → const out = await eraseRegion(img, mask, w, h) (mask: 원본 크기 0/1)
//          const boxes = await detectTextBoxes(img, w, h) → fillBoxes(mask, w, h, boxes)
import {
  LAMA_SIZE, MASK_DILATE, binarizeMask, detInputSize, dilateMask, freeEraseErrorText, maskClusters, probToBoxes, scaleBoxes, workRegion,
  type Backend, type Box, type ModelKind, type RunOutput, type WorkerIn, type WorkerOut,
} from "./protocol";

export interface FreeEraseProgress { model: ModelKind; loaded: number; total: number }
export class FreeEraseError extends Error { constructor(message: string, readonly raw: string) { super(message); } }
type Src = CanvasImageSource;

let worker: Worker | null = null;
let seq = 0;
const jobs = new Map<number, { ok: (m: WorkerOut) => void; no: (e: Error) => void }>();
const listeners = new Set<(p: FreeEraseProgress) => void>();
const ready = new Map<ModelKind, { p: Promise<Backend>; ok: (b: Backend) => void; no: (e: Error) => void }>();
const backends = new Map<ModelKind, Backend>();

/** 교차 출처 격리(COOP/COEP)면 여러 줄 계산, 아니면 한 줄. WebGPU는 머리글과 상관없이 동작한다 */
export const freeEraseThreads = () => (typeof self !== "undefined" && self.crossOriginIsolated ? Math.min(8, navigator.hardwareConcurrency || 4) : 1);
/** 지금 쓰는 계산 방식(화면 안내용) */
export const freeEraseBackend = (model: ModelKind = "lama") => backends.get(model) ?? null;

function fail(raw: string) { return new FreeEraseError(freeEraseErrorText(raw), raw); }

function getWorker(): Worker {
  if (worker) return worker;
  const w = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
  w.onmessage = (ev: MessageEvent<WorkerOut>) => {
    const m = ev.data;
    if (m.type === "progress") listeners.forEach((f) => f(m));
    else if (m.type === "ready") { backends.set(m.model, m.backend); ready.get(m.model)?.ok(m.backend); }
    else if (m.type === "error") {
      const e = fail(m.message);
      if (m.id != null) { jobs.get(m.id)?.no(e); jobs.delete(m.id); }
      else if (m.model) { ready.get(m.model)?.no(e); ready.delete(m.model); }
    } else { jobs.get(m.id)?.ok(m); jobs.delete(m.id); }
  };
  w.onerror = (ev) => {
    const e = fail(ev.message || "worker");
    ready.forEach((r) => r.no(e)); ready.clear(); backends.clear();
    jobs.forEach((j) => j.no(e)); jobs.clear();
    worker?.terminate(); worker = null;
  };
  worker = w; return w;
}

/** 모델 준비(지우기 첫 약 208MB·글자 찾기 약 5MB 내려받기, 두 번째부터 브라우저 저장분). 쓰게 된 계산 방식을 돌려준다 */
export function loadFreeErase(model: ModelKind, onProgress?: (p: FreeEraseProgress) => void): Promise<Backend> {
  if (onProgress) listeners.add(onProgress);
  let r = ready.get(model);
  if (!r) {
    let ok!: (b: Backend) => void, no!: (e: Error) => void;
    const p = new Promise<Backend>((a, b) => { ok = a; no = b; });
    p.catch(() => {});
    r = { p, ok, no }; ready.set(model, r);
    getWorker().postMessage({ type: "load", model, threads: freeEraseThreads() } satisfies WorkerIn);
  }
  return r.p.finally(() => { if (onProgress) listeners.delete(onProgress); });
}

function call<T extends WorkerOut>(msg: WorkerIn, transfer: Transferable[]): Promise<T> {
  return new Promise<T>((ok, no) => { jobs.set((msg as { id: number }).id, { ok: ok as (m: WorkerOut) => void, no }); getWorker().postMessage(msg, transfer); });
}

function canvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas"); c.width = w; c.height = h; return c;
}
const ctx2d = (c: HTMLCanvasElement) => c.getContext("2d", { willReadFrequently: true })!;

/** 흰 붓 자국 PNG(검은 바탕, 기존 MaskEditor 출력) 또는 투명 바탕 붓 그림 → 원본 크기 0/1 마스크 */
export async function maskFromImage(src: Src | Blob, w: number, h: number, channel: "red" | "alpha" = "red"): Promise<Uint8Array> {
  const img = src instanceof Blob ? await createImageBitmap(src) : src;
  const c = canvas(w, h), x = ctx2d(c);
  x.drawImage(img, 0, 0, w, h);
  return binarizeMask(x.getImageData(0, 0, w, h).data, 4, channel === "red" ? 0 : 3);
}

/** 0/1 마스크 → 알파 그림(흰색, 지울 곳만 불투명) */
function maskCanvas(mask: Uint8Array, w: number, h: number): HTMLCanvasElement {
  const c = canvas(w, h), x = ctx2d(c), d = x.createImageData(w, h);
  for (let i = 0; i < mask.length; i++) if (mask[i]) { d.data[i * 4] = d.data[i * 4 + 1] = d.data[i * 4 + 2] = 255; d.data[i * 4 + 3] = 255; }
  x.putImageData(d, 0, 0);
  return c;
}

/**
 * 마스크 부분을 지운 새 그림(원본 크기). 원본은 바꾸지 않는다.
 * 지울 범위 주변을 정사각형으로 잘라 512로 계산 → 원래 크기로 되돌려 마스크 부분에만(가장자리 부드럽게) 붙인다.
 */
export async function eraseRegion(src: Src, mask: Uint8Array, w: number, h: number, opts: { dilate?: number } = {}): Promise<HTMLCanvasElement> {
  const out = canvas(w, h), ox = ctx2d(out);
  ox.drawImage(src, 0, 0, w, h);
  const clusters = maskClusters(mask, w, h);
  if (!clusters.length) return out;
  await loadFreeErase("lama");
  const full = maskCanvas(mask, w, h);
  // 떨어진 덩어리마다 따로 계산(앞 덩어리 결과 위에 이어서) — 해상도 손실을 줄인다
  for (const b of clusters) await eraseOne(out, full, workRegion(b, w, h), opts.dilate ?? MASK_DILATE);
  return out;
}

async function eraseOne(out: HTMLCanvasElement, full: HTMLCanvasElement, r: Box, dilate: number): Promise<void> {
  const ox = ctx2d(out);
  const S = LAMA_SIZE, N = S * S;

  // 1) 작업 영역 → 512 그림
  const ic = canvas(S, S), ix = ctx2d(ic);
  ix.drawImage(out, r.x, r.y, r.w, r.h, 0, 0, S, S);
  const id = ix.getImageData(0, 0, S, S).data;
  const image = new Float32Array(3 * N);
  for (let i = 0; i < N; i++) { image[i] = id[i * 4] / 255; image[N + i] = id[i * 4 + 1] / 255; image[2 * N + i] = id[i * 4 + 2] / 255; }

  // 2) 작업 영역 마스크 → 512, 흐린 가장자리까지 지울 곳(>0) + 넓히기(§7 ③-1)
  const mc = canvas(S, S), mx = ctx2d(mc);
  mx.drawImage(full, r.x, r.y, r.w, r.h, 0, 0, S, S);
  const m512 = dilateMask(binarizeMask(mx.getImageData(0, 0, S, S).data, 4, 3), S, S, dilate);
  const maskF = new Float32Array(N); for (let i = 0; i < N; i++) maskF[i] = m512[i];

  // 3) 계산(출력 0~255)
  const res = await call<Extract<WorkerOut, { type: "erased" }>>({ type: "erase", id: ++seq, threads: freeEraseThreads(), image, mask: maskF }, [image.buffer, maskF.buffer]);
  const pc = canvas(S, S), px = ctx2d(pc), pd = px.createImageData(S, S);
  const clamp = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);
  for (let i = 0; i < N; i++) { pd.data[i * 4] = clamp(res.rgb[i]); pd.data[i * 4 + 1] = clamp(res.rgb[N + i]); pd.data[i * 4 + 2] = clamp(res.rgb[2 * N + i]); pd.data[i * 4 + 3] = 255; }
  px.putImageData(pd, 0, 0);

  // 4) 원래 크기로 되돌려 마스크(512에서 넓힌 만큼 원본에서도 넓힘) 부분에만 붙인다
  const grow = Math.max(1, Math.round((dilate * Math.max(r.w, r.h)) / S));
  const rm = dilateMask(binarizeMask(ctx2d(full).getImageData(r.x, r.y, r.w, r.h).data, 4, 3), r.w, r.h, grow);
  const patch = canvas(r.w, r.h), tx = ctx2d(patch);
  tx.drawImage(pc, 0, 0, r.w, r.h);
  tx.globalCompositeOperation = "destination-in";
  tx.filter = "blur(1px)";
  tx.drawImage(maskCanvas(rm, r.w, r.h), 0, 0);
  ox.drawImage(patch, r.x, r.y);
}

/** 그림 속 글자 위치(원본 좌표 상자). 글자를 읽지는 않는다 */
export async function detectTextBoxes(src: Src, w: number, h: number): Promise<Box[]> {
  await loadFreeErase("det");
  const { width, height } = detInputSize(w, h);
  const c = canvas(width, height), x = ctx2d(c);
  x.drawImage(src, 0, 0, width, height);
  const d = x.getImageData(0, 0, width, height).data, N = width * height;
  const input = new Float32Array(3 * N);
  const mean = [0.485, 0.456, 0.406], std = [0.229, 0.224, 0.225];
  for (let i = 0; i < N; i++) for (let ch = 0; ch < 3; ch++) input[ch * N + i] = (d[i * 4 + ch] / 255 - mean[ch]) / std[ch];
  const res = await call<Extract<WorkerOut, { type: "detected" }>>({ type: "detect", id: ++seq, threads: freeEraseThreads(), input, width, height }, [input.buffer]);
  return scaleBoxes(probToBoxes(res.prob, res.width, res.height), res.width, res.height, w, h);
}

export { fillBoxes } from "./protocol";

/** 범용 실행(E5 무료 이미지 도구 — 배경 지우기·얼굴 찾기): 모델 준비 후 입력 하나로 계산, 출력은 모델 순서대로 */
export async function runModel(model: ModelKind, input: Float32Array, dims: number[]): Promise<RunOutput[]> {
  await loadFreeErase(model);
  const res = await call<Extract<WorkerOut, { type: "ran" }>>({ type: "run", id: ++seq, model, threads: freeEraseThreads(), input, dims }, [input.buffer]);
  return res.outputs;
}
