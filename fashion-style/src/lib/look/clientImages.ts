"use client";
import { fitWithin } from "./aspect";
import type { ImageState } from "./types";

const OK_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_FILE = 25 * 1024 * 1024;

export interface PreparedImage extends ImageState { width: number; height: number }

export class ImageInputError extends Error {
  constructor(public kind: "type" | "size" | "read", message: string) { super(message); }
}

function loadBitmap(blob: Blob): Promise<{ source: CanvasImageSource; width: number; height: number }> {
  if (typeof createImageBitmap === "function") {
    return createImageBitmap(blob).then((b) => ({ source: b, width: b.width, height: b.height }));
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve({ source: img, width: img.naturalWidth, height: img.naturalHeight }); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("decode")); };
    img.src = url;
  });
}

/** 파일/Blob → 긴 변 maxSide px 이하의 JPEG(base64). 서버 요청 한도(4.5MB)와 AI 호출 비용을 함께 줄인다 */
export async function prepareImage(blob: Blob, maxSide = 1600, quality = 0.9): Promise<PreparedImage> {
  const type = blob.type || "";
  if (!OK_TYPES.includes(type)) throw new ImageInputError("type", "PNG, JPG, WEBP 이미지만 사용할 수 있습니다.");
  if (blob.size > MAX_FILE) throw new ImageInputError("size", "이미지가 너무 큽니다(25MB 이하).");
  let bmp: Awaited<ReturnType<typeof loadBitmap>>;
  try { bmp = await loadBitmap(blob); } catch { throw new ImageInputError("read", "이미지를 읽지 못했습니다."); }
  const { width, height } = fitWithin(bmp.width, bmp.height, maxSide);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new ImageInputError("read", "이미지를 처리하지 못했습니다.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bmp.source, 0, 0, width, height);
  const url = canvas.toDataURL("image/jpeg", quality);
  return { data: url.split(",")[1] ?? "", mimeType: "image/jpeg", width, height };
}

export function toDataUrl(img: ImageState): string {
  return `data:${img.mimeType};base64,${img.data}`;
}

export function fromDataUrl(url: string): ImageState | null {
  const m = /^data:([^;,]+);base64,(.+)$/.exec(url);
  return m ? { mimeType: m[1], data: m[2] } : null;
}

export async function imageSize(img: ImageState): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const el = new Image();
    el.onload = () => resolve({ width: el.naturalWidth, height: el.naturalHeight });
    el.onerror = () => resolve({ width: 1, height: 1 });
    el.src = toDataUrl(img);
  });
}

/** 결과 이미지를 다운로드 형식으로 변환한다(JPEG 변환은 canvas, PNG는 원본 그대로 PNG로) */
export async function convertForDownload(img: ImageState, format: "png" | "jpeg"): Promise<Blob> {
  const el = new Image();
  await new Promise<void>((res, rej) => { el.onload = () => res(); el.onerror = () => rej(new Error("decode")); el.src = toDataUrl(img); });
  const canvas = document.createElement("canvas");
  canvas.width = el.naturalWidth;
  canvas.height = el.naturalHeight;
  const ctx = canvas.getContext("2d")!;
  if (format === "jpeg") { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  ctx.drawImage(el, 0, 0);
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("blob"))), format === "png" ? "image/png" : "image/jpeg", 0.93));
}

/** AI가 돌려준 큰 PNG(수 MB)를 JPEG로 줄인다 — 다음 요청(레이어드 누적)이 서버 본문 한도(4.5MB)를 넘지 않게 한다 */
export async function shrinkImage(img: ImageState, maxSide = 1600, quality = 0.92): Promise<ImageState> {
  const blob = await (await fetch(toDataUrl(img))).blob();
  const p = await prepareImage(blob, maxSide, quality);
  return { data: p.data, mimeType: p.mimeType };
}
