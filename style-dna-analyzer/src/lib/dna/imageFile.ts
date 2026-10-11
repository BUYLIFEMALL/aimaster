"use client";

import { histogramSimilarity } from "./palette";

const ACCEPT = ["image/jpeg", "image/png", "image/webp"];
export const ACCEPT_ATTR = ACCEPT.join(",");

/** 올린 파일을 긴 변 1600px JPEG(data URL)로 줄인다. 서버 전송 한도(4.5MB) 안에 들어오게 하기 위해서다. */
export async function fileToResizedDataUrl(file: File, maxSide = 1600): Promise<string> {
  if (!ACCEPT.includes(file.type)) throw new Error("JPG·PNG·WebP 이미지만 올릴 수 있습니다.");
  if (file.size > 25 * 1024 * 1024) throw new Error("이미지 용량이 너무 큽니다. 25MB 이하 이미지를 올려주세요.");
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("이미지를 읽지 못했습니다. 다른 파일로 시도해주세요.");
  }
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("이미지를 처리하지 못했습니다.");
  ctx.fillStyle = "#ffffff"; // 투명 PNG는 흰 배경 위에 얹는다
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.88);
}

async function pixelsOf(src: string): Promise<Uint8ClampedArray> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = src;
  await img.decode();
  const canvas = document.createElement("canvas");
  const scale = Math.min(1, 128 / Math.max(img.naturalWidth, img.naturalHeight));
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("이미지를 처리하지 못했습니다.");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return ctx.getImageData(0, 0, canvas.width, canvas.height).data;
}

/** 원본과 생성 결과의 색감 일치율(0~100). 구도·형태는 비교하지 않는다. */
export async function colorMatch(originalUrl: string, generatedUrl: string): Promise<number> {
  const [a, b] = await Promise.all([pixelsOf(originalUrl), pixelsOf(generatedUrl)]);
  return histogramSimilarity(a, b);
}
