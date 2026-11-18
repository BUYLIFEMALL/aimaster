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
//  * 시간(W01-G3T): 요청이 시작된 순간부터 단조 시계로 총 마감(300초)을 잰다. 권한·키·본문을 포함한 모든 단계에 유한한 대기가 있고,
//    유료 호출 직전에 「생성 240초 + 여유 + 저장 + 서명 + 응답 여유」가 남지 않았으면 생성하지 않는다. 생성 뒤 단계는 남은 시간 안에서만 기다린다.
//    기다리기를 그만둘 뿐이고 원격 요청의 취소를 보장하지는 않는다(본문·내려받기는 중단 신호를 보내고 reader.cancel의 완료를 기다리지 않는다).
//  * 생성 오류는 허용된 코드만 고정 문구로 바꿔 응답·로그에 쓴다. 공급자가 준 원문·임의 코드는 싣지 않는다.
//  * 생성은 어떤 경우에도 최대 1회다. 실패·불명·서명 실패 어디서도 다시 부르지 않는다. 자동 조회·폴링도 없다.
//  * 저장이 확인되면 응답에는 자산 번호와 짧은 서명 주소만 싣는다(이미지 바이트 없음). 서명에 실패하면 번호만 싣는다 — 화면은 조회 경로로 다시 받는다.
//  * 저장이 불명·실패면 지금 경로처럼 응답에 이미지를 싣는다(응답 상한 보호 limitResponseBody 그대로).
//  * 응답·로그에는 코드와 고정 문구만. 경로·버킷·객체 id·해시·오류 원문을 싣지 않는다.
// 1차에서 받지 않는 것: role "base_result"(보정용 직전 결과). 직전 결과 원본은 20MiB까지일 수 있고 서버에는 줄일 수단이 없다 — 방법이 정해질 때까지 400.
//   (보정은 기존 경로가 지금처럼 처리한다. 화면을 이 경로로 바꾸는 단위에서도 기존 보정 흐름은 유지해야 한다.)
import { collectReferences, readJsonBodyLimited, sniffImageKind } from "../referenceImage";
import { assetsEnabled, limitResponseBody, NEED_KEY_MESSAGE, type AssetsMode } from "./generation";
import { ASSET_BUCKET, REF_MAX_BYTES, buildAssetPath, isCanonicalUuid, parseAssetPath } from "./paths";
import { SIGNED_URL_TTL_SECONDS, validSignedUrl } from "./read";
import { decodeGeneratedDataUrl, precheckGenerated, saveGeneratedOriginal, verifyReferenceBytes, type AssetStoreDeps, type SaveResult } from "./store";

export const GENERATIONS_BODY_MAX_BYTES = 256 * 1024;
/** 참고 자산 합계 상한(기존 경로의 TOTAL_MAX_BYTES와 같은 값 — 같은 입력 조건으로 맞춘다) */
export const GENERATIONS_REFERENCE_TOTAL_MAX_BYTES = 2 * 1024 * 1024;

