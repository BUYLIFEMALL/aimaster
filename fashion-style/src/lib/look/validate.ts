import type { AISuggestion, BeautyAdvice, BeautySuggestion, ImageState } from "./types";

const ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/webp"]);
/** 요청 한 장당 base64 길이 상한(약 2.5MB 원본). Vercel 요청 본문 한도(4.5MB) 안쪽으로 맞춘다 */
export const MAX_IMAGE_BASE64 = 3_400_000;

export function validateImage(value: unknown): ImageState | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (typeof v.data !== "string" || typeof v.mimeType !== "string") return null;
  if (!ALLOWED_MIME.has(v.mimeType)) return null;
  if (v.data.length < 100 || v.data.length > MAX_IMAGE_BASE64) return null;
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(v.data)) return null;
  return { data: v.data, mimeType: v.mimeType };
}

function str(v: unknown, max: number): string {
  return typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

/** 모델 응답(JSON)을 검증·정리한다. 구조가 어긋나면 null */
export function parseSuggestions(raw: unknown): AISuggestion[] | null {
  if (!Array.isArray(raw)) return null;
  const out: AISuggestion[] = [];
  for (const s of raw.slice(0, 3)) {
    if (!s || typeof s !== "object") continue;
    const name = str((s as Record<string, unknown>).name, 60);
    const piecesRaw = (s as Record<string, unknown>).pieces;
    if (!name || !Array.isArray(piecesRaw)) continue;
    const pieces = piecesRaw
      .slice(0, 4)
      .map((p) => {
        const r = (p ?? {}) as Record<string, unknown>;
        return { name: str(r.name, 60), imagePrompt: str(r.imagePrompt, 700) };
      })
      .filter((p) => p.name && p.imagePrompt);
    if (pieces.length) out.push({ name, pieces });
  }
  return out.length ? out : null;
}

function beautyPart(v: unknown): BeautySuggestion | null {
  if (!v || typeof v !== "object") return null;
  const r = v as Record<string, unknown>;
  const title = str(r.title, 80);
  const description = str(r.description, 900);
  const imagePrompt = str(r.imagePrompt, 600);
  if (!title || !description || !imagePrompt) return null;
  return { title, description, imagePrompt };
}

export function parseBeauty(raw: unknown): BeautyAdvice | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const makeup = beautyPart(r.makeup);
  const hairstyle = beautyPart(r.hairstyle);
  return makeup && hairstyle ? { makeup, hairstyle } : null;
}
