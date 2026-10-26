// 공용 기준 코드 nukki-handoff (기준: banana-canvas/src/lib/nukkiHandoff.ts, 사본: shop-detail-page/lib/nukkiHandoff.ts).
// 사본은 직접 고치지 말고 기준만 고친 뒤 `node scripts/check-shared-modules.mjs --module nukki-handoff --sync`.
// E5-2(2026-10-26): 상세페이지 섹션 이미지 「✂ 누끼」 → 바나나 「🧰 무료 이미지 도구」 창으로 브라우저 안에서 그림을 넘기는 약속(postMessage).
// gif-handoff와 같은 방식(방향만 반대). 서버를 거치지 않고, 두 창 모두 상대 주소가 정확히 아래 주소일 때만 메시지를 받는다.

export const NUKKI_SENDER_ORIGIN = "https://shop-detail-page.buylife.xyz";
export const NUKKI_RECEIVER_ORIGIN = "https://banana-canvas.buylife.xyz";
/** 받는 화면 주소(쿼리로 보낸 곳 표시 — 이때만 「준비됨」을 보낸다) */
export const NUKKI_TOOLS_PATH = "/tools?from=shop-detail";
export const NUKKI_MAX_BYTES = 25 * 1024 * 1024;
const TYPES = ["image/png", "image/jpeg", "image/webp"];

export const NUKKI_MSG_READY = "aimaster-nukki-ready";
export const NUKKI_MSG_FILE = "aimaster-nukki-file";

/** 받는 창(바나나)이 보낸 「준비됨」인지 */
export function isNukkiReady(origin: string, data: unknown): boolean {
  return origin === NUKKI_RECEIVER_ORIGIN && isRecord(data) && data.type === NUKKI_MSG_READY;
}

/**
 * 보내는 창(상세페이지)이 보낸 그림 메시지를 검사한다. 맞으면 이름·파일, 아니면 오류 문구.
 * 다른 사이트에서 온 메시지는 null(조용히 무시).
 */
export function readNukkiFile(origin: string, data: unknown): { name: string; file: Blob; section: string | null } | { error: string } | null {
  if (origin !== NUKKI_SENDER_ORIGIN || !isRecord(data) || data.type !== NUKKI_MSG_FILE) return null;
  const file = data.file;
  if (!(file instanceof Blob)) return { error: "사진을 받지 못했습니다." };
  if (!TYPES.includes(file.type)) return { error: "PNG·JPG·WEBP 사진만 받을 수 있습니다." };
  if (file.size === 0 || file.size > NUKKI_MAX_BYTES) return { error: "25MB 이하 사진만 넣을 수 있습니다." };
  return { name: nukkiFileName(typeof data.name === "string" ? data.name : "", file.type), file, section: sectionKey(data.section) };
}

/* E5-3(2026-10-26): 결과 되돌리기 — 바나나가 누끼 결과를 상세페이지 그 섹션으로 돌려보낸다(상세페이지가 새 버전으로 저장) */
export const NUKKI_MSG_RESULT = "aimaster-nukki-result";
/** 상세페이지 직접 올리기 한도와 같다 */
export const NUKKI_RESULT_MAX_BYTES = 10 * 1024 * 1024;

/** 섹션 키: 영문·숫자·밑줄·하이픈 1~100자만(상세페이지 section_key 형식) */
export function sectionKey(v: unknown): string | null {
  return typeof v === "string" && /^[A-Za-z0-9_-]{1,100}$/.test(v) ? v : null;
}

/** 상세페이지가 바나나에서 온 결과 메시지를 검사한다. 다른 사이트는 null */
export function readNukkiResult(origin: string, data: unknown): { section: string; file: Blob } | { error: string } | null {
  if (origin !== NUKKI_RECEIVER_ORIGIN || !isRecord(data) || data.type !== NUKKI_MSG_RESULT) return null;
  const section = sectionKey(data.section), file = data.file;
  if (!section) return { error: "어느 섹션인지 알 수 없습니다." };
  if (!(file instanceof Blob) || !["image/png", "image/jpeg"].includes(file.type)) return { error: "PNG·JPG 결과만 넣을 수 있습니다." };
  if (file.size === 0 || file.size > NUKKI_RESULT_MAX_BYTES) return { error: "결과가 10MB를 넘어 넣을 수 없습니다. 결과를 받아 줄여서 「📤 직접 등록」으로 넣어 주세요." };
  return { section, file };
}

/** 보이는 파일 이름: 경로 글자를 지우고 60자 안, 끝은 형식에 맞는 확장자 */
export function nukkiFileName(raw: string, type: string): string {
  const ext = type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg";
  const base = raw.replace(/[\\/]/g, "").replace(/\.[^.]*$/, "").replace(/^\.+/, "").trim().slice(0, 60);
  return `${base || "상세페이지_사진"}.${ext}`;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
