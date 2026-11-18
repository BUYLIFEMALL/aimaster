// POST /api/aif/generations 처리 — 참고 이미지를 자산 번호로 받아 생성한다 (W01-G3I, 2026-11-19, CC-SNS-01, Master msg_48484bbd586c).
// 계약: docs/analysis-ai-influencer-20261118/W00_BASELINE.md §23. 경로 별칭·Next 모듈을 쓰지 않는다(시험이 직접 불러온다). 실제 의존성은 라우트가 넘긴다.
//
// ★ 원본 저장 모드(AIF_ASSETS_MODE)가 "off"인 동안에는 권한 확인 뒤 404만 돌려준다 — 본인 키 조회·본문·저장소·생성에 닿지 않는다.
//   기존 생성 경로(/api/generate-image)는 이 파일과 무관하게 그대로 동작한다. 이 경로를 부르는 화면은 아직 없다.
//
// 순서(⑧까지 유료 호출 0):
//   ① 권한 → ② 모드(off면 404) → ③ 본인 키 → ④ 본문(256KiB) → ⑤ 요청 모양(config·references·role·개수·중복·사진 칸 금지)
//   → ⑥ 참고 자산 행(소유·상태·종류·경로·크기) → ⑦ 저장소에서 받아 길이·SHA-256·서명 대조 → ⑧ 저장 한도 사전 검사
//   → ⑨ 생성(유료, 정확히 1회) → ⑩ 원본 저장 → ⑪ 서명 주소 → ⑫ 응답
// 지키는 것
//  * 회원 id는 호출부가 확인한 세션에서만 온다. 참고 자산은 id와 회원 id 둘 다로 조회한 행만 쓴다(다른 회원 것·없는 번호는 같은 404).
//  * 참고 자산은 ready만 쓴다. 받은 바이트의 길이·SHA-256이 예약 때 서버가 기록한 값과 같고, 서명이 기록된 MIME과 같을 때만 쓴다.
//  * 저장소에서 받는 동안 실제로 받은 바이트를 세고, 기록된 크기를 넘는 순간 끊는다(큰 버퍼를 미리 잡지 않는다).
//  * 생성 전의 모든 입출력에는 시간 상한이 있다(아래 상수). 상한을 넘으면 생성하지 않는다. 기다리기를 그만둘 뿐이고 원격 요청의 취소를 보장하지는 않는다.
//  * 생성은 어떤 경우에도 최대 1회다. 실패·불명·서명 실패 어디서도 다시 부르지 않는다. 자동 조회·폴링도 없다.
//  * 저장이 확인되면 응답에는 자산 번호와 짧은 서명 주소만 싣는다(이미지 바이트 없음). 서명에 실패하면 번호만 싣는다 — 화면은 조회 경로로 다시 받는다.
//  * 저장이 불명·실패면 지금 경로처럼 응답에 이미지를 싣는다(응답 상한 보호 limitResponseBody 그대로).
//  * 응답·로그에는 코드와 고정 문구만. 경로·버킷·객체 id·해시·오류 원문을 싣지 않는다.
// 1차에서 받지 않는 것: role "base_result"(보정용 직전 결과). 직전 결과 원본은 20MiB까지일 수 있고 서버에는 줄일 수단이 없다 — 방법이 정해질 때까지 400.
//   (보정은 기존 경로가 지금처럼 처리한다. 화면을 이 경로로 바꾸는 단위에서도 기존 보정 흐름은 유지해야 한다.)
import { collectReferences, readJsonBodyLimited, sniffImageKind } from "../referenceImage";
import { limitResponseBody, NEED_KEY_MESSAGE } from "./generation";
import { ASSET_BUCKET, REF_MAX_BYTES, buildAssetPath, isCanonicalUuid, parseAssetPath } from "./paths";
import { SIGNED_URL_TTL_SECONDS, validSignedUrl } from "./read";
import { decodeGeneratedDataUrl, precheckGenerated, saveGeneratedOriginal, verifyReferenceBytes, type AssetStoreDeps, type SaveResult } from "./store";

export const GENERATIONS_BODY_MAX_BYTES = 256 * 1024;
/** 참고 자산 합계 상한(기존 경로의 TOTAL_MAX_BYTES와 같은 값 — 같은 입력 조건으로 맞춘다) */
export const GENERATIONS_REFERENCE_TOTAL_MAX_BYTES = 2 * 1024 * 1024;

