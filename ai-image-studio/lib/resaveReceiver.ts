// 공용 기준 코드 `resave-receiver`(2026-10-22) — 이미지 변환 스튜디오 「○○에 다시 저장」을 받는 쪽 공통 부분.
// 기준: four-cut-comics/src/lib/resaveReceiver.ts · 사본: portrait-photo/src/lib/resaveReceiver.ts, banana-canvas/src/lib/bnc/resaveReceiver.ts
// 사본은 직접 고치지 말고 이 파일만 고친 뒤 사본에 반영(`scripts/check-shared-modules.mjs`).
// 여기 있는 것: CORS(변환 스튜디오 주소만·로그인 쿠키) · 본문 base64 읽기·한도 · 파일 첫 바이트로 형식 판별 · 보낸 쪽 이름표(label) 정리.
// 저장할 곳(표·버킷·기록)·인증은 각 프로그램. 이 파일은 다른 파일을 가져오지 않는다(node 시험에서 바로 불러옴).

export const RESAVE_ORIGIN = "https://image-convert-studio.buylife.xyz";
export type ResaveExt = "jpg" | "png" | "webp";
export const RESAVE_MIME: Record<ResaveExt, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };
export const MAX_RESAVE_LABEL = 60;
const B64 = /^[A-Za-z0-9+/]+={0,2}$/;

/** 요청 Origin이 변환 스튜디오일 때만 CORS 헤더(그 외에는 빈 값 — 브라우저가 막는다) */
export function resaveCors(origin: string | null): Record<string, string> {
  return origin === RESAVE_ORIGIN
    ? { "Access-Control-Allow-Origin": RESAVE_ORIGIN, "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", Vary: "Origin" }
    : {};
}

/** 파일 첫 바이트(서명)로 형식을 판별한다 — 보낸 쪽이 적은 형식은 믿지 않는다 */
export function detectImageExt(b: Uint8Array): ResaveExt | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return "png";
  // 펼치기(...) 없이 비교 — 대상 버전이 낮은 tsconfig(이미지 스튜디오)에서도 통과
  const at = (i: number, text: string) => text.split("").every((c, k) => b[i + k] === c.charCodeAt(0));
  if (b.length >= 12 && at(0, "RIFF") && at(8, "WEBP")) return "webp";
  return null;
}

/** 보낸 쪽이 붙인 이름표(예: 「○○ 3화」) — 제어 문자 제거·한 줄·60자 */
export function cleanResaveLabel(v: unknown): string {
  if (typeof v !== "string") return "";
  return v.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, MAX_RESAVE_LABEL);
}

export type ResaveBody =
  | { ok: true; bytes: Buffer; ext: ResaveExt; mime: string; label: string; body: Record<string, unknown> }
  | { ok: false; status: number; error: string };

/** 요청 본문(JSON 문자열)을 읽어 그림 바이트·형식·이름표를 돌려준다. body는 프로그램별 추가 칸(예: purposeLabel)용 */
export function readResaveBody(raw: string, maxB64: number): ResaveBody {
  if (raw.length > maxB64 + 2_000) return { ok: false, status: 413, error: "이미지가 너무 큽니다." };
  let body: Record<string, unknown> = {};
  try { body = JSON.parse(raw) ?? {}; } catch { /* 아래에서 처리 */ }
  const data = (body.image as { data?: unknown } | undefined)?.data;
  if (typeof data !== "string" || data.length < 100 || data.length > maxB64 || !B64.test(data)) return { ok: false, status: 400, error: "이미지 데이터가 올바르지 않습니다." };
  const bytes = Buffer.from(data, "base64");
  const ext = detectImageExt(bytes);
  if (!ext) return { ok: false, status: 400, error: "JPEG·PNG·WebP 그림만 저장할 수 있습니다." };
  return { ok: true, bytes, ext, mime: RESAVE_MIME[ext], label: cleanResaveLabel(body.label), body };
}
