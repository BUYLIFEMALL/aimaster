// E5 「🧰 무료 이미지 도구」 그리기 — 브라우저 전용. 모델 실행은 공용 컴포넌트 browser-free-erase의 runModel(작업자)로.
// 사진을 캔버스에 새로 그려 저장하므로 촬영 정보·위치 정보(EXIF 등)는 결과 파일에 들어가지 않는다(E4와 같은 방식).
import { runModel } from "@/lib/freeErase/engine";
import { BG_SIZE, FACE_H, FACE_W, REC_H, bgInput, clampRect, countDigits, faceBoxes, faceInput, isNumberish, mosaicCell, probToAlpha, recInput, recWidth, type Rect } from "./calc";

export function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas"); c.width = w; c.height = h; return c;
}
const ctx2d = (c: HTMLCanvasElement) => c.getContext("2d", { willReadFrequently: true })!;

function rgbaAt(src: CanvasImageSource, w: number, h: number): Uint8ClampedArray {
  const c = makeCanvas(w, h), x = ctx2d(c);
  x.drawImage(src, 0, 0, w, h);
  return x.getImageData(0, 0, w, h).data;
}

/* ───────── 배경 지우기 ───────── */

/** 자동 누끼 마스크(원본 크기 캔버스, 알파 = 남길 정도). 붓으로 이 캔버스를 고친다 */
export async function autoBgMask(src: CanvasImageSource, w: number, h: number): Promise<HTMLCanvasElement> {
  const [out] = await runModel("bg", bgInput(rgbaAt(src, BG_SIZE, BG_SIZE)), [1, 3, BG_SIZE, BG_SIZE]);
  const alpha = probToAlpha(out.data);
  const small = makeCanvas(BG_SIZE, BG_SIZE), sx = ctx2d(small), d = sx.createImageData(BG_SIZE, BG_SIZE);
  for (let i = 0; i < alpha.length; i++) { d.data[i * 4] = d.data[i * 4 + 1] = d.data[i * 4 + 2] = 255; d.data[i * 4 + 3] = alpha[i]; }
  sx.putImageData(d, 0, 0);
  const mask = makeCanvas(w, h), mx = ctx2d(mask);
  mx.imageSmoothingQuality = "high";
  mx.drawImage(small, 0, 0, w, h);
  return mask;
}

/** 붓으로 마스크 고치기 — erase: 배경으로(지우기), restore: 다시 남기기(되살리기). 이전 점에서 선으로 이어 칠한다 */
export function paintMask(mask: HTMLCanvasElement, from: { x: number; y: number } | null, to: { x: number; y: number }, radius: number, mode: "erase" | "restore") {
  const x = ctx2d(mask);
  x.save();
  x.globalCompositeOperation = mode === "erase" ? "destination-out" : "source-over";
  x.strokeStyle = x.fillStyle = "#fff"; x.lineCap = "round"; x.lineWidth = radius * 2;
  x.beginPath(); x.moveTo((from ?? to).x, (from ?? to).y); x.lineTo(to.x, to.y); x.stroke();
  x.beginPath(); x.arc(to.x, to.y, radius, 0, Math.PI * 2); x.fill();
  x.restore();
}

export type BgFill = { kind: "transparent" } | { kind: "color"; color: string };

/** 원본 + 마스크 → 결과(투명 또는 색 배경) */
export function composeBg(src: CanvasImageSource, mask: HTMLCanvasElement, w: number, h: number, fill: BgFill): HTMLCanvasElement {
  const cut = makeCanvas(w, h), cx = ctx2d(cut);
  cx.drawImage(src, 0, 0, w, h);
  cx.globalCompositeOperation = "destination-in";
  cx.drawImage(mask, 0, 0);
  if (fill.kind === "transparent") return cut;
  const out = makeCanvas(w, h), ox = ctx2d(out);
  ox.fillStyle = fill.color; ox.fillRect(0, 0, w, h);
  ox.drawImage(cut, 0, 0);
  return out;
}

/* ───────── 얼굴 가리기 ───────── */