// 시간 예산(밀리초). 함수 한도 300초 안에 들어야 한다: 참고 자산 읽기 20 + 사전 검사 10 + 생성 240(gemini.ts) + 저장 20 + 서명 5 = 295초.
// 권한·키·본문 읽기에는 따로 상한을 두지 않았다(짧은 호출이지만 보장은 아니다 — 한계로 남긴다).
export const GENERATION_CALL_BUDGET_MS = 240_000;    // gemini.ts의 timeoutMs와 같은 값(이 파일이 강제하지는 않는다)
export const REFERENCE_LOAD_BUDGET_MS = 20_000;      // 참고 자산 전체(행 조회 + 내려받기)의 합계 상한
export const REFERENCE_IO_TIMEOUT_MS = 8_000;        // 행 조회 한 번·내려받기 한 번의 상한
export const GENERATIONS_PRECHECK_TIMEOUT_MS = 10_000;
export const GENERATIONS_SAVE_TIMEOUT_MS = 20_000;
export const GENERATIONS_SIGN_TIMEOUT_MS = 5_000;
export const GENERATIONS_ROUTE_LIMIT_MS = 300_000;

export const REFERENCE_ROLES = ["face", "place", "product", "base_result"] as const;
export type ReferenceRole = (typeof REFERENCE_ROLES)[number];
const ROLE_KIND: Record<"face" | "place" | "product", string> = { face: "ref_face", place: "ref_place", product: "ref_product" };
const ROLE_MAX: Record<"face" | "place" | "product", number> = { face: 1, place: 1, product: 3 };
const PHOTO_KEYS = ["personImage", "placeImage", "productImages", "lastResultImage"] as const;

export type AccessResult = { allowed: true; user: { id: string } } | { allowed: false; error: string; status: number };
type Res = { data: unknown; error: unknown };
export type GenerationsAssetDeps = AssetStoreDeps & {
  /** 서명 주소가 우리 저장소 주소인지 대조할 값 */
  storageOrigin: string;
  /** 본인 행 한 건(id와 회원 id 둘 다 조건) — 열: id, user_id, kind, state, bucket, path, mime, bytes, sha256 */
  getAssetRow: (userId: string, assetId: string) => PromiseLike<Res>;
  /** 저장소 객체를 스트림으로 받는다. signal이 끊기면 받기를 멈춰야 한다 */
  downloadStream: (path: string, signal: AbortSignal) => PromiseLike<Res>;
  createSignedUrl: (path: string, expiresIn: number) => PromiseLike<Res>;
};
export type GenerationsDeps = {
  mode: "off" | "shadow";
  checkAccess: () => Promise<AccessResult>;
  getApiKey: (userId: string) => Promise<string | null>;
  generate: (apiKey: string, config: Record<string, unknown>) => Promise<string>;
  /** shadow일 때, 요청 모양 검사를 통과한 뒤에만 불린다 */
  getAssetDeps?: () => GenerationsAssetDeps;
  now?: () => number;
  limits?: { loadBudgetMs?: number; ioTimeoutMs?: number; precheckMs?: number; saveMs?: number; signMs?: number };
};
export type GenerationsResult = { status: number; body: Record<string, unknown>; headers: Record<string, string> };

