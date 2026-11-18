// 화면용 자산 흐름 — 참고 사진 올리기 → 번호로 생성 → 결과 받기·다시 받기 (W01-UIC, 2026-11-19, CC-SNS-01, Master msg_f3348556982f).
// 계약: docs/analysis-ai-influencer-20261118/W00_BASELINE.md §24. React·Next 모듈·경로 별칭을 쓰지 않는다. fetch는 호출부가 넘긴다(시험이 가짜를 넣는다).
//
// ★ 아직 어떤 화면도 이 파일을 부르지 않는다(컴포넌트 연결은 다음 단위). 서버 모드 상수도 "off"라 실제로 불러도 새 경로는 404를 돌려준다.
//
// 지키는 것
//  * 스스로 다시 하지 않는다: 올리기·생성·조회 어느 것도 실패·불명·모드 어긋남에서 다시 보내지 않고, 기존 생성 경로(/api/generate-image)로 넘어가지도 않는다.
//    한 번 부르면 요청은 「올리기 = 번호 없는 사진 수만큼, 생성 = 최대 1회, 결과 받기 = 최대 1회」다. 다시 받기는 호출부가(사용자가 누를 때) reloadAsset을 부를 때만.
//  * 생성 요청 본문에는 사진 칸(personImage·placeImage·productImages·lastResultImage)이 없다. 참고 사진은 번호와 역할로만 간다. 순서는 얼굴 → 장소 → 상품.
//  * 서명 주소는 보관하지 않는다: 받는 그 자리에서 한 번 쓰고, 돌려주는 결과·기억(AssetIdMemory)·오류 어디에도 넣지 않는다.
//  * 결과 받기(저장소로 가는 교차 출처 요청)는 자격 증명을 보내지 않고(credentials: "omit"), 캐시·리다이렉트·리퍼러 없이, 실제로 받은 바이트를 세며 상한에서 끊는다.
//    형식은 응답 머리말이 아니라 받은 바이트의 서명으로 정한다.
//  * 취소: 모든 함수는 AbortSignal을 받는다. 호출부는 「참고 사진이 바뀌었을 때」와 「화면을 떠날 때」 그 신호를 끊어야 한다.
//    신호가 끊긴 뒤에는 번호를 기억에 넣지 않고, 받은 결과를 돌려주지 않으며({ kind: "aborted" }), 다음 요청을 시작하지 않는다.
//    ※ 생성 요청이 이미 나간 뒤에 끊어도 서버의 생성·과금은 멈추지 않는다 — 결과만 버려진다. 호출부는 생성 중에 사진을 바꾸지 못하게 막는 것이 맞다.
//  * 번호 기억은 메모리뿐이다(브라우저 저장소 0). 「역할 + 그 사진의 data URL」이 정확히 같을 때만 같은 번호를 다시 쓴다 — 사진이 바뀌면 열쇠가 달라 옛 번호가 붙지 않는다.
// 한계: 저장소가 브라우저의 교차 출처 요청을 허용하는지는 운영에서 확인하지 않았다(§24-10). 막혀 있으면 결과 받기가 실패하고 호출부는 「다시 불러오기」만 보여 주게 된다.
import { GENERATED_MAX_BYTES, isCanonicalUuid } from "./paths";

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;
export type ReferenceRole = "face" | "place" | "product";
export type ReferenceSlot = { role: ReferenceRole; dataUrl: string };
const ROLE_KIND: Record<ReferenceRole, string> = { face: "ref_face", place: "ref_place", product: "ref_product" };
const PHOTO_KEYS = ["personImage", "placeImage", "productImages", "lastResultImage"] as const;

export const UPLOAD_PATH = "/api/aif/assets";
export const GENERATIONS_PATH = "/api/aif/generations";
export const assetPath = (assetId: string) => `/api/aif/assets/${assetId}`;
export const RESULT_MAX_BYTES = GENERATED_MAX_BYTES;

