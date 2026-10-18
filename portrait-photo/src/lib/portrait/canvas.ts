"use client";
import { coverCrop, edgeFor, fitWithin, whitenBackground } from "./post";
import type { CropRect, SizePreset } from "./post";
import { MAX_IMAGE_B64 } from "./validate";
import type { Resolution } from "./options";

// 브라우저 캔버스 작업(클라이언트 전용). 사진은 서버에 저장하지 않으며 여기서만 가공한다.

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("사진을 불러오지 못했습니다."));
    img.src = src;
  });
}

function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("사진을 읽지 못했습니다."));
    r.readAsDataURL(file);
  });
}

export interface PreparedInput { base64: string; mimeType: "image/jpeg"; width: number; height: number }

/** 업로드한 사진을 긴 변 1,600px JPEG로 줄이고(요청 본문 한도), 셀카면 좌우 반전해 base64로 만든다. */
export async function prepareInput(file: File, flip: boolean): Promise<PreparedInput> {
  const img = await loadImage(await fileToDataUrl(file));
  const { width, height } = fitWithin(img.naturalWidth || 1024, img.naturalHeight || 1024, 1600);
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("이 브라우저에서는 사진을 처리할 수 없습니다.");
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, width, height);
  if (flip) { ctx.translate(width, 0); ctx.scale(-1, 1); }
  ctx.drawImage(img, 0, 0, width, height);
  for (const q of [0.9, 0.8, 0.7, 0.6]) {
    const url = canvas.toDataURL("image/jpeg", q);
    const base64 = url.slice(url.indexOf(",") + 1);
    if (base64.length <= MAX_IMAGE_B64) return { base64, mimeType: "image/jpeg", width, height };
  }
  throw new Error("사진이 너무 큽니다. 더 작은 사진으로 다시 시도해 주세요.");
}

/** 생성 이미지를 순백 배경으로 정리한다(가장자리와 이어진 밝은 영역만). 큰 이미지는 3,000px로 줄여 처리한다. */
export async function whitenDataUrl(dataUrl: string): Promise<{ dataUrl: string; ratio: number }> {
  const img = await loadImage(dataUrl);
  const { width, height } = fitWithin(img.naturalWidth, img.naturalHeight, 3000);
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return { dataUrl, ratio: 0 };
  ctx.drawImage(img, 0, 0, width, height);
  const data = ctx.getImageData(0, 0, width, height);
  const { ratio } = whitenBackground(data.data, width, height);
  ctx.putImageData(data, 0, 0);
  return { dataUrl: canvas.toDataURL("image/png"), ratio };
}

/** 화면 보정(밝기·대비)과 거울상을 적용해 선택한 해상도의 PNG로 만든다. */
export async function renderPng(dataUrl: string, o: { mirrored: boolean; filter: string; applyFilter: boolean; resolution: Resolution }): Promise<Blob> {
  const img = await loadImage(dataUrl);
  const { width, height } = fitWithin(img.naturalWidth, img.naturalHeight, edgeFor(o.resolution));
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("이 브라우저에서는 저장할 수 없습니다.");
  ctx.imageSmoothingQuality = "high";
  if (o.applyFilter) ctx.filter = o.filter;
  if (o.mirrored) { ctx.translate(width, 0); ctx.scale(-1, 1); }
  ctx.drawImage(img, 0, 0, width, height);
  return canvasToBlob(canvas, "image/png");
}

export function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("이미지를 만들지 못했습니다."))), type, quality));
}

/** 선택한 규격 크기의 JPEG(흰 바탕). 용량 제한을 넘으면 품질을 낮춰 맞춘다. */
export async function renderSized(dataUrl: string, preset: SizePreset, o: { mirrored: boolean; filter: string; applyFilter: boolean; crop?: CropRect }): Promise<{ blob: Blob; bytes: number; quality: number; overLimit: boolean; underMin: boolean }> {
  const img = await loadImage(dataUrl);
  const crop = o.crop ?? coverCrop(img.naturalWidth, img.naturalHeight, preset.width, preset.height, 0.15);
  const canvas = document.createElement("canvas");
  canvas.width = preset.width; canvas.height = preset.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("이 브라우저에서는 저장할 수 없습니다.");
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingQuality = "high";
  if (o.applyFilter) ctx.filter = o.filter;
  if (o.mirrored) { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); }
  ctx.drawImage(img, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, canvas.width, canvas.height);
  let quality = 0.93;
  let blob = await canvasToBlob(canvas, "image/jpeg", quality);
  while (blob.size > preset.maxBytes && quality > 0.4) {
    quality = Math.round((quality - 0.07) * 100) / 100;
    blob = await canvasToBlob(canvas, "image/jpeg", quality);
  }
  // 최소 용량 기준이 있으면(예: 250KB 이상) 품질을 올려 다시 시도한다
  if (preset.minBytes && blob.size < preset.minBytes) {
    for (const q of [0.97, 1]) {
      const bigger = await canvasToBlob(canvas, "image/jpeg", q);
      if (bigger.size <= preset.maxBytes) { blob = bigger; quality = q; }
      if (blob.size >= preset.minBytes) break;
    }
  }
  return { blob, bytes: blob.size, quality, overLimit: blob.size > preset.maxBytes, underMin: !!preset.minBytes && blob.size < preset.minBytes };
}

/** v1.24 프로필 세트 한 장: 사각형은 JPEG, 원형은 바깥이 투명한 PNG */
export async function renderProfile(dataUrl: string, fmt: { width: number; height: number; circle: boolean }, crop: CropRect, o: { mirrored: boolean; filter: string; applyFilter: boolean }): Promise<Blob> {
  const img = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = fmt.width; canvas.height = fmt.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("이 브라우저에서는 저장할 수 없습니다.");
  if (fmt.circle) {
    ctx.beginPath();
    ctx.arc(fmt.width / 2, fmt.height / 2, Math.min(fmt.width, fmt.height) / 2, 0, Math.PI * 2);
    ctx.clip();
  } else {
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.imageSmoothingQuality = "high";
  if (o.applyFilter) ctx.filter = o.filter;
  if (o.mirrored) { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); }
  ctx.drawImage(img, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, canvas.width, canvas.height);
  return fmt.circle ? canvasToBlob(canvas, "image/png") : canvasToBlob(canvas, "image/jpeg", 0.92);
}

/** 기록용 작은 미리보기(긴 변 900px JPEG) */
export async function makeThumb(dataUrl: string): Promise<string> {
  const img = await loadImage(dataUrl);
  const { width, height } = fitWithin(img.naturalWidth, img.naturalHeight, 900);
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", 0.85);
}

/** 서버 보관함 업로드용: 긴 변 2,048px JPEG(품질을 낮춰 base64 3.0M자 이하로 맞춘다) */
export async function toUploadJpeg(dataUrl: string): Promise<{ base64: string; mimeType: "image/jpeg" } | null> {
  const img = await loadImage(dataUrl);
  const { width, height } = fitWithin(img.naturalWidth, img.naturalHeight, 2048);
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);
  for (const q of [0.9, 0.8, 0.7, 0.6]) {
    const url = canvas.toDataURL("image/jpeg", q);
    const base64 = url.slice(url.indexOf(",") + 1);
    if (base64.length <= 2_900_000) return { base64, mimeType: "image/jpeg" };
  }
  return null;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
