// 공용 기준 코드 gif-handoff (기준: shop-detail-page/lib/gifHandoff.ts, 사본: video-to-gif/lib/gifHandoff.ts).
// 사본은 직접 고치지 말고 기준만 고친 뒤 `node scripts/check-shared-modules.mjs --sync`.
// v1.28: GIF 자동화 창 → 상세페이지 「GIF 받기」 창으로 브라우저 안에서 GIF 파일을 넘기는 약속(postMessage).
// 서버를 거치지 않고, 두 창 모두 상대 주소가 정확히 아래 주소일 때만 메시지를 받는다.

export const GIF_SENDER_ORIGIN = "https://video-to-gif.buylife.xyz";
export const GIF_RECEIVER_ORIGIN = "https://shop-detail-page.buylife.xyz";
export const GIF_INBOX_PATH = "/products/gif-inbox";
export const GIF_MAX_BYTES = 10 * 1024 * 1024;

export const MSG_READY = "aimaster-gif-inbox-ready";
export const MSG_FILE = "aimaster-gif-inbox-file";

export type GifFileMessage = { type: typeof MSG_FILE; name: string; file: Blob };

/** 받는 창(상세페이지)이 보낸 「준비됨」인지. */
export function isReadyMessage(origin: string, data: unknown): boolean {
  return origin === GIF_RECEIVER_ORIGIN && isRecord(data) && data.type === MSG_READY;
}

/**
 * 보내는 창(GIF 자동화)이 보낸 GIF 파일 메시지를 검사한다. 맞으면 이름·파일, 아니면 오류 문구.
 * 다른 사이트에서 온 메시지는 `null`(조용히 무시).
 */
export function readFileMessage(
  origin: string,
  data: unknown,
): { name: string; file: Blob } | { error: string } | null {
  if (origin !== GIF_SENDER_ORIGIN || !isRecord(data) || data.type !== MSG_FILE) return null;
  const file = data.file;
  if (!(file instanceof Blob)) return { error: "GIF 파일을 받지 못했습니다." };
  if (file.type !== "image/gif") return { error: "GIF 파일만 받을 수 있습니다." };
  if (file.size === 0 || file.size > GIF_MAX_BYTES) return { error: "GIF는 10MB 이하만 넣을 수 있습니다." };
  const raw = typeof data.name === "string" ? data.name : "";
  return { name: gifFileName(raw), file };
}

/** 보이는 파일 이름: 경로 글자를 지우고 60자 안, 끝은 .gif. */
export function gifFileName(raw: string): string {
  const base = raw.replace(/[\\/]/g, "").replace(/\.[^.]*$/, "").trim().slice(0, 60);
  return `${base || "animation"}.gif`;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
