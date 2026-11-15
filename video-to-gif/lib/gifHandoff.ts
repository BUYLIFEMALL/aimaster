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

/** 받을 수 있는 형식 — GIF(v1.28)·애니메이션 WebP(2026-11-15, 영상 담당 「🛍 상품 사진 영상」 결과) */
export const GIF_ACCEPT_TYPES = ["image/gif", "image/webp"] as const;

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
  if (!(file instanceof Blob)) return { error: "GIF·WebP 파일을 받지 못했습니다." };
  if (!(GIF_ACCEPT_TYPES as readonly string[]).includes(file.type)) return { error: "GIF·WebP 파일만 받을 수 있습니다." };
  if (file.size === 0 || file.size > GIF_MAX_BYTES) return { error: "GIF·WebP는 10MB 이하만 넣을 수 있습니다." };
  const raw = typeof data.name === "string" ? data.name : "";
  return { name: gifFileName(raw, file.type === "image/webp" ? "webp" : "gif"), file };
}

/** 보이는 파일 이름: 경로 글자를 지우고 60자 안, 끝은 받은 형식(.gif 기본, WebP면 .webp). */
export function gifFileName(raw: string, ext: "gif" | "webp" = "gif"): string {
  const base = raw.replace(/[\\/]/g, "").replace(/\.[^.]*$/, "").trim().slice(0, 60);
  return `${base || "animation"}.${ext}`;
}

/**
 * 움직이는 WebP인지 파일 앞부분으로 판단(RIFF…WEBP + VP8X 머리의 「움직임」 표시 0x02).
 * 받는 쪽이 ZIP·문구 고치기에서 GIF처럼 원본을 지키는 데 쓴다. 32바이트면 충분.
 */
export function isAnimatedWebp(head: Uint8Array): boolean {
  if (head.length < 21) return false;
  const tag = (o: number) => String.fromCharCode(head[o], head[o + 1], head[o + 2], head[o + 3]);
  return tag(0) === "RIFF" && tag(8) === "WEBP" && tag(12) === "VP8X" && (head[20] & 0x02) !== 0;
}

/** 저장 주소만 보고 「움직이는 그림」인지(.gif 또는 올릴 때 붙인 -anim.webp) — 다시 그리면 움직임이 사라지는 섹션 */
export function isAnimatedImageUrl(url: string | null | undefined): boolean {
  return /\.gif(\?|$)/i.test(url ?? "") || /-anim\.webp(\?|$)/i.test(url ?? "");
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
