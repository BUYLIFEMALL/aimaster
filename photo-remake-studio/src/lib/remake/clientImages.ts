"use client";
import { downloadName, type InputImage, type RemakeResult } from "./types";
export interface PhotoInput extends InputImage { preview: string; width: number; height: number; originalWidth: number; originalHeight: number }
export async function preparePhoto(file: File, object = false): Promise<PhotoInput> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 25_000_000) throw new Error("25MB 이하 JPEG·PNG·WebP 사진을 올려 주세요.");
  const bitmap = await createImageBitmap(file);
  try {
    if (bitmap.width * bitmap.height > 70_000_000) throw new Error("사진이 너무 큽니다. 크기를 줄여 다시 올려 주세요.");
    const scale = Math.min(1, (object ? 1100 : 1600) / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas"); canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("이 브라우저에서 사진을 처리할 수 없습니다.");
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    let blob: Blob | null = null;
    for (const quality of [0.9, 0.8, 0.65, 0.5]) { blob = await new Promise<Blob | null>(r => canvas.toBlob(r, "image/jpeg", quality)); if (blob && blob.size < (object ? 420_000 : 1_400_000)) break; }
    if (!blob || blob.size >= (object ? 420_000 : 1_400_000)) throw new Error("사진을 전송 크기로 줄이지 못했습니다. 더 작은 사진을 올려 주세요.");
    const preview = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error("사진을 읽지 못했습니다.")); reader.readAsDataURL(blob!); });
    return { data: preview.split(",")[1], mimeType: "image/jpeg", name: file.name, preview, width: canvas.width, height: canvas.height, originalWidth: bitmap.width, originalHeight: bitmap.height, instruction: "" };
  } finally { bitmap.close(); }
}
export function resultUrl(result: RemakeResult) { return `data:${result.mimeType};base64,${result.data}`; }
export async function saveResult(result: RemakeResult, format: "jpeg" | "png") {
  let blob: Blob;
  if (format === "jpeg") { const bytes = Uint8Array.from(atob(result.data), c => c.charCodeAt(0)); blob = new Blob([bytes], { type: result.mimeType }); }
  else {
    const img = new Image(); img.src = resultUrl(result); await img.decode();
    const canvas = document.createElement("canvas"); canvas.width = result.width; canvas.height = result.height; const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("PNG 저장을 준비하지 못했습니다."); ctx.drawImage(img, 0, 0);
    blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error("PNG 저장을 준비하지 못했습니다.")), "image/png"));
  }
  const href = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = href; link.download = downloadName(result.mode, blob.type); link.click(); setTimeout(() => URL.revokeObjectURL(href), 10_000);
}
