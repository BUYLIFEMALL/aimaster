import { histogramSimilarity, paletteFromRgba } from "./palette";
import type { PaletteColor } from "./types";

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

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("이미지를 로드하지 못했습니다."));
    img.src = src;
    if (img.complete && img.naturalWidth) {
      resolve(img);
    }
  });
}

async function pixelsOf(src: string): Promise<Uint8ClampedArray> {
  const img = await loadImg(src);
  const canvas = document.createElement("canvas");
  const scale = Math.min(1, 128 / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
  const w = Math.max(1, Math.round((img.naturalWidth || 128) * scale));
  const h = Math.max(1, Math.round((img.naturalHeight || 128) * scale));
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("이미지를 처리하지 못했습니다.");
  ctx.drawImage(img, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h).data;
}

/** 원본과 생성 결과의 색감 일치율(0~100). 구도·형태는 비교하지 않는다. */
export async function colorMatch(originalUrl: string, generatedUrl: string): Promise<number> {
  const [a, b] = await Promise.all([pixelsOf(originalUrl), pixelsOf(generatedUrl)]);
  return histogramSimilarity(a, b);
}

/** data URL 이미지로부터 브라우저 캔버스를 통해 실제 색상 팔레트 5개를 즉시 추출한다. */
export async function extractPaletteFromDataUrl(dataUrl: string, count = 5): Promise<PaletteColor[]> {
  try {
    const raw = await pixelsOf(dataUrl);
    return paletteFromRgba(raw, count);
  } catch {
    return [];
  }
}

