// 생성 원본 저장 로직(서버 보유 바이트 → 비공개 자산) — W01-A1 (2026-11-18, CC-SNS-01, Master msg_c31331e2abb5).
// 계약: docs/analysis-ai-influencer-20261118/W00_BASELINE.md §18-R1·R2(최종 037bfcacc), SQL 초안 supabase/migrations/20261118120000_aif_assets_a1.sql.
// ★ 아직 어떤 라우트에도 연결하지 않았다. DB 함수·버킷도 운영에 없다. 이 파일은 주입받은 rpc/storage만 부른다(시험은 가짜로).
//
// 지키는 것
//  * 저장이 어떻게 되든 예외를 던지지 않고 결과 객체를 돌려준다 — 호출부는 이미 만든(과금된) 생성 결과를 그대로 회원에게 돌려준다.
//  * reserve 전 로컬 검증 실패: RPC 0.
//  * reserve 후 「원격 저장소에 요청을 보내지 않았음」이 확정된 경우에만 abort_local(예약 해제).
//  * 업로드를 시작한 뒤의 오류·중복 경로·시간 초과·객체 id 없음: unknown 유지. 삭제 0, 재업로드 0, 유료 재생성 0.
//  * 불명일 때 reconcile은 최대 1회.
//  * RPC·저장소 응답 모양이 예상과 다르거나 던지면 성공으로 단정하지 않는다.
//  * 원문(오류 메시지·바이트·경로·키)은 결과·로그에 싣지 않는다. 결과에는 코드만.
// 로그인·이용권 확인은 호출하는 라우트의 몫이다(이 파일은 userId 모양만 확인한다).

import { sniffImageKind } from "../referenceImage";
import { GENERATED_MAX_BYTES, buildAssetPath, estimatedGeneratedBytes, isCanonicalUuid } from "./paths";

export type RpcResult = { data: unknown; error: unknown };
export type Rpc = (fn: string, args: Record<string, unknown>) => PromiseLike<RpcResult>;
export type StorageUploader = {
  upload: (path: string, body: Uint8Array, opts: { contentType: string; upsert: false }) => PromiseLike<{ data: unknown; error: unknown }>;
};
export type AssetStoreDeps = { rpc: Rpc; storage: StorageUploader };

export type GeneratedMime = "image/png" | "image/jpeg" | "image/webp";
export type VerifyCode = "ASSET_EMPTY" | "ASSET_TOO_LARGE" | "ASSET_FORMAT";
export type VerifiedBytes = { mime: GeneratedMime; ext: "png" | "jpg" | "webp"; bytes: number; sha256: string };

const toHex = (buf: ArrayBuffer) => Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");

/** 생성 결과 바이트 검증: 0 초과·20MiB 이하, 실제 서명이 PNG·JPEG·WebP, 서버에서 SHA-256 계산. 서명 확인일 뿐 전체 디코드 보증 아님 */
export async function verifyGeneratedBytes(bytes: unknown): Promise<{ ok: true; value: VerifiedBytes } | { ok: false; code: VerifyCode }> {
  if (!(bytes instanceof Uint8Array) || bytes.length === 0) return { ok: false, code: "ASSET_EMPTY" };
  if (bytes.length > GENERATED_MAX_BYTES) return { ok: false, code: "ASSET_TOO_LARGE" };
  const kind = sniffImageKind(bytes);
  const map = { png: ["image/png", "png"], jpeg: ["image/jpeg", "jpg"], webp: ["image/webp", "webp"] } as const;
  if (kind !== "png" && kind !== "jpeg" && kind !== "webp") return { ok: false, code: "ASSET_FORMAT" };
  const sha256 = toHex(await globalThis.crypto.subtle.digest("SHA-256", bytes as unknown as BufferSource));
  return { ok: true, value: { mime: map[kind][0], ext: map[kind][1], bytes: bytes.length, sha256 } };
}