/** 자동 얼굴 찾기 → 원본 좌표 상자 */
export async function autoFaces(src: CanvasImageSource, w: number, h: number): Promise<Rect[]> {
  const [scores, boxes] = await runModel("face", faceInput(rgbaAt(src, FACE_W, FACE_H)), [1, 3, FACE_H, FACE_W]);
  return faceBoxes(scores.data, boxes.data, w, h);
}

/** E5-3: 글자 자리마다 잘라 읽고(글자 읽기 모델) 숫자가 많은 자리만 남긴다 — 송장·전화번호·주문번호. 최대 40곳 */
export async function keepNumberBoxes(src: CanvasImageSource, w: number, h: number, boxes: Rect[]): Promise<Rect[]> {
  const out: Rect[] = [];
  for (const raw of boxes.slice(0, 40)) {
    const r = clampRect(raw, w, h);
    if (r.w < 4 || r.h < 4) continue;
    const W = recWidth(r.w, r.h), c = makeCanvas(W, REC_H), x = ctx2d(c);
    x.fillStyle = "#fff"; x.fillRect(0, 0, W, REC_H);
    x.drawImage(src, r.x, r.y, r.w, r.h, 0, 0, W, REC_H);
    const [o] = await runModel("rec", recInput(x.getImageData(0, 0, W, REC_H).data, W), [1, 3, REC_H, W]);
    if (isNumberish(countDigits(o.data, o.dims[1], o.dims[2]))) out.push(raw);
  }
  return out;
}

export type HideMode = "pixel" | "blur" | "fill";

/** 원본에 상자마다 모자이크·흐림·검은 칠 */
export function composeHide(src: CanvasImageSource, w: number, h: number, rects: Rect[], mode: HideMode, strength: number): HTMLCanvasElement {
  const out = makeCanvas(w, h), ox = ctx2d(out);
  ox.drawImage(src, 0, 0, w, h);
  for (const raw of rects) {
    const r = clampRect(raw, w, h);
    if (r.w < 2 || r.h < 2) continue;
    if (mode === "fill") { ox.fillStyle = "#111"; ox.fillRect(r.x, r.y, r.w, r.h); continue; }
    const cell = mosaicCell(r, strength);
    if (mode === "pixel") {
      const tw = Math.max(1, Math.ceil(r.w / cell)), th = Math.max(1, Math.ceil(r.h / cell));
      const t = makeCanvas(tw, th), tx = ctx2d(t);
      tx.drawImage(out, r.x, r.y, r.w, r.h, 0, 0, tw, th);
      ox.save(); ox.imageSmoothingEnabled = false;
      ox.drawImage(t, 0, 0, tw, th, r.x, r.y, r.w, r.h);
      ox.restore();
    } else {
      // 흐림: 가장자리까지 고르게 흐리도록 여유를 두고 잘라 흐린 뒤 상자 안만 붙인다
      const pad = cell * 2, px = Math.max(0, r.x - pad), py = Math.max(0, r.y - pad);
      const pw = Math.min(w, r.x + r.w + pad) - px, ph = Math.min(h, r.y + r.h + pad) - py;
      const t = makeCanvas(pw, ph), tx = ctx2d(t);
      tx.filter = `blur(${Math.max(3, cell * 0.8)}px)`;
      tx.drawImage(out, px, py, pw, ph, 0, 0, pw, ph);
      ox.drawImage(t, r.x - px, r.y - py, r.w, r.h, r.x, r.y, r.w, r.h);
    }
  }
  return out;
}

/* ───────── 사진 나누기 ───────── */

export function cropPiece(src: CanvasImageSource, r: Rect): HTMLCanvasElement {
  const c = makeCanvas(r.w, r.h);
  ctx2d(c).drawImage(src, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h);
  return c;
}

/* ───────── 저장 ───────── */

export function toBlob(c: HTMLCanvasElement, format: "png" | "jpg", quality = 92): Promise<Blob> {
  return new Promise((ok, no) => c.toBlob((b) => (b ? ok(b) : no(new Error("저장하지 못했습니다."))), format === "png" ? "image/png" : "image/jpeg", format === "png" ? undefined : quality / 100));
}
