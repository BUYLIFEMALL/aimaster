// 참고 이미지(얼굴·장소·상품·직전 결과) 형식 경계 — 2026-11-18 W01c(CC-SNS-01, Master msg_1d33e6c414a5).
// 서버: data URL만 받고, 엄격한 base64·MIME과 실제 바이트 서명 일치·허용 형식·장당/합계/개수 상한을 확인한 뒤에만 유료 생성을 부른다.
// 허용 형식 근거: Google Gemini 이미지 이해 문서(https://ai.google.dev/gemini-api/docs/image-understanding)의 지원 MIME
//   image/png·image/jpeg·image/webp·image/heic·image/heif. HEIC/HEIF 브랜드 표는 Google 문서가 아니라 ISO/IEC 23008-12(HEIF) 관례.
//   서명 머리 검사는 「형식이 맞다」는 확인일 뿐, 파일 전체가 정상적으로 풀린다는 보증이 아니다.
// 상한 근거: Vercel 함수 요청 본문 4.5MB 한도. 원본 합계 2MiB → base64 약 2.67MiB + 설정 글자 → JSON 입구 상한 3MiB 안.
//   생성 결과(응답) 크기 한도(G5)는 이 작업으로 해소되지 않는다.
// 시험에서 바로 불러올 수 있게 경로 별칭·Next 모듈을 쓰지 않는다. 브라우저 전용 함수(아래 「브라우저」 절)는 서버에서 부르지 않는다.

export const ALLOWED_MIME = ["image/png", "image/jpeg", "image/webp", "image/heic", "image/heif"] as const;
export type AllowedMime = (typeof ALLOWED_MIME)[number];
export const PER_IMAGE_MAX_BYTES = 1024 * 1024;
export const TOTAL_MAX_BYTES = 2 * 1024 * 1024;
export const JSON_BODY_MAX_BYTES = 3 * 1024 * 1024;
export const MAX_PRODUCT_IMAGES = 3;
export const MAX_REFERENCE_IMAGES = 6;

export type RefField = "personImage" | "placeImage" | "productImages" | "lastResultImage";
export type RefErrorCode = "REFERENCE_INVALID" | "REFERENCE_UNSUPPORTED" | "REFERENCE_TOO_LARGE" | "REFERENCE_TOO_MANY";
export type ParsedImage = { mime: AllowedMime; base64: string; bytes: number };
export type RefItem = { field: RefField; index?: number; image: ParsedImage };

const FIELD_LABEL: Record<RefField | "total", string> = {
  personImage: "얼굴 참고 사진",
  placeImage: "장소 참고 사진",
  productImages: "상품 사진",
  lastResultImage: "보정할 직전 결과",
  total: "참고 사진 전체",
};
const CODE_MESSAGE: Record<RefErrorCode, string> = {
  REFERENCE_INVALID: "을(를) 읽을 수 없습니다. 사진을 다시 올려 주세요.",
  REFERENCE_UNSUPPORTED: "은(는) 지원하지 않는 형식입니다. PNG·JPEG·WebP·HEIC 사진으로 올려 주세요.",
  REFERENCE_TOO_LARGE: "이(가) 너무 큽니다. 한 장 1MB·합계 2MB 이하로 줄여 주세요.",
  REFERENCE_TOO_MANY: "이(가) 너무 많습니다. 상품 사진은 3장까지입니다.",
};
export function referenceErrorMessage(code: RefErrorCode, field: RefField | "total"): string {
  return FIELD_LABEL[field] + CODE_MESSAGE[code];
}

const B64_RE = /^[A-Za-z0-9+/]+={0,2}$/;
const DATA_URL_RE = /^data:([^;,]*);base64,([^]*)$/;
const HEIC_BRANDS = new Set(["heic", "heix", "heim", "heis", "hevc", "hevx"]);
// AVIF 계열 — 주 브랜드든 호환 브랜드든 하나라도 있으면 HEIF로 보지 않는다(mif1 주 브랜드 + avif 호환 위장 반례, 2026-11-18 Mac 검수)
const AVIF_BRANDS = new Set(["avif", "avis"]);
// 범용 HEIF(mif1·msf1)만 있고 HEIC 브랜드가 없으면 실제 코덱을 확인할 수 없어 거절한다(HEIC 명시 브랜드만 허용).
const FTYP_MAX_BYTES = 256;

function decodedLength(b64: string): number {
  const pad = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  return (b64.length / 4) * 3 - pad;
}