export const GENERATIONS_MESSAGES = {
  BODY_TOO_LARGE: "요청이 너무 큽니다. 화면을 새로고침한 뒤 다시 시도해 주세요.",
  BODY_INVALID: "요청 형식이 올바르지 않습니다. 화면을 새로고침한 뒤 다시 시도해 주세요.",
  REFERENCE_INLINE_NOT_ALLOWED: "이 요청에는 사진을 직접 넣을 수 없습니다. 사진을 먼저 올린 뒤 다시 시도해 주세요.",
  REFERENCE_INVALID: "참고 사진 정보가 올바르지 않습니다. 사진을 다시 선택해 주세요.",
  REFERENCE_ROLE_INVALID: "참고 사진의 종류가 맞지 않습니다. 사진을 다시 선택해 주세요.",
  REFERENCE_ROLE_UNSUPPORTED: "이 방식으로는 아직 직전 결과를 바탕으로 한 보정을 할 수 없습니다.",
  REFERENCE_ROLE_NOT_APPLICABLE: "지금 설정에서는 쓰이지 않는 참고 사진이 들어 있습니다. 설정을 확인해 주세요.",
  REFERENCE_TOO_MANY: "참고 사진이 너무 많습니다.",
  REFERENCE_NOT_FOUND: "참고 사진을 찾을 수 없습니다. 사진을 다시 올려 주세요.",
  REFERENCE_NOT_READY: "참고 사진의 보관이 아직 확인되지 않았습니다. 잠시 뒤 다시 시도해 주세요.",
  REFERENCE_UNAVAILABLE: "참고 사진을 더 이상 쓸 수 없습니다. 사진을 다시 올려 주세요.",
  REFERENCE_TOO_LARGE: "참고 사진이 너무 큽니다. 한 장 1MB·합계 2MB 이하로 올려 주세요.",
  REFERENCE_MISMATCH: "참고 사진이 보관된 내용과 달라 생성하지 않았습니다. 사진을 다시 올려 주세요.",
  REFERENCE_READ_FAILED: "참고 사진을 불러오지 못해 생성하지 않았습니다. 잠시 뒤 다시 시도해 주세요.",
  ASSET_UNAVAILABLE: "지금은 생성할 수 없습니다. 잠시 뒤 다시 시도해 주세요.",
  STORAGE_LIMIT: "저장공간이 부족해 이미지를 생성하지 않았습니다. 저장공간을 정리하거나 용량을 늘린 뒤 다시 시도해 주세요.",
  ASSET_PRECHECK_UNAVAILABLE: "저장공간을 확인하지 못해 이미지를 생성하지 않았습니다. 잠시 뒤 다시 시도해 주세요.",
  GENERATION_FAILED: "이미지 생성 중 오류가 발생했습니다.",
} as const;
type Code = keyof typeof GENERATIONS_MESSAGES;

const NO_STORE = { "Cache-Control": "no-store" };
const out = (status: number, body: Record<string, unknown>): GenerationsResult => ({ status, body, headers: { ...NO_STORE } });
const fail = (status: number, code: Code) => out(status, { error: GENERATIONS_MESSAGES[code], code });
const own = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

const TIMED_OUT = Symbol("timed-out");
/** 유한 대기: ms 안에 끝나지 않으면 TIMED_OUT. 던지면 null. 늦게 끝난 결과는 버린다 */
function bounded<T>(run: () => PromiseLike<T>, ms: number): Promise<T | null | typeof TIMED_OUT> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v: T | null | typeof TIMED_OUT) => { if (!done) { done = true; clearTimeout(timer); resolve(v); } };
    const timer = setTimeout(() => finish(TIMED_OUT), Math.max(0, ms));
    try {
      Promise.resolve(run()).then((v) => finish(v), () => finish(null));
    } catch {
      finish(null);
    }
  });
}

function toBase64(bytes: Uint8Array): string {
  let bin = "";
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) bin += String.fromCharCode(...bytes.subarray(i, i + step));
  return globalThis.btoa(bin);
}

type Ref = { assetId: string; role: "face" | "place" | "product" };
type Loaded = Ref & { mime: string; bytes: Uint8Array };

/** 요청의 references를 검사해 고정 순서(face → place → product[요청 순])로 돌려준다 */
function parseReferences(value: unknown, config: Record<string, unknown>): { ok: true; refs: Ref[] } | { ok: false; status: number; code: Code } {
  if (value === undefined) return { ok: true, refs: [] };
  if (!Array.isArray(value)) return { ok: false, status: 400, code: "REFERENCE_INVALID" };
  if (value.length > 8) return { ok: false, status: 400, code: "REFERENCE_TOO_MANY" };   // 모양 검사 전에 큰 배열을 돌지 않는다
  const seen = new Set<string>();
  const by: Record<"face" | "place" | "product", Ref[]> = { face: [], place: [], product: [] };
  for (const item of value) {
    if (!isObject(item) || !isCanonicalUuid(item.assetId) || typeof item.role !== "string") return { ok: false, status: 400, code: "REFERENCE_INVALID" };
    if (item.role === "base_result") return { ok: false, status: 400, code: "REFERENCE_ROLE_UNSUPPORTED" };
    if (item.role !== "face" && item.role !== "place" && item.role !== "product") return { ok: false, status: 400, code: "REFERENCE_ROLE_INVALID" };
    if (seen.has(item.assetId)) return { ok: false, status: 400, code: "REFERENCE_INVALID" };   // 같은 자산을 두 번 쓰지 않는다
    seen.add(item.assetId);
    by[item.role].push({ assetId: item.assetId, role: item.role });
  }
  for (const role of ["face", "place", "product"] as const) if (by[role].length > ROLE_MAX[role]) return { ok: false, status: 400, code: "REFERENCE_TOO_MANY" };
  // 지금 설정에서 쓰이지 않는 역할을 조용히 버리지 않는다(번호로 명시해 보낸 사진이 반영됐다고 오해하지 않게)
  if (by.product.length > 0 && !config.isAdMode) return { ok: false, status: 400, code: "REFERENCE_ROLE_NOT_APPLICABLE" };
  return { ok: true, refs: [...by.face, ...by.place, ...by.product] };
}

