// 참고 이미지(브라우저에서 줄인 JPEG/PNG base64) 요청 값 정리 — 장면 이미지·화풍 분석 API 공용(v1.26에 image 라우트에서 옮김).
import type { VeoImage } from "./veo";

const MAX_REF_BASE64 = 1_400_000;

const rec = (v: unknown): Record<string, unknown> => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});

export function cleanRefs(v: unknown): VeoImage[] {
  if (!Array.isArray(v)) return [];
  return v
    .slice(0, 3)
    .map((r) => rec(r))
    .filter((r) => (r.mimeType === "image/jpeg" || r.mimeType === "image/png") && typeof r.data === "string" && r.data.length < MAX_REF_BASE64 && /^[A-Za-z0-9+/=]+$/.test(r.data))
    .map((r) => ({ mimeType: r.mimeType as string, data: r.data as string }));
}