function headBytes(b64: string, n = FTYP_MAX_BYTES + 16): Uint8Array {
  const chunk = b64.slice(0, Math.ceil(n / 3) * 4);
  const bin = globalThis.atob(chunk);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

const ascii = (b: Uint8Array, from: number, to: number) => String.fromCharCode(...b.subarray(from, to));

type SniffKind = "png" | "jpeg" | "webp" | "heic" | "bmff-unsupported";

/** ISO BMFF 첫 상자(ftyp)를 경계까지 정확히 읽는다: [크기 4][ftyp][주 브랜드 4][부 버전 4][호환 브랜드 4×n].
 *  크기가 16 미만·상한 초과·4바이트 정렬 아님·받은 바이트보다 길면 null(깨진 상자). AVIF/AVIS 브랜드가 하나라도 있거나
 *  HEIC 브랜드가 없으면 bmff-unsupported. 이것은 파일 식별일 뿐 전체 디코드 보증이 아니다. */
function sniffFtyp(b: Uint8Array): SniffKind | null {
  const size = ((b[0] << 24) >>> 0) + (b[1] << 16) + (b[2] << 8) + b[3];
  if (size < 16 || size > FTYP_MAX_BYTES || (size - 16) % 4 !== 0 || size > b.length) return null;
  const brands = [ascii(b, 8, 12)];
  for (let at = 16; at < size; at += 4) brands.push(ascii(b, at, at + 4));
  if (brands.some((x) => AVIF_BRANDS.has(x))) return "bmff-unsupported";
  return brands.some((x) => HEIC_BRANDS.has(x)) ? "heic" : "bmff-unsupported";
}

/** 실제 바이트 서명으로 판정한 형식. 모르는 바이트·깨진 상자는 null */
function sniff(b: Uint8Array): SniffKind | null {
  if (b.length >= 8 && b[0] === 0x89 && ascii(b, 1, 4) === "PNG" && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return "png";
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpeg";
  if (b.length >= 12 && ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 12) === "WEBP") return "webp";
  if (b.length >= 16 && ascii(b, 4, 8) === "ftyp") return sniffFtyp(b);
  return null;
}

function mimeMatches(mime: AllowedMime, kind: SniffKind): boolean {
  if (mime === "image/png") return kind === "png";
  if (mime === "image/jpeg") return kind === "jpeg";
  if (mime === "image/webp") return kind === "webp";
  return kind === "heic"; // image/heic·image/heif 모두 HEIC 명시 브랜드만
}

/** data URL 한 장을 검사한다. 원격 주소는 가져오지 않는다(https 등은 그대로 거절). */
export function parseImageDataUrl(value: unknown): { ok: true; image: ParsedImage } | { ok: false; code: RefErrorCode } {
  if (typeof value !== "string") return { ok: false, code: "REFERENCE_INVALID" };
  const m = DATA_URL_RE.exec(value);
  if (!m) return { ok: false, code: "REFERENCE_INVALID" };
  const mime = m[1];
  const b64 = m[2];
  if (mime.includes("=")) return { ok: false, code: "REFERENCE_INVALID" };
  if (!(ALLOWED_MIME as readonly string[]).includes(mime)) return { ok: false, code: "REFERENCE_UNSUPPORTED" };
  if (!b64 || b64.length % 4 !== 0) return { ok: false, code: "REFERENCE_INVALID" };
  if (b64.length > Math.ceil(PER_IMAGE_MAX_BYTES / 3) * 4 + 4) return { ok: false, code: "REFERENCE_TOO_LARGE" };
  if (!B64_RE.test(b64)) return { ok: false, code: "REFERENCE_INVALID" };
  const bytes = decodedLength(b64);
  if (bytes <= 0) return { ok: false, code: "REFERENCE_INVALID" };
  if (bytes > PER_IMAGE_MAX_BYTES) return { ok: false, code: "REFERENCE_TOO_LARGE" };
  let kind: SniffKind | null;
  try {
    kind = sniff(headBytes(b64));
  } catch {
    return { ok: false, code: "REFERENCE_INVALID" };
  }
  const heifMime = mime === "image/heif" || mime === "image/heic";
  if (!kind) return { ok: false, code: heifMime ? "REFERENCE_UNSUPPORTED" : "REFERENCE_INVALID" };
  if (kind === "bmff-unsupported") return { ok: false, code: heifMime ? "REFERENCE_UNSUPPORTED" : "REFERENCE_INVALID" };
  if (!mimeMatches(mime as AllowedMime, kind)) return { ok: false, code: "REFERENCE_INVALID" };
  return { ok: true, image: { mime: mime as AllowedMime, base64: b64, bytes } };
}

type RefConfig = { personImage?: unknown; placeImage?: unknown; isAdMode?: unknown; productImages?: unknown; lastResultImage?: unknown; feedback?: unknown };
export type CollectResult =
  | { ok: true; items: RefItem[]; totalBytes: number }
  | { ok: false; code: RefErrorCode; field: RefField | "total"; index?: number };

/** 실제로 생성 요청에 붙는 참고 이미지만 순서대로 모아 검사한다(gemini.ts와 같은 조건·순서). */
export function collectReferences(config: RefConfig): CollectResult {
  const items: RefItem[] = [];
  const one = (field: RefField, v: unknown, index?: number): CollectResult | null => {
    const r = parseImageDataUrl(v);
    if (!r.ok) return { ok: false, code: r.code, field, ...(index !== undefined ? { index } : {}) };
    items.push({ field, ...(index !== undefined ? { index } : {}), image: r.image });
    return null;
  };
  // 값 없음은 null·undefined·빈 문자열뿐. 그 밖의 값(0·false·숫자·객체·배열 등)이 활성 칸에 오면 생략하지 않고 거절한다.
  const absent = (v: unknown) => v === undefined || v === null || v === "";
  if (!absent(config.personImage)) { const e = one("personImage", config.personImage); if (e) return e; }
  if (!absent(config.placeImage)) { const e = one("placeImage", config.placeImage); if (e) return e; }
  // 비활성 칸은 예전처럼 무시: 광고 모드가 아니면 상품 사진, 보정 요청(feedback)이 없으면 직전 결과
  if (config.isAdMode && !absent(config.productImages)) {
    if (!Array.isArray(config.productImages)) return { ok: false, code: "REFERENCE_INVALID", field: "productImages" };
    if (config.productImages.length > MAX_PRODUCT_IMAGES) return { ok: false, code: "REFERENCE_TOO_MANY", field: "productImages" };
    for (let i = 0; i < config.productImages.length; i++) { const e = one("productImages", config.productImages[i], i); if (e) return e; }
  }
  if (config.feedback && !absent(config.lastResultImage)) { const e = one("lastResultImage", config.lastResultImage); if (e) return e; }
  if (items.length > MAX_REFERENCE_IMAGES) return { ok: false, code: "REFERENCE_TOO_MANY", field: "total" };
  const totalBytes = items.reduce((s, i) => s + i.image.bytes, 0);
  if (totalBytes > TOTAL_MAX_BYTES) return { ok: false, code: "REFERENCE_TOO_LARGE", field: "total" };
  return { ok: true, items, totalBytes };
}

/** Gemini 요청 조각 — 실제 MIME 그대로 */
export function buildReferenceParts(items: RefItem[]): { inlineData: { data: string; mimeType: string } }[] {
  return items.map((i) => ({ inlineData: { data: i.image.base64, mimeType: i.image.mime } }));
}

/** 요청 본문을 상한까지만 읽는다. 초과 413, UTF-8·JSON 오류 400 */
export async function readJsonBodyLimited(req: Request, maxBytes: number): Promise<{ ok: true; value: unknown } | { ok: false; status: 400 | 413; code: "BODY_TOO_LARGE" | "BODY_INVALID" }> {
  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) return { ok: false, status: 413, code: "BODY_TOO_LARGE" };
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    if (!req.body) return { ok: false, status: 400, code: "BODY_INVALID" };
    const reader = req.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel().catch(() => undefined);
        return { ok: false, status: 413, code: "BODY_TOO_LARGE" };
      }
      chunks.push(value);
    }
  } catch {
    // 스트림 읽기 오류 — 원문(오류 메시지)은 응답·로그에 남기지 않는다
    return { ok: false, status: 400, code: "BODY_INVALID" };
  }
  const all = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) { all.set(c, at); at += c.byteLength; }
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(all);
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, status: 400, code: "BODY_INVALID" };
  }
}