/** 스트림을 상한까지만 받는다. 상한을 넘는 순간 끊고 "too_large". 읽기 오류는 null */
async function readStreamLimited(stream: unknown, maxBytes: number): Promise<Uint8Array | "too_large" | null> {
  if (!stream || typeof (stream as { getReader?: unknown }).getReader !== "function") return null;
  let reader: ReadableStreamDefaultReader<Uint8Array>;
  try {
    reader = (stream as ReadableStream<Uint8Array>).getReader();
  } catch {
    return null;
  }
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!(value instanceof Uint8Array)) { await reader.cancel().catch(() => undefined); return null; }
      size += value.byteLength;
      if (size > maxBytes) { await reader.cancel().catch(() => undefined); return "too_large"; }
      chunks.push(value);
    }
  } catch {
    return null;
  }
  const all = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) { all.set(c, at); at += c.byteLength; }
  return all;
}

export async function handlePostGeneration(req: Request, deps: GenerationsDeps): Promise<GenerationsResult> {
  const now = deps.now ?? (() => Date.now());
  const L = {
    loadBudgetMs: deps.limits?.loadBudgetMs ?? REFERENCE_LOAD_BUDGET_MS,
    ioTimeoutMs: deps.limits?.ioTimeoutMs ?? REFERENCE_IO_TIMEOUT_MS,
    precheckMs: deps.limits?.precheckMs ?? GENERATIONS_PRECHECK_TIMEOUT_MS,
    saveMs: deps.limits?.saveMs ?? GENERATIONS_SAVE_TIMEOUT_MS,
    signMs: deps.limits?.signMs ?? GENERATIONS_SIGN_TIMEOUT_MS,
  };

  // ① 권한 → ② 모드. off면 본인 키·본문·저장소·생성에 닿지 않는다
  const auth = await deps.checkAccess();
  if (!auth.allowed) return out(auth.status, { error: auth.error });
  const userId = auth.user.id;
  if (deps.mode !== "shadow") return out(404, { error: "자료를 찾을 수 없습니다.", code: "ASSET_FEATURE_OFF" });

  // ③ 본인 키(회원 본인 것만 — 없으면 등록 안내, 다른 키로 대신하지 않는다)
  const apiKey = await deps.getApiKey(userId);
  if (!apiKey) return out(400, { error: NEED_KEY_MESSAGE, needApiKey: true });

  // ④ 본문 ⑤ 요청 모양
  const body = await readJsonBodyLimited(req, GENERATIONS_BODY_MAX_BYTES);
  if (!body.ok) return fail(body.status, body.code);
  if (!isObject(body.value) || !isObject(body.value.config)) return fail(400, "BODY_INVALID");
  const config = body.value.config;
  for (const k of PHOTO_KEYS) if (own(config, k)) return fail(400, "REFERENCE_INLINE_NOT_ALLOWED");
  const parsed = parseReferences(body.value.references, config);
  if (!parsed.ok) return fail(parsed.status, parsed.code);
  if (!isCanonicalUuid(userId)) return fail(503, "ASSET_UNAVAILABLE");

  let assets: GenerationsAssetDeps;
  try {
    if (!deps.getAssetDeps) return fail(503, "ASSET_UNAVAILABLE");
    assets = deps.getAssetDeps();
  } catch {
    return fail(503, "ASSET_UNAVAILABLE");
  }

  // ⑥ 참고 자산 행 — 전부 먼저 확인한다(하나라도 어긋나면 내려받기 0)
  const loadDeadline = now() + L.loadBudgetMs;
  const remaining = () => Math.min(L.ioTimeoutMs, loadDeadline - now());
  const rows: { ref: Ref; path: string; mime: string; bytes: number; sha256: string }[] = [];
  let total = 0;
  for (const ref of parsed.refs) {
    if (remaining() <= 0) return fail(503, "REFERENCE_READ_FAILED");
    const r = await bounded(() => assets.getAssetRow(userId, ref.assetId), remaining());
    if (r === TIMED_OUT || r === null || !isObject(r) || r.error) return fail(503, "REFERENCE_READ_FAILED");
    if (r.data === null) return fail(404, "REFERENCE_NOT_FOUND");            // 다른 회원 것·없는 번호 — 같은 응답
    if (!isObject(r.data)) return fail(503, "REFERENCE_READ_FAILED");
    const row = r.data;
    if (row.id !== ref.assetId || row.user_id !== userId) return fail(404, "REFERENCE_NOT_FOUND");
    if (row.state === "reserved" || row.state === "unknown") return fail(409, "REFERENCE_NOT_READY");
    if (row.state === "expired" || row.state === "missing" || row.state === "failed") return fail(410, "REFERENCE_UNAVAILABLE");
    if (row.state !== "ready") return fail(503, "REFERENCE_READ_FAILED");
    if (row.kind !== ROLE_KIND[ref.role]) return fail(400, "REFERENCE_ROLE_INVALID");
    const p = parseAssetPath(row.path);
    if (row.bucket !== ASSET_BUCKET || !p || p.userId !== userId || p.assetId !== ref.assetId || p.kind !== row.kind) return fail(503, "REFERENCE_READ_FAILED");
    if (typeof row.mime !== "string" || typeof row.sha256 !== "string" || !/^[0-9a-f]{64}$/.test(row.sha256)) return fail(503, "REFERENCE_READ_FAILED");
    if (typeof row.bytes !== "number" || !Number.isInteger(row.bytes) || row.bytes <= 0) return fail(503, "REFERENCE_READ_FAILED");
    if (row.bytes > REF_MAX_BYTES) return fail(413, "REFERENCE_TOO_LARGE");
    total += row.bytes;
    if (total > GENERATIONS_REFERENCE_TOTAL_MAX_BYTES) return fail(413, "REFERENCE_TOO_LARGE");
    rows.push({ ref, path: row.path as string, mime: row.mime, bytes: row.bytes, sha256: row.sha256 });
  }

  // ⑦ 저장소에서 받아 대조 — 받는 동안 실제 바이트를 세고, 기록된 크기를 넘으면 끊는다
  const loaded: Loaded[] = [];
  for (const row of rows) {
    const wait = remaining();
    if (wait <= 0) return fail(503, "REFERENCE_READ_FAILED");
    const abort = new AbortController();
    const got = await bounded(async () => {
      const r = await assets.downloadStream(row.path, abort.signal);
      if (!isObject(r) || r.error) return null;
      return readStreamLimited(r.data, row.bytes);
    }, wait);
    if (got === TIMED_OUT) { abort.abort(); return fail(503, "REFERENCE_READ_FAILED"); }
    if (got === null) return fail(503, "REFERENCE_READ_FAILED");
    if (got === "too_large") { abort.abort(); return fail(502, "REFERENCE_MISMATCH"); }      // 기록된 크기보다 크다 = 기록된 그 파일이 아니다
    if (got.length !== row.bytes) return fail(502, "REFERENCE_MISMATCH");
    const v = await verifyReferenceBytes(got, row.mime);                                      // 서명이 기록된 MIME과 같은지 + 서버 SHA-256
    if (!v.ok || v.value.sha256 !== row.sha256) return fail(502, "REFERENCE_MISMATCH");
    loaded.push({ ...row.ref, mime: row.mime, bytes: got });
  }

  // 공급자에 넘길 설정: 받은 바이트를 기존 칸에 넣는다(순서·조건은 기존 collectReferences가 정한다). 기존 생성 함수를 그대로 쓴다.
  const genConfig: Record<string, unknown> = { ...config };
  const dataUrl = (l: Loaded) => `data:${l.mime};base64,${toBase64(l.bytes)}`;
  const face = loaded.find((l) => l.role === "face");
  const place = loaded.find((l) => l.role === "place");
  const products = loaded.filter((l) => l.role === "product");
  if (face) genConfig.personImage = dataUrl(face);
  if (place) genConfig.placeImage = dataUrl(place);
  if (products.length) genConfig.productImages = products.map(dataUrl);
  const check = collectReferences(genConfig);
  if (!check.ok || check.items.length !== loaded.length) return fail(502, "REFERENCE_MISMATCH");   // 붙을 사진 수가 받은 수와 다르면 생성하지 않는다

  // ⑧ 저장 한도 사전 검사 — 저장 가능 여부를 모르는 채 과금되는 생성을 시작하지 않는다
  const pre = await bounded(() => precheckGenerated(assets, userId, config.quality), L.precheckMs);
  if (pre === TIMED_OUT || pre === null || pre.status === "unavailable") return fail(503, "ASSET_PRECHECK_UNAVAILABLE");
  if (pre.status === "denied") return fail(507, "STORAGE_LIMIT");

  // ⑨ 생성 — 정확히 1회. 실패해도 다시 부르지 않는다
  let imageUrl: string;
  try {
    imageUrl = await deps.generate(apiKey, genConfig);
  } catch (err) {
    const e = err as { code?: unknown; message?: unknown };
    console.error("Generations API Error:", typeof e?.code === "string" ? e.code : "");
    return out(500, { error: (typeof e?.message === "string" && e.message) || GENERATIONS_MESSAGES.GENERATION_FAILED });
  }

  // ⑩ 원본 저장(기존 흐름). 시간 상한을 넘으면 어디까지 됐는지 모르므로 불명
  const saved = await bounded<SaveResult>(async () => {
    const bytes = decodeGeneratedDataUrl(imageUrl);
    if (!bytes) return { assetSaved: false, code: "ASSET_FORMAT" };
    return saveGeneratedOriginal(assets, { userId, bytes });
  }, L.saveMs);
  const save: SaveResult | { assetSaved: "unknown"; code: "SAVE_TIMEOUT"; assetId?: undefined } =
    saved === TIMED_OUT || saved === null ? { assetSaved: "unknown", code: "SAVE_TIMEOUT" } : saved;

  // ⑪⑫ 저장이 확인됐으면 이미지 바이트 없이 번호와 짧은 서명 주소만
  if (save.assetSaved === true) {
    const assetId = save.assetId;
    // 저장 함수는 경로를 돌려주지 않는다. 서명할 경로는 계약(회원/generated/자산.확장자)으로 다시 만든다 —
    // 확장자는 저장 때와 같은 판정(바이트의 실제 서명)으로 얻는다. 얻지 못하면 서명하지 않고 번호만 돌려준다.
    let signedUrl: string | null = null;
    const path = generatedPath(userId, assetId, imageUrl);
    if (path) {
      const s = await bounded(() => assets.createSignedUrl(path, SIGNED_URL_TTL_SECONDS), L.signMs);
      if (s !== TIMED_OUT && s !== null && isObject(s) && !s.error) {
        signedUrl = validSignedUrl((s.data as { signedUrl?: unknown } | null)?.signedUrl, assets.storageOrigin, ASSET_BUCKET, path);
      }
    }
    return out(200, { assetId, assetSaved: true, signedUrl, ...(signedUrl ? { expiresIn: SIGNED_URL_TTL_SECONDS } : {}) });
  }

  // 저장 불명·실패: 지금 경로처럼 응답에 이미지를 싣는다(응답 상한 보호 포함). 생성은 다시 하지 않는다
  const fallback = limitResponseBody({
    status: 200,
    body: {
      success: true,
      imageUrl,
      assetSaved: save.assetSaved,
      ...(save.assetId ? { assetId: save.assetId } : {}),
      ...(save.code ? { assetCode: save.code } : {}),
    },
  });
  return out(fallback.status, fallback.body);
}

/** 방금 저장한 생성 원본의 경로. 저장 모듈(verifyGeneratedBytes)과 같은 기준 — 바이트의 실제 서명 — 으로 확장자를 정한다. 정할 수 없으면 null */
function generatedPath(userId: string, assetId: string, imageUrl: string): string | null {
  const bytes = decodeGeneratedDataUrl(imageUrl);
  const kind = bytes ? sniffImageKind(bytes) : null;
  const ext = kind === "png" ? "png" : kind === "jpeg" ? "jpg" : kind === "webp" ? "webp" : null;
  if (!ext) return null;
  try {
    return buildAssetPath({ userId, kind: "generated", assetId, ext });
  } catch {
    return null;
  }
}
