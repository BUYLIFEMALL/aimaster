"use client";

// 브라우저에서 이미지를 다루는 도우미: 업로드 파일 축소, 생성 이미지 WebP 변환, 썸네일 제목 글자 합성.

const MAX_SIDE = 1600;

async function loadBitmap(blob: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(blob);
  } catch {
    throw new Error("이미지를 읽지 못했습니다. JPG·PNG·WebP 파일인지 확인해주세요.");
  }
}

function drawScaled(bitmap: ImageBitmap): HTMLCanvasElement {
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("이미지를 처리하지 못했습니다.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function toDataUrl(canvas: HTMLCanvasElement): string {
  const webp = canvas.toDataURL("image/webp", 0.88);
  return webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/jpeg", 0.88);
}

/** base64 이미지(생성 결과)를 긴 변 1600px WebP data URL 로 줄인다. */
export async function base64ToUploadUrl(base64: string, mime: string): Promise<string> {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const bitmap = await loadBitmap(new Blob([bytes], { type: mime }));
  const out = toDataUrl(drawScaled(bitmap));
  bitmap.close();
  return out;
}

export async function fileToUploadUrl(file: File): Promise<string> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error("JPG·PNG·WebP 이미지만 올릴 수 있습니다.");
  if (file.size > 25 * 1024 * 1024) throw new Error("이미지 용량이 너무 큽니다. 25MB 이하 이미지를 올려주세요.");
  const bitmap = await loadBitmap(file);
  const out = toDataUrl(drawScaled(bitmap));
  bitmap.close();
  return out;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const ch of Array.from(text)) {
    const test = line + ch;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = ch.trim() ? ch : "";
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** 대표 이미지 아래쪽에 어두운 띠와 제목 글자를 합성한다(AI는 글자를 깨뜨리므로 따로 그린다). */
export async function overlayThumbnailTitle(dataUrl: string, title: string, color: string): Promise<string> {
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0);

  const fontSize = Math.round(canvas.width * 0.055);
  ctx.font = `800 ${fontSize}px "Pretendard", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif`;
  const maxWidth = canvas.width * 0.84;
  const lines = wrap(ctx, title.trim(), maxWidth).slice(0, 3);
  const lineHeight = fontSize * 1.3;
  const blockHeight = lines.length * lineHeight + fontSize * 1.2;
  const top = canvas.height - blockHeight;

  const grad = ctx.createLinearGradient(0, top - fontSize, 0, canvas.height);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(0.35, "rgba(0,0,0,0.55)");
  grad.addColorStop(1, "rgba(0,0,0,0.78)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, top - fontSize, canvas.width, blockHeight + fontSize);

  ctx.fillStyle = color;
  ctx.fillRect(canvas.width * 0.08, top + fontSize * 0.3, fontSize * 0.14, lines.length * lineHeight);

  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "top";
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = fontSize * 0.2;
  lines.forEach((l, i) => ctx.fillText(l, canvas.width * 0.08 + fontSize * 0.45, top + fontSize * 0.3 + i * lineHeight));
  return toDataUrl(canvas);
}
