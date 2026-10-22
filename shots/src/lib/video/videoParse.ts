// [공용 기준 코드 `ai-video-client` — 기준: ai-video-studio/lib/video/videoParse.ts(2026-10-23 ai-image-studio에서 이전), 사본은 --sync로만]
// AI 동영상 — 업체 응답 해석·주소 검사(다른 모듈을 불러오지 않는 순수 파일).

export type JobState = "running" | "done" | "failed";

/** Gemini Interactions 응답 어디에 있든 {type:"video", data|uri}를 찾는다(steps/outputs 구조 차이 대비) */
export function findGeminiVideo(json: unknown): { data?: string; uri?: string; mime?: string } | null {
  const seen = new Set<unknown>();
  const walk = (v: unknown): { data?: string; uri?: string; mime?: string } | null => {
    if (!v || typeof v !== "object" || seen.has(v)) return null;
    seen.add(v);
    const o = v as Record<string, unknown>;
    if (o.type === "video" && (typeof o.data === "string" || typeof o.uri === "string")) {
      return { data: typeof o.data === "string" ? o.data : undefined, uri: typeof o.uri === "string" ? o.uri : undefined, mime: typeof o.mime_type === "string" ? o.mime_type : undefined };
    }
    for (const x of Array.isArray(v) ? v : Object.values(o)) { const r = walk(x); if (r) return r; }
    return null;
  };
  return walk(json);
}

export function geminiState(status: unknown): JobState {
  if (status === "completed") return "done";
  if (status === "failed" || status === "cancelled" || status === "requires_action") return "failed";
  return "running";
}

export function falState(status: unknown): JobState {
  if (status === "COMPLETED") return "done";
  if (status === "IN_QUEUE" || status === "IN_PROGRESS") return "running";
  return "failed";
}

export function replicateState(status: unknown): JobState {
  if (status === "succeeded") return "done";
  if (status === "failed" || status === "canceled" || status === "aborted") return "failed";
  return "running";
}

/** Replicate output은 주소 문자열이거나 주소 배열 */
export function replicateOutputUrl(output: unknown): string | null {
  const v = Array.isArray(output) ? output[0] : output;
  return typeof v === "string" && /^https:\/\//.test(v) ? v : null;
}

/** 회원 키를 실어 보낼 주소는 업체 공식 호스트만 허용(회원이 보낸 값으로 키가 다른 곳에 새지 않게) */
export function isHost(url: unknown, hosts: readonly string[]): url is string {
  if (typeof url !== "string") return false;
  try { const u = new URL(url); return u.protocol === "https:" && hosts.includes(u.hostname); } catch { return false; }
}

/** 시작·끝 화면으로 받아도 되는 주소: 우리 저장소(서명 주소·공개 버킷 주소), Pexels·Pixabay 이미지 */
export function isFrameUrl(url: unknown, supabaseHost: string): url is string {
  if (typeof url !== "string") return false;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    if (u.hostname === supabaseHost) return u.pathname.startsWith("/storage/v1/object/sign/") || u.pathname.startsWith("/storage/v1/object/public/");
    return u.hostname === "images.pexels.com" || u.hostname === "pixabay.com" || u.hostname === "cdn.pixabay.com";
  } catch { return false; }
}

/** 작업 번호 형식 검사(주소 조립에 쓰기 전에) */
export const isJobId = (v: unknown): v is string => typeof v === "string" && /^[A-Za-z0-9._\-/]{4,200}$/.test(v) && !v.includes("..");
