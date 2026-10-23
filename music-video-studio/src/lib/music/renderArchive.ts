// v1.22 완성본 보관 — 서버·화면·node 시험이 함께 쓰는 순수 함수(가져오기 없음).
// 기준: ai-video-studio 완성본 갤러리 저장(avs_edits). 파일은 {user}/renders/{id}.mp4, 생성일 기준 30일 뒤 자동 정리.
export const RENDER_BUCKET = "music-video-studio";
export const RETENTION_DAYS = 30;
/** 저장소 한도와 같음 */
export const MAX_RENDER_BYTES = 50 * 1024 * 1024;
/** 회원 한 명이 보관할 수 있는 개수 */
export const MAX_RENDERS = 20;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isRenderId = (v: unknown): v is string => typeof v === "string" && UUID.test(v);

export function renderPath(userId: string, id: string): string {
  return `${userId}/renders/${id}.mp4`;
}

/** 제목 정리 — 줄바꿈·제어 문자 제거, 80자, 비면 기본값 */
export function cleanTitle(v: unknown, fallback = "뮤직비디오"): string {
  const t = typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 80) : "";
  return t || fallback;
}

/** 보관 요청 검사 — 문제가 있으면 회원에게 보여 줄 문장, 없으면 null */
export function checkRenderSize(bytes: unknown): string | null {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n <= 0) return "완성 영상 정보가 올바르지 않습니다. 다시 만들어 주세요.";
  if (n > MAX_RENDER_BYTES) return "완성 영상이 50MB를 넘어 보관할 수 없습니다. 720p로 만들거나 곡을 줄여 주세요. 내려받기는 그대로 됩니다.";
  return null;
}

/** 자동 삭제까지 남은 날(올림, 0 이상) */
export function daysLeft(createdAt: string, now = Date.now()): number {
  const end = new Date(createdAt).getTime() + RETENTION_DAYS * 86_400_000;
  return Math.max(0, Math.ceil((end - now) / 86_400_000));
}