/** 생성 결과 data URL → 바이트. 엄격한 base64만. 형식·상한 판정은 verifyGeneratedBytes가 한다(머리 MIME은 믿지 않는다) */
export function decodeGeneratedDataUrl(dataUrl: unknown): Uint8Array | null {
  if (typeof dataUrl !== "string") return null;
  const m = /^data:[a-z0-9.+/-]*;base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl);
  if (!m || m[1].length % 4 !== 0) return null;
  if (m[1].length > Math.ceil(GENERATED_MAX_BYTES / 3) * 4 + 4) return new Uint8Array(GENERATED_MAX_BYTES + 1);   // 디코드하지 않고 상한 초과로 넘긴다
  try {
    const bin = globalThis.atob(m[1]);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

async function callRpc(rpc: Rpc, fn: string, args: Record<string, unknown>): Promise<{ ok: true; data: unknown } | { ok: false; errorText: string }> {
  try {
    const r = await rpc(fn, args);
    if (!r || typeof r !== "object") return { ok: false, errorText: "" };
    if (r.error) {
      const msg = (r.error as { message?: unknown })?.message;
      return { ok: false, errorText: typeof msg === "string" ? msg : "" };
    }
    return { ok: true, data: r.data };
  } catch {
    return { ok: false, errorText: "" };
  }
}

/** PostgreSQL `returns table` 함수의 응답 계약: **정확히 1행짜리 배열**이고 그 행은 배열이 아닌 객체. 0행·2행 이상·객체·null·원시값은 null(성공 단정 0).
 *  행의 추가 필드는 허용하지만 판정에는 쓰지 않는다. — Mac 검수 F01(2026-11-18) */
function singleRow(data: unknown): Record<string, unknown> | null {
  if (!Array.isArray(data) || data.length !== 1) return null;
  const row = data[0];
  return row !== null && typeof row === "object" && !Array.isArray(row) ? (row as Record<string, unknown>) : null;
}

/** finalize·reconcile이 돌려주는 알려진 상태 문자열. 이 밖의 값(undefined·null·boolean·객체·모르는 문자열)은 「응답 불명」으로 본다 — Mac 검수 F02 */
const KNOWN_FINALIZE_STATES = new Set(["ready", "unknown", "ASSET_DELETION_IN_PROGRESS", "INVALID_STATE", "NOT_FOUND"]);

export type PrecheckResult = { status: "allowed" | "denied" | "unavailable" };

/** 유료 생성 전 사전 검사(화질별 보수적 예상 크기). denied일 때만 생성을 막는다. 확인 불가(unavailable)는 호출부 정책에 맡긴다 */
export async function precheckGenerated(deps: Pick<AssetStoreDeps, "rpc">, userId: unknown, quality: unknown): Promise<PrecheckResult> {
  if (!isCanonicalUuid(userId)) return { status: "unavailable" };
  const r = await callRpc(deps.rpc, "aif_asset_precheck", { p_user: userId, p_est_bytes: estimatedGeneratedBytes(quality) });
  if (!r.ok) return { status: "unavailable" };
  const allowed = singleRow(r.data)?.allowed;   // 정확히 1행 + 실제 boolean만 인정
  if (allowed === true) return { status: "allowed" };
  if (allowed === false) return { status: "denied" };
  return { status: "unavailable" };
}

export type SaveCode =
  | "INVALID_USER" | VerifyCode | "STORAGE_LIMIT" | "RESERVE_FAILED" | "RESERVE_SHAPE"   // 저장소 요청 전 — 저장 안 됨 확정
  | "UPLOAD_UNKNOWN" | "FINALIZE_UNKNOWN" | "NOT_CONFIRMED";                              // 저장소 요청 뒤 — 불명
export type SaveResult =
  | { assetSaved: true; assetId: string }
  | { assetSaved: false; code: SaveCode; assetId?: string }
  | { assetSaved: "unknown"; code: SaveCode; assetId: string };

/** 서버가 들고 있는 생성 원본을 비공개 자산으로 저장한다. 던지지 않는다. */
export async function saveGeneratedOriginal(deps: AssetStoreDeps, input: { userId: unknown; bytes: unknown }): Promise<SaveResult> {
  let reservedId: string | null = null;   // 예약으로 받은 자산 id
  let uploadStarted = false;              // 저장소 요청을 시작했는가(시작했으면 이후 실패는 모두 불명)
  try {
    const userId = input.userId;
    if (!isCanonicalUuid(userId)) return { assetSaved: false, code: "INVALID_USER" };
    // 1) 로컬 검증 — 실패하면 RPC 0
    const v = await verifyGeneratedBytes(input.bytes);
    if (!v.ok) return { assetSaved: false, code: v.code };
    const bytes = input.bytes as Uint8Array;

    // 2) 예약
    const res = await callRpc(deps.rpc, "aif_asset_reserve", { p_user: userId, p_kind: "generated", p_mime: v.value.mime, p_ext: v.value.ext, p_bytes: v.value.bytes, p_sha256: v.value.sha256 });
    if (!res.ok) return { assetSaved: false, code: /STORAGE_LIMIT/.test(res.errorText) ? "STORAGE_LIMIT" : "RESERVE_FAILED" };
    const row = singleRow(res.data);   // 정확히 1행만. 0행·2행·객체·null·원시값이면 예약 id를 인정하지 않는다(업로드 0, abort 0)
    const assetId = row?.asset_id;
    if (!isCanonicalUuid(assetId)) return { assetSaved: false, code: "RESERVE_SHAPE" };   // id를 모르면 해제도 못 한다(예약은 보수적으로 남음). 업로드 0
    let expectedPath: string;
    try {
      expectedPath = buildAssetPath({ userId, kind: "generated", assetId, ext: v.value.ext });
    } catch {
      expectedPath = "";
    }
    if (!expectedPath || row?.path !== expectedPath) {
      // 예약은 됐지만 경로가 계약과 다르다 → 저장소에 아무것도 보내지 않았음이 확정 → 유일한 해제 경로
      await callRpc(deps.rpc, "aif_asset_abort_local", { p_asset: assetId, p_user: userId });
      return { assetSaved: false, code: "RESERVE_SHAPE", assetId };
    }

    // 3) 업로드(덮어쓰기 금지). 여기서부터의 모든 실패는 「불명」 — 삭제·재업로드·abort 0
    reservedId = assetId;
    uploadStarted = true;
    let objectId: string | null = null;
    try {
      const up = await deps.storage.upload(expectedPath, bytes, { contentType: v.value.mime, upsert: false });
      const d = (up && typeof up === "object" && !up.error ? up.data : null) as { id?: unknown; path?: unknown } | null;
      if (d && isCanonicalUuid(d.id) && d.path === expectedPath) objectId = d.id;
    } catch {
      objectId = null;
    }

    // 4) 확정 — 객체 id가 있을 때만
    if (objectId) {
      const fin = await callRpc(deps.rpc, "aif_asset_finalize", { p_asset: assetId, p_user: userId, p_object_id: objectId });
      const known = fin.ok && typeof fin.data === "string" && KNOWN_FINALIZE_STATES.has(fin.data);
      if (known && fin.data === "ready") return { assetSaved: true, assetId };
      if (known) return { assetSaved: "unknown", code: "NOT_CONFIRMED", assetId };   // DB가 알려진 상태로 ready가 아니라고 명시 응답(unknown·삭제 진행 등) — 대조 불필요
      // 확정 응답 불명(오류·던짐·undefined·null·boolean·객체·모르는 문자열) → 같은 객체 id로 대조 1회
      const rec = await callRpc(deps.rpc, "aif_asset_reconcile", { p_asset: assetId, p_user: userId, p_expected_object_id: objectId });
      if (rec.ok && rec.data === "ready") return { assetSaved: true, assetId };
      return { assetSaved: "unknown", code: "FINALIZE_UNKNOWN", assetId };
    }
    // 객체 id를 얻지 못함(오류·중복 경로·시간 초과·응답 모양 이상) → 대조 1회로 행을 unknown으로 남긴다(기대 id 없음 → ready 불가)
    const rec = await callRpc(deps.rpc, "aif_asset_reconcile", { p_asset: assetId, p_user: userId, p_expected_object_id: null });
    if (rec.ok && rec.data === "ready") return { assetSaved: true, assetId };
    return { assetSaved: "unknown", code: "UPLOAD_UNKNOWN", assetId };
  } catch {
    // 예상하지 못한 예외도 결과로만 돌려준다(생성 결과 반환을 막지 않는다). 성공 단정 0.
    // 업로드를 시작한 뒤라면 저장 여부를 모르므로 불명, 그 전이면 저장 안 됨.
    if (uploadStarted && reservedId) return { assetSaved: "unknown", code: "UPLOAD_UNKNOWN", assetId: reservedId };
    return { assetSaved: false, code: "RESERVE_FAILED" };
  }
}