// 시간 예산(밀리초). 총 마감은 요청 시작 + 300초(함수 한도).
// 유료 호출 직전 관문: 생성 240 + 여유 2 + 저장 20 + 서명 5 + 응답 여유 3 = 270초가 남아 있어야 생성한다 → 생성 전 단계 전체가 쓸 수 있는 시간은 30초.
// 생성 전 단계의 개별 상한(권한 5·키 5·본문 10·참고 자산 20·사전 검사 10)은 합이 30초를 넘지만, 각 단계는 「관문까지 남은 시간」으로도 잘리고 관문이 최종 판정한다.
export const GENERATION_CALL_BUDGET_MS = 240_000;    // gemini.ts의 timeoutMs와 같은 값
export const GENERATION_WAIT_GRACE_MS = 2_000;       // 생성 함수가 자기 상한에서 돌아오기를 조금 더 기다리는 여유
export const GENERATIONS_RESPONSE_MARGIN_MS = 3_000; // 응답을 만들어 보내는 여유
export const GENERATIONS_ACCESS_TIMEOUT_MS = 5_000;
export const GENERATIONS_KEY_TIMEOUT_MS = 5_000;
export const GENERATIONS_BODY_TIMEOUT_MS = 10_000;
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
  mode: AssetsMode;
  checkAccess: () => Promise<AccessResult>;
  getApiKey: (userId: string) => Promise<string | null>;
  generate: (apiKey: string, config: Record<string, unknown>) => Promise<string>;
  /** shadow일 때, 요청 모양 검사를 통과한 뒤에만 불린다 */
  getAssetDeps?: () => GenerationsAssetDeps;
  /** 단조 시계(밀리초). 기본은 performance.now() — 벽시계 변경의 영향을 받지 않는다 */
  now?: () => number;
  limits?: {
    totalMs?: number; accessMs?: number; keyMs?: number; bodyMs?: number; loadBudgetMs?: number; ioTimeoutMs?: number; precheckMs?: number;
    generationMs?: number; graceMs?: number; saveMs?: number; signMs?: number; marginMs?: number;
  };
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
  GENERATION_FAILED: "이미지 생성 중 오류가 발생했습니다. 잠시 뒤 다시 시도해 주세요.",
  GENERATION_TIMEOUT: "이미지 생성 응답을 제때 받지 못했습니다. 생성이 진행됐을 수 있으며 사용량이 차감됐을 수 있습니다. 바로 다시 시도하면 중복으로 차감될 수 있습니다.",
  TIME_BUDGET_EXCEEDED: "요청을 처리하는 데 시간이 너무 걸려 이미지를 생성하지 않았습니다. 잠시 뒤 다시 시도해 주세요.",
  BODY_TIMEOUT: "요청을 제때 받지 못해 이미지를 생성하지 않았습니다. 다시 시도해 주세요.",
} as const;

/** 생성 함수(geminiImage)의 오류 코드 가운데 응답·로그에 써도 되는 것과 그 고정 문구. 여기에 없는 코드·원문은 쓰지 않는다 */
export const PROVIDER_ERROR_MESSAGES: Record<string, string> = {
  QUOTA_EXCEEDED: "본인 Gemini API 사용 한도 또는 결제 설정에 걸렸습니다. Google AI Studio에서 확인해 주세요.",
  RATE_LIMITED: "이미지 생성 요청이 짧은 시간에 너무 많았습니다. 1~2분 뒤 다시 시도해 주세요.",
  INVALID_KEY: "Gemini API 키가 올바르지 않습니다. 설정에서 본인 키를 다시 확인해 주세요.",
  API_NOT_ENABLED: "본인 Google Cloud 프로젝트에서 Gemini API 사용 설정을 확인해 주세요.",
  PERMISSION_DENIED: "본인 Google Cloud 프로젝트에서 Gemini API 사용 권한을 확인해 주세요.",
  MODEL_NOT_FOUND: "이미지 생성 요청을 처리하지 못했습니다. 잠시 뒤 다시 시도해 주세요.",
  BAD_REQUEST: "이미지 생성 요청을 처리하지 못했습니다. 설정을 바꿔 다시 시도해 주세요.",
  SAFETY_BLOCKED: "안전 정책에 따라 이미지가 생성되지 않았습니다. 설정이나 문구를 바꿔 주세요.",
  NO_IMAGE: "이미지가 만들어지지 않았습니다. 설정을 바꿔 다시 시도해 주세요.",
  TIMEOUT: "이미지 생성 응답을 제때 받지 못했습니다. 생성이 진행됐을 수 있으며 사용량이 차감됐을 수 있습니다. 바로 다시 시도하면 중복으로 차감될 수 있습니다.",
  NETWORK: "이미지 생성 서버에 연결하지 못했습니다. 잠시 뒤 다시 시도해 주세요.",
  SERVER_ERROR: "이미지 생성 서버에 문제가 있습니다. 잠시 뒤 다시 시도해 주세요.",
};
/** 던져진 값에서 허용된 코드만 고른다. 자기 속성인 문자열 code가 허용 목록에 있을 때만 — 그 밖은 "UNKNOWN" */
export function providerErrorCode(err: unknown): string {
  if (typeof err !== "object" || err === null) return "UNKNOWN";
  if (!Object.prototype.hasOwnProperty.call(err, "code")) return "UNKNOWN";          // 상속된 code는 쓰지 않는다
  const code = (err as { code?: unknown }).code;
  return typeof code === "string" && Object.prototype.hasOwnProperty.call(PROVIDER_ERROR_MESSAGES, code) ? code : "UNKNOWN";
}
type Code = keyof typeof GENERATIONS_MESSAGES;

