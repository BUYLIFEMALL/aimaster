import { LIMITS } from "@/lib/we/types";

// 브라우저에서 이미지를 올리기 전에 줄인다(Vercel 요청 본문 한도 4.5MB·저장 공간 절약). GIF는 애니메이션이 깨지므로 그대로 올린다.
const MAX_SIDE = 1600;
const TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

export function isImageFile(f: File): boolean {
  return TYPES.includes(f.type);
}

async function shrink(file: File): Promise<Blob> {
  if (file.type === "image/gif") return file;
  let bmp: ImageBitmap;
  try { bmp = await createImageBitmap(file); } catch { return file; }
  const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
  if (scale === 1 && file.size <= 1_500_000) { bmp.close(); return file; }
  const w = Math.max(1, Math.round(bmp.width * scale));
  const h = Math.max(1, Math.round(bmp.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) { bmp.close(); return file; }
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  const toBlob = (type: string, q: number) => new Promise<Blob | null>((r) => canvas.toBlob(r, type, q));
  return (await toBlob("image/webp", 0.86)) ?? (await toBlob("image/jpeg", 0.88)) ?? file;
}

export type UploadResult = { ok: true; url: string; alt: string } | { ok: false; error: string };

/** 이미지 1개를 줄여 서버에 올리고 공개 주소를 돌려준다 */
export async function uploadImage(file: File): Promise<UploadResult> {
  if (!isImageFile(file)) return { ok: false, error: "PNG·JPEG·WebP·GIF 이미지만 넣을 수 있습니다." };
  const blob = await shrink(file);
  if (blob.size > LIMITS.imageBytes) return { ok: false, error: "이미지가 너무 큽니다(줄여도 4MB를 넘습니다)." };
  const form = new FormData();
  form.append("file", blob, file.name || "image");
  try {
    const res = await fetch("/api/images", { method: "POST", body: form });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || typeof data.url !== "string") return { ok: false, error: data.error ?? "이미지를 올리지 못했습니다." };
    return { ok: true, url: data.url, alt: (file.name || "").replace(/\.[a-z0-9]+$/i, "").slice(0, 80) };
  } catch {
    return { ok: false, error: "서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }
}