export const CLIENT_MESSAGES = {
  MODE_MISMATCH: "화면이 최신 상태가 아닙니다. 새로고침한 뒤 다시 시도해 주세요.",
  UPLOAD_FAILED: "참고 사진을 올리지 못해 이미지를 생성하지 않았습니다. 다시 시도해 주세요.",
  UPLOAD_UNKNOWN: "참고 사진 보관을 확인하지 못해 이미지를 생성하지 않았습니다. 다시 시도해 주세요.",
  UPLOAD_NO_RESPONSE: "참고 사진을 올리는 중 응답을 받지 못해 이미지를 생성하지 않았습니다. 다시 시도해 주세요.",
  GENERATION_NO_RESPONSE: "생성 응답을 받지 못했습니다. 생성이 진행됐을 수 있으며 사용량이 차감됐을 수 있습니다. 바로 다시 시도하면 중복으로 차감될 수 있습니다.",
  GENERATION_FAILED: "이미지 생성 중 오류가 발생했습니다.",
  OMITTED: "이미지는 생성됐지만 파일이 너무 커서 지금 화면으로 전달할 수 없습니다. 생성은 이미 진행됐으며, 사용량이 차감됐을 수 있습니다.",
  RESULT_PENDING: "원본을 불러오지 못했습니다. [다시 불러오기]를 눌러 주세요.",
  CHECKING: "저장 여부를 확인하고 있습니다. 잠시 뒤 다시 확인해 주세요.",
  RELOAD_FAILED: "원본을 불러오지 못했습니다. 잠시 뒤 다시 시도해 주세요.",
  GONE: "원본을 더 이상 불러올 수 없습니다.",
} as const;

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const own = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);
/** 서버가 준 안내 문구(고정 한국어)만 쓴다. 문자열이 아니거나 너무 길면 기본 문구 */
const serverMessage = (body: Record<string, unknown> | null, fallback: string): string =>
  body && typeof body.error === "string" && body.error.length > 0 && body.error.length <= 300 ? body.error : fallback;
const codeOf = (body: Record<string, unknown> | null): string | null => (body && typeof body.code === "string" && body.code.length <= 64 ? body.code : null);
async function readJson(res: Response): Promise<Record<string, unknown> | null> {
  try {
    const v: unknown = await res.json();
    return isObject(v) ? v : null;
  } catch {
    return null;
  }
}

/** 지금 설정에서 올릴 참고 사진을 고정 순서(얼굴 → 장소 → 상품)로 모은다. 상품은 광고 모드일 때만(서버가 그 밖에는 거절한다).
 *  같은 상품 사진이 두 번 들어 있으면 한 번만 보낸다(서버는 같은 번호의 중복을 받지 않는다). 직전 결과(lastResultImage)는 다루지 않는다 — 보정은 기존 경로의 일이다. */
export function collectSlots(config: Record<string, unknown>): ReferenceSlot[] {
  const slots: ReferenceSlot[] = [];
  const isPhoto = (v: unknown): v is string => typeof v === "string" && v.startsWith("data:image/");
  if (isPhoto(config.personImage)) slots.push({ role: "face", dataUrl: config.personImage });
  if (isPhoto(config.placeImage)) slots.push({ role: "place", dataUrl: config.placeImage });
  if (config.isAdMode && Array.isArray(config.productImages)) {
    const seen = new Set<string>();
    for (const p of config.productImages.slice(0, 3)) {
      if (!isPhoto(p) || seen.has(p)) continue;
      seen.add(p);
      slots.push({ role: "product", dataUrl: p });
    }
  }
  return slots;
}

/** 생성 요청에 보낼 글자 설정: 사진 칸 4개를 뺀 얕은 사본. 원본을 바꾸지 않는다 */
export function stripPhotoFields(config: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(config)) if (!(PHOTO_KEYS as readonly string[]).includes(k)) out[k] = config[k];
  return out;
}