const BODY_MESSAGE = {
  BODY_TOO_LARGE: "요청이 너무 큽니다. 참고 사진 크기를 줄여 주세요(한 장 1MB·합계 2MB 이하).",
  BODY_INVALID: "요청 형식이 올바르지 않습니다. 화면을 새로고침한 뒤 다시 시도해 주세요.",
} as const;

/** 생성 요청 처리 — 본문·참고 이미지 검사를 통과한 경우에만 generate(유료)를 부른다. 원문(본문·이미지·주소·키)은 기록하지 않는다. */
export async function handleGenerateImageRequest(req: Request, generate: (config: Record<string, unknown>) => Promise<string>): Promise<{ status: number; body: Record<string, unknown> }> {
  const body = await readJsonBodyLimited(req, JSON_BODY_MAX_BYTES);
  if (!body.ok) return { status: body.status, body: { error: BODY_MESSAGE[body.code], code: body.code } };
  if (!body.value || typeof body.value !== "object" || Array.isArray(body.value)) return { status: 400, body: { error: BODY_MESSAGE.BODY_INVALID, code: "BODY_INVALID" } };
  const config = body.value as Record<string, unknown>;
  const refs = collectReferences(config);
  if (!refs.ok) {
    return { status: 400, body: { error: referenceErrorMessage(refs.code, refs.field), code: refs.code, field: refs.field, ...(refs.index !== undefined ? { index: refs.index } : {}) } };
  }
  try {
    const imageUrl = await generate(config);
    return { status: 200, body: { success: true, imageUrl } };
  } catch (err) {
    const e = err as { code?: unknown; message?: unknown };
    console.error("Generate Image API Error:", typeof e?.code === "string" ? e.code : "");
    return { status: 500, body: { error: (typeof e?.message === "string" && e.message) || "이미지 생성 중 오류가 발생했습니다." } };
  }
}

