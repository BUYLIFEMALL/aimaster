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

/** 바이트 앞부분으로 형식만 판정해 돌려준다(상한·MIME 대조 없음). 생성 원본 저장(src/lib/assets/store.ts)이 자기 상한·허용 형식으로 재사용한다.
 *  참고 이미지 검사(parseImageDataUrl)의 1MiB 상한과 동작은 바뀌지 않는다. 서명 확인일 뿐 전체 디코드 보증이 아니다. — W01-A1(2026-11-18) */
export function sniffImageKind(bytes: Uint8Array): SniffKind | null {
  return sniff(bytes.length > FTYP_MAX_BYTES + 16 ? bytes.subarray(0, FTYP_MAX_BYTES + 16) : bytes);
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
/** opts.signal(선택, W01-G3T): 주면 신호가 끊기는 즉시 읽기를 그만두고(400 BODY_INVALID), 상한 초과·중단 때 reader.cancel()의 완료를 기다리지 않는다.
 *  주지 않으면 예전과 완전히 같은 동작이다(기존 호출부는 인자 2개 그대로). */
export async function readJsonBodyLimited(req: Request, maxBytes: number, opts?: { signal?: AbortSignal }): Promise<{ ok: true; value: unknown } | { ok: false; status: 400 | 413; code: "BODY_TOO_LARGE" | "BODY_INVALID" }> {
  const signal = opts?.signal;
  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) return { ok: false, status: 413, code: "BODY_TOO_LARGE" };
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    if (!req.body) return { ok: false, status: 400, code: "BODY_INVALID" };
    const reader = req.body.getReader();
    // 취소 신호가 있을 때만: 신호가 끊기면 읽기 대기에서 바로 빠져나온다
    const aborted: Promise<"aborted"> | null = signal
      ? new Promise((resolve) => { if (signal.aborted) resolve("aborted"); else signal.addEventListener("abort", () => resolve("aborted"), { once: true }); })
      : null;
    for (;;) {
      let step: ReadableStreamReadResult<Uint8Array> | "aborted";
      if (aborted) {
        const pending = reader.read();
        pending.catch(() => undefined);                       // 빠져나온 뒤 늦게 오는 오류를 소비한다
        step = await Promise.race([pending, aborted]);
      } else {
        step = await reader.read();
      }
      if (step === "aborted") {
        void reader.cancel().catch(() => undefined);          // 취소 완료를 기다리지 않는다
        return { ok: false, status: 400, code: "BODY_INVALID" };
      }
      const { done, value } = step;
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        if (signal) void reader.cancel().catch(() => undefined);
        else await reader.cancel().catch(() => undefined);
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

/** 요청이 중간에 끊겼을 때의 안내(2026-11-20, Mac msg_d73efbf3e654·msg_3daea3d7aefc) */
export const REQUEST_ABORTED_MESSAGE = "요청이 중간에 끊겼습니다. 화면을 새로고침한 뒤 다시 시도해 주세요.";

/**
 * 생성 요청 처리 — 본문·참고 이미지 검사를 통과한 경우에만 generate(유료)를 부른다. 원문(본문·이미지·주소·키)은 기록하지 않는다.
 * opts.signal(선택, 2026-11-20): 주면 본문 읽기를 그 신호에 묶고, 끊기면 생성 직전에도 멈춘다(400, 생성 0). 주지 않으면 예전과 완전히 같다.
 */
export async function handleGenerateImageRequest(
  req: Request,
  generate: (config: Record<string, unknown>) => Promise<string>,
  opts?: { signal?: AbortSignal },
): Promise<{ status: number; body: Record<string, unknown> }> {
  const signal = opts?.signal;
  const aborted = () => ({ status: 400, body: { error: REQUEST_ABORTED_MESSAGE, code: "BODY_INVALID" } });
  if (signal?.aborted) return aborted();
  const body = await readJsonBodyLimited(req, JSON_BODY_MAX_BYTES, signal ? { signal } : undefined);
  if (signal?.aborted) return aborted();
  if (!body.ok) return { status: body.status, body: { error: BODY_MESSAGE[body.code], code: body.code } };
  if (!body.value || typeof body.value !== "object" || Array.isArray(body.value)) return { status: 400, body: { error: BODY_MESSAGE.BODY_INVALID, code: "BODY_INVALID" } };
  const config = body.value as Record<string, unknown>;
  const refs = collectReferences(config);
  if (!refs.ok) {
    return { status: 400, body: { error: referenceErrorMessage(refs.code, refs.field), code: refs.code, field: refs.field, ...(refs.index !== undefined ? { index: refs.index } : {}) } };
  }
  if (signal?.aborted) return aborted();   // 생성(유료) 직전 마지막 확인
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

async function drawToJpeg(src: Blob | string, opts?: { maxEdge?: number; qualities?: number[]; maxBytes?: number }): Promise<Blob | null> {
  const maxEdge = opts?.maxEdge ?? MAX_EDGE;
  const qualities = opts?.qualities ?? [0.9, 0.8];
  const maxBytes = opts?.maxBytes ?? PER_IMAGE_MAX_BYTES;
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
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  for (const q of qualities) {
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", q));
    if (blob && blob.size <= maxBytes) return blob;
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

// ── 보내기 직전 맞추기 (W01-FIT, 2026-11-19, CC-SNS-01, Master msg_d1564fa89a51) ──
// 올릴 때는 사진을 「장당」 1MB 이하로만 줄인다. 그래서 사진 3장 이상(인물 + 장소 + 상품, 인물 + 장소 + 보정의 직전 결과)이면
// 합계 2MiB·본문 3MiB를 넘어 서버가 거절할 수 있었다(운영 v1.26에는 이 검사가 없어 통과하던 요청). 여기서 보내기 직전에 맞춘다.
//  · 이미 한도 안이면 받은 설정을 그대로 돌려준다(같은 객체, 변환 0).
//  · 사진을 빼지 않는다 — 큰 사진부터 더 작게 다시 만든다. 화면에 보이는 원본 설정은 바꾸지 않고 「보내는 사본」만 바꾼다.
//  · 끝까지 줄여도 안 되면 보내지 않고 안내한다(유료 호출 없음).
//  · 형식·장당 상한 같은 다른 문제는 건드리지 않는다 — 기존 검사(collectReferences)가 그대로 안내한다. 서버 상한은 바꾸지 않았다.
export const FIT_FAIL_MESSAGE = "참고 사진 전체를 2MB 이하로 줄이지 못했습니다. 사진 수를 줄이거나 더 작은 사진으로 바꿔 주세요.";
export const FIT_BODY_MESSAGE = "보낼 내용이 3MB를 넘어 보내지 않았습니다. 지금 쓰지 않는 사진(광고 모드를 끈 상태로 남아 있는 상품 사진 등)을 지우거나 사진 수를 줄인 뒤 다시 시도해 주세요.";
/** 줄이는 단계(긴 변·JPEG 화질). 단계마다 「원본」에서 다시 만든다 — 줄인 것을 또 줄여 화질이 겹쳐 떨어지지 않게 */
export const FIT_LADDER: readonly { edge: number; quality: number }[] = [
  { edge: 2048, quality: 0.8 },
  { edge: 1600, quality: 0.8 },
  { edge: 1280, quality: 0.8 },
  { edge: 1024, quality: 0.75 },
  { edge: 800, quality: 0.7 },
];
export type ShrinkFn = (dataUrl: string, maxEdge: number, quality: number) => Promise<string | null>;

/** 브라우저 기본 축소기 — 올릴 때 쓰는 변환(drawToJpeg)을 그대로 쓴다. 실패·미지원이면 null */
export async function shrinkDataUrlToJpeg(dataUrl: string, maxEdge: number, quality: number): Promise<string | null> {
  const jpeg = await drawToJpeg(dataUrl, { maxEdge, qualities: [quality] });
  if (!jpeg) return null;
  const out = await blobToDataUrl(jpeg).catch(() => "");
  return parseImageDataUrl(out).ok ? out : null;
}

/** 보내는 본문(JSON)의 UTF-8 바이트 수 — 서버의 3MiB 상한과 같은 기준 */
export function serializedBytes(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).length;
}

export async function fitReferencesForSend<T extends RefConfig>(
  config: T,
  opts?: { shrink?: ShrinkFn },
): Promise<{ ok: true; config: T; changed: boolean } | { ok: false; message: string }> {
  type Slot = { field: RefField; index?: number; original: string; value: string; bytes: number };
  const slots: Slot[] = [];
  const same = { ok: true as const, config, changed: false };
  const absent = (v: unknown) => v === undefined || v === null || v === "";
  const add = (field: RefField, v: unknown, index?: number): boolean => {
    const r = parseImageDataUrl(v);
    if (!r.ok) return false;
    slots.push({ field, ...(index !== undefined ? { index } : {}), original: v as string, value: v as string, bytes: r.image.bytes });
    return true;
  };
  // collectReferences와 같은 조건·순서로 「실제로 보내지는」 사진만 모은다. 하나라도 형식이 이상하면 손대지 않는다.
  if (!absent(config.personImage) && !add("personImage", config.personImage)) return same;
  if (!absent(config.placeImage) && !add("placeImage", config.placeImage)) return same;
  if (config.isAdMode && !absent(config.productImages)) {
    if (!Array.isArray(config.productImages) || config.productImages.length > MAX_PRODUCT_IMAGES) return same;
    for (let i = 0; i < config.productImages.length; i++) if (!add("productImages", config.productImages[i], i)) return same;
  }
  if (config.feedback && !absent(config.lastResultImage) && !add("lastResultImage", config.lastResultImage)) return same;

  // 생성에 쓰이지 않는 칸(광고 모드가 아닐 때의 상품 사진, 보정 요청이 없을 때의 직전 결과)도 본문에는 그대로 실린다.
  // 그 칸은 빼지도 줄이지도 않는다(Master msg_4ddfcc074cc6: 고른 사진을 알리지 않고 빼지 않는다 — 쓰이지 않는 칸도 같다).
  // 그래서 쓰이는 사진을 다 줄여도 본문이 3MiB를 넘으면, 보내지 않고 본문 한도를 안내한다(쓰이는 사진이 없는 경우 포함).

  const build = (): T => {
    const next: Record<string, unknown> = { ...(config as Record<string, unknown>) };
    let products: unknown[] | null = null;
    for (const s of slots) {
      if (s.value === s.original) continue;
      if (s.field === "productImages") {
        if (!products) products = [...(config.productImages as unknown[])];
        products[s.index as number] = s.value;
      } else next[s.field] = s.value;
    }
    if (products) next.productImages = products;
    return next as T;
  };
  const totalFits = () => slots.reduce((sum, s) => sum + s.bytes, 0) <= TOTAL_MAX_BYTES;
  const fits = () => totalFits() && serializedBytes(build()) <= JSON_BODY_MAX_BYTES;
  if (fits()) return same;
  if (!slots.length) return { ok: false, message: FIT_BODY_MESSAGE };   // 줄일 사진이 없다 — 본문이 넘는 채로 보내지 않는다

  const shrink = opts?.shrink ?? shrinkDataUrlToJpeg;
  for (const step of FIT_LADDER) {
    // 큰 사진부터. 맞는 순간 멈춘다 — 작은 사진은 가능한 한 그대로 둔다
    for (const s of [...slots].sort((a, b) => b.bytes - a.bytes)) {
      if (fits()) break;
      let out: string | null = null;
      try { out = await shrink(s.original, step.edge, step.quality); } catch { out = null; }
      if (!out) continue;
      const r = parseImageDataUrl(out);
      if (r.ok && r.image.bytes < s.bytes) { s.value = out; s.bytes = r.image.bytes; }
    }
    if (fits()) return { ok: true, config: build(), changed: true };
  }
  // 합계는 맞췄는데 본문만 넘는다 = 쓰이지 않는 칸의 사진이나 긴 글자 설정 때문이다 → 본문 한도 안내. 그 밖에는 합계 안내.
  return { ok: false, message: totalFits() ? FIT_BODY_MESSAGE : FIT_FAIL_MESSAGE };
}