/** 올린 참고 사진의 번호 기억 — 메모리뿐. 열쇠는 「역할 + data URL 전체」 */
export class AssetIdMemory {
  private readonly map = new Map<string, string>();
  private static key(slot: ReferenceSlot): string { return `${slot.role}\n${slot.dataUrl}`; }
  get(slot: ReferenceSlot): string | undefined { return this.map.get(AssetIdMemory.key(slot)); }
  set(slot: ReferenceSlot, assetId: string): void { if (isCanonicalUuid(assetId)) this.map.set(AssetIdMemory.key(slot), assetId); }
  /** 그 번호를 가진 기억을 모두 지운다 */
  forget(assetIds: readonly string[]): void {
    const drop = new Set(assetIds);
    for (const [k, v] of this.map) if (drop.has(v)) this.map.delete(k);
  }
  clear(): void { this.map.clear(); }
  get size(): number { return this.map.size; }
}

// ───────────── 결과 받기(저장소 서명 주소) ─────────────
type SniffedType = "image/png" | "image/jpeg" | "image/webp";
function sniffType(b: Uint8Array): SniffedType | null {
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return "image/png";
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "image/webp";
  return null;
}

/** 우리 저장소의 생성 원본 서명 주소인가: https · 같은 출처 · /storage/v1/object/sign/aif-assets/<회원>/generated/<그 번호>.<확장자>?token=<JWT 글자만> */
export function isOurSignedUrl(value: unknown, storageOrigin: unknown, assetId: string): value is string {
  if (typeof value !== "string" || typeof storageOrigin !== "string" || !isCanonicalUuid(assetId)) return false;
  let origin: string;
  try {
    const u = new URL(storageOrigin);
    if (u.protocol !== "https:" || u.username || u.password) return false;
    origin = u.origin;
  } catch {
    return false;
  }
  const prefix = `${origin}/storage/v1/object/sign/aif-assets/`;
  if (!value.startsWith(prefix)) return false;
  const m = /^([0-9a-f-]{36})\/generated\/([0-9a-f-]{36})\.(png|jpg|webp)\?token=[A-Za-z0-9._~-]+$/.exec(value.slice(prefix.length));
  return !!m && isCanonicalUuid(m[1]) && m[2] === assetId;
}

export type BlobResult = { ok: true; blob: Blob } | { ok: false; reason: "invalid_url" | "network" | "http" | "too_large" | "empty" | "bad_type" | "aborted" };

/** 서명 주소에서 결과를 한 번 받는다. 주소를 돌려주지 않는다. 받는 동안 바이트를 세고 상한을 넘으면 끊는다(취소 완료를 기다리지 않는다) */
export async function fetchResultBlob(fetchFn: FetchLike, url: unknown, opts: { storageOrigin: string; assetId: string; signal: AbortSignal; maxBytes?: number }): Promise<BlobResult> {
  const maxBytes = opts.maxBytes ?? RESULT_MAX_BYTES;
  if (!isOurSignedUrl(url, opts.storageOrigin, opts.assetId)) return { ok: false, reason: "invalid_url" };
  if (opts.signal.aborted) return { ok: false, reason: "aborted" };
  const inner = new AbortController();
  const onOuterAbort = () => inner.abort();
  opts.signal.addEventListener("abort", onOuterAbort, { once: true });
  try {
    let res: Response;
    try {
      res = await fetchFn(url, { method: "GET", mode: "cors", credentials: "omit", cache: "no-store", redirect: "error", referrerPolicy: "no-referrer", signal: inner.signal });
    } catch {
      return { ok: false, reason: opts.signal.aborted ? "aborted" : "network" };
    }
    if (opts.signal.aborted) { inner.abort(); return { ok: false, reason: "aborted" }; }
    if (!res.ok) { inner.abort(); return { ok: false, reason: "http" }; }
    const declared = Number(res.headers.get("content-length"));
    if (Number.isFinite(declared) && declared > maxBytes) { inner.abort(); return { ok: false, reason: "too_large" }; }

    const chunks: Uint8Array[] = [];
    let size = 0;
    if (res.body && typeof res.body.getReader === "function") {
      const reader = res.body.getReader();
      const drop = () => { try { void reader.cancel().catch(() => undefined); } catch { /* 버린다 */ } };
      const aborted = new Promise<"aborted">((resolve) => inner.signal.addEventListener("abort", () => resolve("aborted"), { once: true }));
      try {
        for (;;) {
          const pending = reader.read();
          pending.catch(() => undefined);
          const step = await Promise.race([pending, aborted]);
          if (step === "aborted") { drop(); return { ok: false, reason: "aborted" }; }
          if (step.done) break;
          if (!(step.value instanceof Uint8Array)) { drop(); inner.abort(); return { ok: false, reason: "network" }; }
          size += step.value.byteLength;
          if (size > maxBytes) { drop(); inner.abort(); return { ok: false, reason: "too_large" }; }
          chunks.push(step.value);
        }
      } catch {
        return { ok: false, reason: opts.signal.aborted ? "aborted" : "network" };
      }
    } else {
      // 스트림을 주지 않는 환경: 통째로 받은 뒤 길이를 본다(머리말의 길이는 위에서 이미 봤다)
      let buf: ArrayBuffer;
      try { buf = await res.arrayBuffer(); } catch { return { ok: false, reason: opts.signal.aborted ? "aborted" : "network" }; }
      if (buf.byteLength > maxBytes) return { ok: false, reason: "too_large" };
      chunks.push(new Uint8Array(buf));
      size = buf.byteLength;
    }
    if (opts.signal.aborted) return { ok: false, reason: "aborted" };
    if (size === 0) return { ok: false, reason: "empty" };
    const head = chunks.length === 1 ? chunks[0] : (() => { const h = new Uint8Array(Math.min(size, 16)); let at = 0; for (const c of chunks) { if (at >= h.length) break; const part = c.subarray(0, h.length - at); h.set(part, at); at += part.length; } return h; })();
    const type = sniffType(head);
    if (!type) return { ok: false, reason: "bad_type" };
    return { ok: true, blob: new Blob(chunks as BlobPart[], { type }) };
  } finally {
    opts.signal.removeEventListener("abort", onOuterAbort);
  }
}