// ───────────── 브라우저 ─────────────
export const HISTORY_REFINE_MESSAGE = "히스토리에서 불러온 결과는 바로 보정할 수 없습니다. 같은 설정으로 새로 생성한 뒤 보정해 주세요.";
const CONVERT_FAIL_MESSAGE = "사진을 1MB 이하로 줄이지 못했습니다. 더 작은 사진으로 다시 올려 주세요.";
const MAX_EDGE = 2048;

async function drawToJpeg(src: Blob | string): Promise<Blob | null> {
  let width = 0, height = 0;
  let source: CanvasImageSource | null = null;
  if (typeof src !== "string" && typeof createImageBitmap === "function") {
    try { const bmp = await createImageBitmap(src); source = bmp; width = bmp.width; height = bmp.height; } catch { source = null; }
  }
  if (!source) {
    const objUrl = typeof src === "string" ? src : URL.createObjectURL(src);
    try {
      const img = await new Promise<HTMLImageElement | null>((resolve) => { const i = new Image(); i.onload = () => resolve(i); i.onerror = () => resolve(null); i.src = objUrl; });
      if (!img) return null;
      source = img; width = img.naturalWidth; height = img.naturalHeight;
    } finally {
      if (typeof src !== "string") URL.revokeObjectURL(objUrl);
    }
  }
  if (!width || !height) return null;
  const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  for (const q of [0.9, 0.8]) {
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", q));
    if (blob && blob.size <= PER_IMAGE_MAX_BYTES) return blob;
  }
  return null;
}

const blobToDataUrl = (b: Blob) => new Promise<string>((resolve, reject) => { const r = new FileReader(); r.onloadend = () => (typeof r.result === "string" ? resolve(r.result) : reject(new Error("read"))); r.onerror = () => reject(new Error("read")); r.readAsDataURL(b); });

/** 올린 사진 → 참고 이미지 data URL. 작고 지원되는 원본은 그대로, 크거나 미지원이면 JPEG(긴 변 2048)로 바꾼다. 자동 유료 호출 없음 */
export async function fileToReferenceDataUrl(file: File): Promise<{ ok: true; dataUrl: string } | { ok: false; message: string }> {
  if ((ALLOWED_MIME as readonly string[]).includes(file.type) && file.size <= PER_IMAGE_MAX_BYTES) {
    const dataUrl = await blobToDataUrl(file).catch(() => "");
    if (parseImageDataUrl(dataUrl).ok) return { ok: true, dataUrl };
  }
  const jpeg = await drawToJpeg(file);
  if (!jpeg) return { ok: false, message: CONVERT_FAIL_MESSAGE };
  const dataUrl = await blobToDataUrl(jpeg).catch(() => "");
  return parseImageDataUrl(dataUrl).ok ? { ok: true, dataUrl } : { ok: false, message: CONVERT_FAIL_MESSAGE };
}

/** 보정용 직전 결과(data URL)를 상한 안으로 맞춘다. data URL이 아니면(히스토리 서명 주소) 보내지 않고 안내 */
export async function prepareLastResultForRefine(src: string | null | undefined): Promise<{ ok: true; dataUrl: string } | { ok: false; message: string }> {
  if (!src || !src.startsWith("data:")) return { ok: false, message: HISTORY_REFINE_MESSAGE };
  if (parseImageDataUrl(src).ok) return { ok: true, dataUrl: src };
  const jpeg = await drawToJpeg(src);
  if (!jpeg) return { ok: false, message: CONVERT_FAIL_MESSAGE };
  const dataUrl = await blobToDataUrl(jpeg).catch(() => "");
  return parseImageDataUrl(dataUrl).ok ? { ok: true, dataUrl } : { ok: false, message: CONVERT_FAIL_MESSAGE };
}