const NO_STORE = { "Cache-Control": "no-store" };
const out = (status: number, body: Record<string, unknown>): GenerationsResult => ({ status, body, headers: { ...NO_STORE } });
const fail = (status: number, code: Code) => out(status, { error: GENERATIONS_MESSAGES[code], code });
const own = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

type Bounded<T> = { kind: "ok"; value: T } | { kind: "timeout" } | { kind: "error"; error: unknown };
/** 유한 대기. ms 안에 끝나지 않으면 timeout(그때 onTimeout을 부른다), 던지면 error. ms가 0 이하면 실행하지 않고 timeout.
 *  늦게 끝난 결과·늦게 온 오류는 버린다(처리되지 않은 거부가 남지 않는다). */
function bounded<T>(run: () => PromiseLike<T> | T, ms: number, onTimeout?: () => void): Promise<Bounded<T>> {
  if (!(ms > 0)) return Promise.resolve({ kind: "timeout" });
  return new Promise((resolve) => {
    let done = false;
    const finish = (v: Bounded<T>) => { if (!done) { done = true; clearTimeout(timer); resolve(v); } };
    const timer = setTimeout(() => {
      if (done) return;
      finish({ kind: "timeout" });
      try { onTimeout?.(); } catch { /* 중단 콜백의 오류는 버린다 */ }
    }, ms);
    try {
      Promise.resolve(run()).then((value) => finish({ kind: "ok", value }), (error) => finish({ kind: "error", error }));
    } catch (error) {
      finish({ kind: "error", error });
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

/** 스트림을 상한까지만 받는다. 상한을 넘는 순간 끊고 "too_large". 읽기 오류·중단은 null.
 *  끊을 때 reader.cancel()의 완료를 기다리지 않는다(멈춘 cancel이 응답을 붙잡지 않게) — 그 오류는 소비한다. */
async function readStreamLimited(stream: unknown, maxBytes: number, signal: AbortSignal): Promise<Uint8Array | "too_large" | null> {
  if (!stream || typeof (stream as { getReader?: unknown }).getReader !== "function") return null;
  let reader: ReadableStreamDefaultReader<Uint8Array>;
  try {
    reader = (stream as ReadableStream<Uint8Array>).getReader();
  } catch {
    return null;
  }
  const drop = () => { try { void reader.cancel().catch(() => undefined); } catch { /* 버린다 */ } };
  if (signal.aborted) { drop(); return null; }                 // 늦게 도착한 스트림 — 읽지 않고 버린다
  const aborted = new Promise<"aborted">((resolve) => signal.addEventListener("abort", () => resolve("aborted"), { once: true }));
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const pending = reader.read();
      pending.catch(() => undefined);                           // 빠져나온 뒤 늦게 오는 오류를 소비한다
      const step = await Promise.race([pending, aborted]);
      if (step === "aborted") { drop(); return null; }
      const { done, value } = step;
      if (done) break;
      if (!(value instanceof Uint8Array)) { drop(); return null; }
      size += value.byteLength;
      if (size > maxBytes) { drop(); return "too_large"; }
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
  const now = deps.now ?? (() => performance.now());
  const startedAt = now();                                      // 요청 시작 — 이후 모든 마감의 기준
  const L = {
    totalMs: deps.limits?.totalMs ?? GENERATIONS_ROUTE_LIMIT_MS,
    accessMs: deps.limits?.accessMs ?? GENERATIONS_ACCESS_TIMEOUT_MS,
    keyMs: deps.limits?.keyMs ?? GENERATIONS_KEY_TIMEOUT_MS,
    bodyMs: deps.limits?.bodyMs ?? GENERATIONS_BODY_TIMEOUT_MS,
    loadBudgetMs: deps.limits?.loadBudgetMs ?? REFERENCE_LOAD_BUDGET_MS,
    ioTimeoutMs: deps.limits?.ioTimeoutMs ?? REFERENCE_IO_TIMEOUT_MS,
    precheckMs: deps.limits?.precheckMs ?? GENERATIONS_PRECHECK_TIMEOUT_MS,
    generationMs: deps.limits?.generationMs ?? GENERATION_CALL_BUDGET_MS,
    graceMs: deps.limits?.graceMs ?? GENERATION_WAIT_GRACE_MS,
    saveMs: deps.limits?.saveMs ?? GENERATIONS_SAVE_TIMEOUT_MS,
    signMs: deps.limits?.signMs ?? GENERATIONS_SIGN_TIMEOUT_MS,
    marginMs: deps.limits?.marginMs ?? GENERATIONS_RESPONSE_MARGIN_MS,
  };
  /** 총 마감까지 남은 시간 */
  const left = () => startedAt + L.totalMs - now();
  /** 유료 호출에 필요한 시간(생성 + 여유 + 저장 + 서명 + 응답 여유) */
  const needForGeneration = L.generationMs + L.graceMs + L.saveMs + L.signMs + L.marginMs;
  /** 생성 전 단계가 쓸 수 있는 시간: 관문까지 남은 시간과 단계 상한 가운데 작은 값 */
  const pre = (stageMs: number) => Math.min(stageMs, left() - needForGeneration);

  // ① 권한 → ② 모드. off면 본인 키·본문·저장소·생성에 닿지 않는다
  const access = await bounded(() => deps.checkAccess(), pre(L.accessMs));
  if (access.kind === "timeout") return fail(503, "TIME_BUDGET_EXCEEDED");
  if (access.kind === "error" || !isObject(access.value)) return fail(503, "ASSET_UNAVAILABLE");
  const auth = access.value;
  if (!auth.allowed) return out(auth.status, { error: auth.error });
  const userId = auth.user.id;
  if (!assetsEnabled(deps.mode)) return out(404, { error: "자료를 찾을 수 없습니다.", code: "ASSET_FEATURE_OFF" });

  // ③ 본인 키(회원 본인 것만 — 없으면 등록 안내, 다른 키로 대신하지 않는다)
  const key = await bounded(() => deps.getApiKey(userId), pre(L.keyMs));
  if (key.kind === "timeout") return fail(503, "TIME_BUDGET_EXCEEDED");
  if (key.kind === "error") return fail(503, "ASSET_UNAVAILABLE");
  const apiKey = key.value;
  if (!apiKey) return out(400, { error: NEED_KEY_MESSAGE, needApiKey: true });

  // ④ 본문 — 상한을 넘거나 시간이 지나면 즉시 응답을 정하고 읽기를 끊는다(취소 완료를 기다리지 않는다)
  const bodyAbort = new AbortController();
  const read = await bounded(() => readJsonBodyLimited(req, GENERATIONS_BODY_MAX_BYTES, { signal: bodyAbort.signal }), pre(L.bodyMs), () => bodyAbort.abort());
  if (read.kind === "timeout") { bodyAbort.abort(); return fail(408, "BODY_TIMEOUT"); }
  if (read.kind === "error") return fail(400, "BODY_INVALID");
  const body = read.value;
  if (!body.ok) return fail(body.status, body.code);

  // ⑤ 요청 모양
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
  const remaining = () => Math.min(pre(L.ioTimeoutMs), loadDeadline - now());
  const rows: { ref: Ref; path: string; mime: string; bytes: number; sha256: string }[] = [];
  let total = 0;
  for (const ref of parsed.refs) {
    const got = await bounded(() => assets.getAssetRow(userId, ref.assetId), remaining());
    if (got.kind !== "ok") return fail(503, "REFERENCE_READ_FAILED");
    const r = got.value;
    if (!isObject(r) || r.error) return fail(503, "REFERENCE_READ_FAILED");
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

  // ⑦ 저장소에서 받아 대조 — 받는 동안 실제 바이트를 세고, 기록된 크기를 넘으면 그 자리에서 끊는다
  const loaded: Loaded[] = [];
  for (const row of rows) {
    const abort = new AbortController();
    const got = await bounded(async () => {
      const r = await assets.downloadStream(row.path, abort.signal);
      if (!isObject(r) || r.error) return null;
      return readStreamLimited(r.data, row.bytes, abort.signal);
    }, remaining(), () => abort.abort());
    if (got.kind === "timeout") { abort.abort(); return fail(503, "REFERENCE_READ_FAILED"); }
    if (got.kind === "error" || got.value === null) { abort.abort(); return fail(503, "REFERENCE_READ_FAILED"); }
    const bytes = got.value;
    if (bytes === "too_large") { abort.abort(); return fail(502, "REFERENCE_MISMATCH"); }    // 기록된 크기보다 크다 = 기록된 그 파일이 아니다
    if (bytes.length !== row.bytes) return fail(502, "REFERENCE_MISMATCH");
    const v = await verifyReferenceBytes(bytes, row.mime);                                    // 서명이 기록된 MIME과 같은지 + 서버 SHA-256
    if (!v.ok || v.value.sha256 !== row.sha256) return fail(502, "REFERENCE_MISMATCH");
    loaded.push({ ...row.ref, mime: row.mime, bytes });
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
  const checked = await bounded(() => precheckGenerated(assets, userId, config.quality), pre(L.precheckMs));
  if (checked.kind !== "ok" || checked.value.status === "unavailable") return fail(503, "ASSET_PRECHECK_UNAVAILABLE");
  if (checked.value.status === "denied") return fail(507, "STORAGE_LIMIT");

  // ★ 유료 호출 직전 관문: 생성·저장·서명·응답에 필요한 시간이 남지 않았으면 생성하지 않는다
  if (left() < needForGeneration) return fail(503, "TIME_BUDGET_EXCEEDED");

  // ⑨ 생성 — 정확히 1회. 실패·시간 초과 어디서도 다시 부르지 않는다
  const gen = await bounded(() => deps.generate(apiKey, genConfig), Math.min(L.generationMs + L.graceMs, left() - L.marginMs));
  if (gen.kind === "timeout") {
    console.error("Generations API Error:", "WAIT_TIMEOUT");
    return out(504, { error: GENERATIONS_MESSAGES.GENERATION_TIMEOUT, code: "GENERATION_TIMEOUT" });
  }
  if (gen.kind === "error") {
    // 공급자 오류: 허용된 코드만 고정 문구로. 원문(message)·임의 코드는 응답에도 로그에도 쓰지 않는다
    const providerCode = providerErrorCode(gen.error);
    console.error("Generations API Error:", providerCode);
    return out(500, { error: PROVIDER_ERROR_MESSAGES[providerCode] ?? GENERATIONS_MESSAGES.GENERATION_FAILED, code: "GENERATION_FAILED", providerCode });
  }
  const imageUrl = gen.value;
  if (typeof imageUrl !== "string") return out(500, { error: GENERATIONS_MESSAGES.GENERATION_FAILED, code: "GENERATION_FAILED", providerCode: "UNKNOWN" });

  // ⑩ 원본 저장(기존 흐름) — 남은 시간 안에서만 기다린다. 상한을 넘으면 어디까지 됐는지 모르므로 불명(W01-G3S)
  //  * 저장 모듈이 「검증된 본인 예약 번호」를 확보하면 알려 준다 → 끝까지 기다리지 못해도 그 번호를 응답에 싣는다(나중에 조회 경로로 회수).
  //  * 저장을 시작할 때 단조 시계로 고정 마감(saveDeadline)을 정한다. 저장 모듈은 다음 쓰기(예약·업로드·확정·대조·해제) 직전마다
  //    「멈춤 표시가 섰는가 또는 시계가 마감에 닿았는가(now >= 마감)」를 본다 — 타이머가 아직 돌지 못한 순간에도 마감 뒤의 새 쓰기를 시작하지 않는다.
  //    이미 보낸 쓰기는 취소하지 못하며 성공 여부도 모른다. 예약 응답을 받지 못해 번호가 없으면 번호 없는 불명으로 둔다(다시 보내지 않는다).
  //  * 응답에 싣는 번호는 저장이 확인된 경우를 빼면 onReserved로 받은 「검증된 본인 예약 번호」뿐이다(경로가 계약과 달랐던 예약 번호는 싣지 않는다).
  let saveStopped = false;
  let reservedAssetId: string | null = null;
  const saveWait = Math.min(L.saveMs, left() - L.signMs - L.marginMs);
  const saveDeadline = now() + saveWait;
  const saved = await bounded<SaveResult>(async () => {
    const bytes = decodeGeneratedDataUrl(imageUrl);
    if (!bytes) return { assetSaved: false, code: "ASSET_FORMAT" };
    return saveGeneratedOriginal(assets, { userId, bytes }, {
      onReserved: (id) => { if (isCanonicalUuid(id)) reservedAssetId = id; },
      shouldStop: () => saveStopped || now() >= saveDeadline,
    });
  }, saveWait, () => { saveStopped = true; });
  saveStopped = true;                                           // 응답을 정한 뒤에는 어떤 경우에도 새 저장 쓰기를 시작하지 않는다
  const verifiedId: string | null = reservedAssetId;            // 응답을 정하는 이 시점의 값만 쓴다(늦게 온 알림은 응답에 반영되지 않는다)
  // 시간 초과로 본다: 타이머가 먼저 끝낸 경우 + 저장 모듈이 마감을 보고 먼저 멈춘 경우(SAVE_STOPPED). 둘 다 같은 불명 응답이다
  const stoppedEarly = saved.kind === "ok" && saved.value.assetSaved !== true && saved.value.code === "SAVE_STOPPED";
  let save: { assetSaved: true; assetId: string } | { assetSaved: false | "unknown"; code: string; assetId?: string };
  if (saved.kind !== "ok" || stoppedEarly) {
    save = { assetSaved: "unknown", code: "SAVE_TIMEOUT", ...(verifiedId ? { assetId: verifiedId } : {}) };
  } else if (saved.value.assetSaved === true) {
    save = saved.value;
  } else {
    // 저장 안 됨·불명: 번호는 검증된 예약 번호만(저장 모듈이 돌려준 번호가 그것과 같을 때만) 싣는다
    const id = verifiedId && saved.value.assetId === verifiedId ? verifiedId : null;
    save = { assetSaved: saved.value.assetSaved, code: saved.value.code, ...(id ? { assetId: id } : {}) };
  }

  // ⑪⑫ 저장이 확인됐으면 이미지 바이트 없이 번호와 짧은 서명 주소만
  if (save.assetSaved === true) {
    const assetId = save.assetId;
    // 저장 함수는 경로를 돌려주지 않는다. 서명할 경로는 계약(회원/generated/자산.확장자)으로 다시 만든다 —
    // 확장자는 저장 때와 같은 판정(바이트의 실제 서명)으로 얻는다. 얻지 못하면 서명하지 않고 번호만 돌려준다.
    let signedUrl: string | null = null;
    const path = generatedPath(userId, assetId, imageUrl);
    if (path) {
      const s = await bounded(() => assets.createSignedUrl(path, SIGNED_URL_TTL_SECONDS), Math.min(L.signMs, left() - L.marginMs));
      if (s.kind === "ok" && isObject(s.value) && !s.value.error) {
        signedUrl = validSignedUrl((s.value.data as { signedUrl?: unknown } | null)?.signedUrl, assets.storageOrigin, ASSET_BUCKET, path);
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