// ───────────── 올리기 ─────────────
export type UploadOutcome =
  | { kind: "uploaded"; assetId: string }
  | { kind: "upload_unknown"; message: string }
  | { kind: "upload_failed"; message: string; status: number | null; code: string | null }
  | { kind: "mode_mismatch"; message: string }
  | { kind: "aborted" };

/** 참고 사진 한 장을 올린다. 한 번만 보낸다 */
export async function uploadReference(fetchFn: FetchLike, slot: ReferenceSlot, signal: AbortSignal): Promise<UploadOutcome> {
  if (signal.aborted) return { kind: "aborted" };
  let res: Response;
  try {
    res = await fetchFn(UPLOAD_PATH, { method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store", body: JSON.stringify({ kind: ROLE_KIND[slot.role], image: slot.dataUrl }), signal });
  } catch {
    if (signal.aborted) return { kind: "aborted" };
    return { kind: "upload_failed", message: CLIENT_MESSAGES.UPLOAD_NO_RESPONSE, status: null, code: null };
  }
  const body = await readJson(res);
  if (signal.aborted) return { kind: "aborted" };
  const code = codeOf(body);
  if (res.status === 404 && code === "ASSET_FEATURE_OFF") return { kind: "mode_mismatch", message: CLIENT_MESSAGES.MODE_MISMATCH };
  if (res.status === 200 && body && body.assetSaved === true && isCanonicalUuid(body.assetId)) return { kind: "uploaded", assetId: body.assetId };
  // 불명: 번호가 와도 쓰지 않는다(생성에 넣으면 「아직 확인되지 않음」으로 거절된다)
  if (res.status === 200 && body && body.assetSaved === "unknown") return { kind: "upload_unknown", message: CLIENT_MESSAGES.UPLOAD_UNKNOWN };
  return { kind: "upload_failed", message: res.status >= 400 ? serverMessage(body, CLIENT_MESSAGES.UPLOAD_FAILED) : CLIENT_MESSAGES.UPLOAD_FAILED, status: res.status, code };
}

// ───────────── 생성 ─────────────
export type GenerationOutcome =
  /** 저장이 확인됐고 결과를 받았다 — blob은 화면 메모리 사본으로 쓴다 */
  | { kind: "asset"; assetId: string; blob: Blob }
  /** 저장은 확인됐지만 결과를 받지 못했다 — 「다시 불러오기」를 보여 준다 */
  | { kind: "asset_pending"; assetId: string; message: string }
  /** 저장이 불명·안 됨 — 응답에 실린 이미지를 지금처럼 보여 준다. 번호가 있어도 스스로 조회하지 않는다 */
  | { kind: "inline"; imageUrl: string; assetSaved: false | "unknown" | null; assetId: string | null; assetCode: string | null }
  /** 생성은 됐지만 응답에 이미지를 싣지 못했다(422) */
  | { kind: "omitted"; message: string; assetSaved: true | false | "unknown" | null; assetId: string | null }
  | { kind: "error"; message: string; status: number | null; code: string | null; needApiKey: boolean; stage: "upload" | "generation" }
  | { kind: "mode_mismatch"; message: string }
  | { kind: "aborted" };

export type FlowDeps = { fetch: FetchLike; storageOrigin: string; memory: AssetIdMemory };
/** 이 코드가 오면 그 요청에 쓴 번호의 기억을 지운다(그 사진은 다음에 다시 올려야 한다) */
const FORGET_CODES = new Set(["REFERENCE_NOT_FOUND", "REFERENCE_NOT_READY", "REFERENCE_UNAVAILABLE", "REFERENCE_MISMATCH", "REFERENCE_ROLE_INVALID"]);

/** 새 생성 한 번: 번호 없는 사진을 순서대로 올리고 → 번호로 생성을 요청하고 → 결과를 한 번 받는다. 어디서 멈추든 다시 하지 않는다 */
export async function runAssetGeneration(deps: FlowDeps, config: Record<string, unknown>, signal: AbortSignal): Promise<GenerationOutcome> {
  if (signal.aborted) return { kind: "aborted" };
  const slots = collectSlots(config);
  const references: { assetId: string; role: ReferenceRole }[] = [];
  for (const slot of slots) {
    let assetId = deps.memory.get(slot);
    if (!assetId) {
      const up = await uploadReference(deps.fetch, slot, signal);
      if (signal.aborted || up.kind === "aborted") return { kind: "aborted" };       // 끊긴 뒤에는 번호를 기억하지 않는다
      if (up.kind === "mode_mismatch") return up;
      if (up.kind === "upload_unknown") return { kind: "error", message: up.message, status: 200, code: "UPLOAD_UNKNOWN", needApiKey: false, stage: "upload" };
      if (up.kind === "upload_failed") return { kind: "error", message: up.message, status: up.status, code: up.code, needApiKey: false, stage: "upload" };
      assetId = up.assetId;
      deps.memory.set(slot, assetId);
    }
    references.push({ assetId, role: slot.role });
  }
  if (signal.aborted) return { kind: "aborted" };

  let res: Response;
  try {
    res = await deps.fetch(GENERATIONS_PATH, { method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store", body: JSON.stringify({ config: stripPhotoFields(config), references }), signal });
  } catch {
    if (signal.aborted) return { kind: "aborted" };
    return { kind: "error", message: CLIENT_MESSAGES.GENERATION_NO_RESPONSE, status: null, code: null, needApiKey: false, stage: "generation" };
  }
  const body = await readJson(res);
  if (signal.aborted) return { kind: "aborted" };
  const code = codeOf(body);
  if (res.status === 404 && code === "ASSET_FEATURE_OFF") return { kind: "mode_mismatch", message: CLIENT_MESSAGES.MODE_MISMATCH };
  if (!body) return { kind: "error", message: CLIENT_MESSAGES.GENERATION_NO_RESPONSE, status: res.status, code: null, needApiKey: false, stage: "generation" };

  const savedFlag = body.assetSaved === true || body.assetSaved === false || body.assetSaved === "unknown" ? body.assetSaved : null;
  const idOrNull = isCanonicalUuid(body.assetId) ? body.assetId : null;
  if (body.imageOmitted === true && code === "RESPONSE_TOO_LARGE") {
    return { kind: "omitted", message: serverMessage(body, CLIENT_MESSAGES.OMITTED), assetSaved: savedFlag, assetId: idOrNull };
  }
  if (res.status === 200) {
    if (savedFlag === true && idOrNull) {
      const got = await fetchResultBlob(deps.fetch, body.signedUrl, { storageOrigin: deps.storageOrigin, assetId: idOrNull, signal });
      if (signal.aborted || (!got.ok && got.reason === "aborted")) return { kind: "aborted" };
      if (got.ok) return { kind: "asset", assetId: idOrNull, blob: got.blob };
      return { kind: "asset_pending", assetId: idOrNull, message: CLIENT_MESSAGES.RESULT_PENDING };
    }
    if (savedFlag !== true && typeof body.imageUrl === "string" && body.imageUrl.startsWith("data:image/")) {
      return { kind: "inline", imageUrl: body.imageUrl, assetSaved: savedFlag, assetId: idOrNull, assetCode: typeof body.assetCode === "string" && body.assetCode.length <= 64 ? body.assetCode : null };
    }
    // 200인데 이미지도 번호도 읽을 수 없다 — 생성은 됐을 수 있다
    return { kind: "error", message: CLIENT_MESSAGES.GENERATION_NO_RESPONSE, status: 200, code, needApiKey: false, stage: "generation" };
  }
  if (code && FORGET_CODES.has(code)) deps.memory.forget(references.map((r) => r.assetId));
  return { kind: "error", message: serverMessage(body, CLIENT_MESSAGES.GENERATION_FAILED), status: res.status, code, needApiKey: own(body, "needApiKey") && body.needApiKey === true, stage: "generation" };
}

// ───────────── 다시 받기(사용자가 누를 때만) ─────────────
export type ReloadOutcome =
  | { kind: "asset"; assetId: string; blob: Blob }
  | { kind: "asset_pending"; assetId: string; message: string }
  | { kind: "checking"; assetId: string; message: string }
  | { kind: "gone"; message: string; code: string | null }
  | { kind: "mode_mismatch"; message: string }
  | { kind: "aborted" };

/** 번호로 결과를 한 번 다시 받는다: 조회 1회 + (준비됐으면) 결과 받기 1회. 스스로 되풀이하지 않는다 */
export async function reloadAsset(deps: Pick<FlowDeps, "fetch" | "storageOrigin">, assetId: string, signal: AbortSignal): Promise<ReloadOutcome> {
  if (signal.aborted) return { kind: "aborted" };
  if (!isCanonicalUuid(assetId)) return { kind: "gone", message: CLIENT_MESSAGES.GONE, code: null };
  let res: Response;
  try {
    res = await deps.fetch(assetPath(assetId), { method: "GET", cache: "no-store", signal });
  } catch {
    if (signal.aborted) return { kind: "aborted" };
    return { kind: "asset_pending", assetId, message: CLIENT_MESSAGES.RELOAD_FAILED };
  }
  const body = await readJson(res);
  if (signal.aborted) return { kind: "aborted" };
  const code = codeOf(body);
  if (res.status === 404 && code === "ASSET_FEATURE_OFF") return { kind: "mode_mismatch", message: CLIENT_MESSAGES.MODE_MISMATCH };
  if (res.status === 202) return { kind: "checking", assetId, message: CLIENT_MESSAGES.CHECKING };
  if (res.status === 404) return { kind: "gone", message: serverMessage(body, CLIENT_MESSAGES.GONE), code };
  if (res.status === 200 && body && body.id === assetId && body.state === "ready") {
    const got = await fetchResultBlob(deps.fetch, body.signedUrl, { storageOrigin: deps.storageOrigin, assetId, signal });
    if (signal.aborted || (!got.ok && got.reason === "aborted")) return { kind: "aborted" };
    if (got.ok) return { kind: "asset", assetId, blob: got.blob };
  }
  return { kind: "asset_pending", assetId, message: CLIENT_MESSAGES.RELOAD_FAILED };
}
