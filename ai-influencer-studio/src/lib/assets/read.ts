// 원본 자산 조회 처리 — GET /api/aif/assets/[id] (W01-A1, 2026-11-18, CC-SNS-01, Master msg_c5faabaaa12c).
// 계약: docs/analysis-ai-influencer-20261118/W00_BASELINE.md §18-R1-6. 경로 별칭·Next 모듈을 쓰지 않는다(시험이 직접 불러온다).
//
// 처리 순서: 권한 확인(기존 모든 라우트와 같이 가장 먼저) → 모드 off면 404(자산용 DB·저장소 호출 0) → id 모양 → 본인 행(id + user_id 둘 다 조건)
//   → 행 모양·소유·경로 재검증 → 상태별 응답 → ready만 짧은 서명 URL.
//
// A1에서 일부러 하지 않는 것(보수 축소)
//  * 「파일 없음(missing)」을 자동으로 기록하지 않는다. 근거: 설치된 @supabase/storage-js 2.117.3의 exists()는 HEAD 응답이 400 또는 404면
//    둘 다 { data: false }로 접는다 — 400은 부재의 증거가 아니다. 또 path 기준 조회라 우리 object_id와 같은 객체인지 대조할 수 없다.
//    영구 부재와 객체 동일성을 확정할 수 없으므로, 서명 실패·존재 불명은 모두 503으로 돌려주고 DB 상태를 바꾸지 않는다.
//  * 재생성·재업로드·자동 대조 실행을 하지 않는다(reserved·unknown은 「확인 중」으로만 답한다).
// 모든 응답은 Cache-Control: no-store. 행의 path·object_id·user_id 필드와 키·오류 원문은 응답·로그에 싣지 않는다
//   (서명 URL 문자열 자체에는 저장소 경로가 들어 있을 수 있다 — 그것은 별개이며 본인에게만 돌려준다).
// 한계: 서명 URL은 발급 뒤 SIGNED_URL_TTL_SECONDS(120초) 동안 유효하다. 그사이 이용 권한이 철회돼도 이미 발급된 URL은 만료 전까지 열린다.
// reserved·unknown의 202는 「다시 조회해 달라」는 안내일 뿐이다 — 서버가 뒤에서 주기 조회나 자동 대조를 돌리지 않는다.

import type { AssetsMode } from "./generation";
import { ASSET_BUCKET, isCanonicalUuid, parseAssetPath } from "./paths";

export const SIGNED_URL_TTL_SECONDS = 120;

export type AccessResult = { allowed: true; user: { id: string } } | { allowed: false; error: string; status: number };
export type AssetReadDeps = {
  /** 본인 행 한 건: id와 user_id를 **둘 다** 조건으로 조회해야 한다 */
  getAssetRow: (userId: string, assetId: string) => PromiseLike<{ data: unknown; error: unknown }>;
  /** 비공개 버킷의 짧은 서명 URL */
  createSignedUrl: (path: string, expiresIn: number) => PromiseLike<{ data: unknown; error: unknown }>;
  /** 기대하는 저장소 주소(예: https://<프로젝트>.supabase.co). 서명 URL이 이 주소의 서명 경로일 때만 돌려준다 */
  storageOrigin: string;
};

/** 서명 URL 검증(READ-F01, Mac 검수 2026-11-18): 원문 문자열이 정확히
 *    <기대 저장소 origin>/storage/v1/object/sign/<요청한 버킷>/<요청한 경로>?token=<비어 있지 않은 토큰 1개>
 *  꼴일 때만 돌려준다. 같은 origin이라도 다른 버킷·다른 회원·다른 자산·임의 경로·% 인코딩·세그먼트 추가/축약·점 세그먼트·
 *  token 중복/빈 값·다른 매개변수·fragment·계정 정보는 모두 거절(null). URL을 정규화한 값이 아니라 원문 접두사로 비교한다
 *  (점 세그먼트처럼 정규화하면 같아 보이는 주소를 걸러내기 위해). 우리 경로는 소문자 UUID·종류·확장자뿐이라 인코딩이 필요 없다.
 *  설치된 @supabase/storage-js 2.117.3의 createSignedUrl은 `<저장소 url>/object/sign/<버킷>/<경로>?token=…` 을 만든다. */
export function validSignedUrl(value: unknown, storageOrigin: unknown, bucket: unknown, path: unknown): string | null {
  if (typeof value !== "string" || typeof storageOrigin !== "string" || bucket !== ASSET_BUCKET || !parseAssetPath(path)) return null;
  let origin: string;
  try {
    const expected = new URL(storageOrigin);
    if (expected.protocol !== "https:" || expected.username || expected.password) return null;
    origin = expected.origin;
  } catch {
    return null;
  }
  const prefix = `${origin}/storage/v1/object/sign/${bucket}/${path as string}?token=`;
  if (!value.startsWith(prefix)) return null;
  const token = value.slice(prefix.length);
  // 토큰은 JWT(base64url과 점)다. &·#·%·공백 등이 섞이면 매개변수 추가·중복·fragment이므로 거절
  if (!/^[A-Za-z0-9._~-]+$/.test(token)) return null;
  return value;
}
export type AssetGetDeps = {
  mode: AssetsMode;
  checkAccess: () => Promise<AccessResult>;
  /** shadow일 때만 불린다(off에서는 호출 0) */
  getReadDeps?: () => AssetReadDeps;
};
export type ReadResult = { status: number; body: Record<string, unknown>; headers: Record<string, string> };

const NO_STORE = { "Cache-Control": "no-store" };
const out = (status: number, body: Record<string, unknown>): ReadResult => ({ status, body, headers: { ...NO_STORE } });
const NOT_FOUND = () => out(404, { error: "자료를 찾을 수 없습니다.", code: "ASSET_NOT_FOUND" });
const UNAVAILABLE = () => out(503, { error: "일시적으로 확인할 수 없습니다. 잠시 뒤 다시 시도해 주세요.", code: "ASSET_TEMPORARILY_UNAVAILABLE" });

export async function handleGetAsset(deps: AssetGetDeps, assetId: unknown): Promise<ReadResult> {
  const auth = await deps.checkAccess();
  if (!auth.allowed) return out(auth.status, { error: auth.error });
  const userId = auth.user.id;

  // off: 기능이 꺼져 있다. 자산용 DB·저장소 의존성을 만들지도 부르지도 않는다.
  if (deps.mode !== "shadow") return out(404, { error: "자료를 찾을 수 없습니다.", code: "ASSET_FEATURE_OFF" });

  if (!isCanonicalUuid(assetId) || !isCanonicalUuid(userId)) return NOT_FOUND();

  let read: AssetReadDeps;
  try {
    if (!deps.getReadDeps) return UNAVAILABLE();
    read = deps.getReadDeps();
  } catch {
    return UNAVAILABLE();
  }

  // 본인 행 조회 — 오류·던짐·모양 이상은 「없음」이 아니라 「확인 불가」
  let row: Record<string, unknown> | null;
  try {
    const r = await read.getAssetRow(userId, assetId);
    if (!r || typeof r !== "object" || r.error) return UNAVAILABLE();
    if (r.data === undefined) return UNAVAILABLE();   // data 칸이 없거나 undefined — 「행 없음」이라는 명시 응답이 아니라 모양 불명
    if (r.data === null) return NOT_FOUND();          // maybeSingle의 「행 없음」(본인 것이 아니거나 없는 id) — 다른 회원 자료도 같은 404
    if (typeof r.data !== "object" || Array.isArray(r.data)) return UNAVAILABLE();
    row = r.data as Record<string, unknown>;
  } catch {
    return UNAVAILABLE();
  }

  // 응답 행을 다시 검증(조회 조건이 빠진 잘못된 호출부·이상한 데이터 방어). 소유가 다르면 존재를 드러내지 않는다.
  if (row.id !== assetId || row.user_id !== userId) return NOT_FOUND();
  const parsed = parseAssetPath(row.path);
  if (row.bucket !== ASSET_BUCKET || !parsed || parsed.userId !== userId || parsed.assetId !== assetId) return UNAVAILABLE();

  const state = row.state;
  if (state === "reserved" || state === "unknown") {
    return out(202, { id: assetId, state: "checking", message: "저장 여부를 확인하고 있습니다. 잠시 뒤 다시 확인해 주세요." });
  }
  if (state === "failed") return out(404, { error: "저장되지 않은 자료입니다.", code: "ASSET_NOT_SAVED" });
  if (state === "missing") return out(404, { error: "파일을 찾을 수 없습니다.", code: "ASSET_MISSING" });
  if (state !== "ready" || !isCanonicalUuid(row.object_id)) return UNAVAILABLE();   // 모르는 상태·객체 id 없는 ready는 확인 불가

  // 짧은 서명 URL. 실패·던짐·모양 이상은 삭제·보관 만료로 단정하지 않고 503, DB 상태는 바꾸지 않는다.
  try {
    const s = await read.createSignedUrl(row.path as string, SIGNED_URL_TTL_SECONDS);
    const raw = s && typeof s === "object" && !s.error ? (s.data as { signedUrl?: unknown } | null)?.signedUrl : null;
    const signedUrl = validSignedUrl(raw, read.storageOrigin, row.bucket, row.path);   // 위에서 검증한 바로 그 버킷·경로와 정확히 같아야 한다
    if (!signedUrl) return UNAVAILABLE();
    return out(200, {
      id: assetId,
      state: "ready",
      signedUrl,
      expiresIn: SIGNED_URL_TTL_SECONDS,
      ...(typeof row.mime === "string" ? { mime: row.mime } : {}),
      ...(typeof row.bytes === "number" ? { bytes: row.bytes } : {}),
    });
  } catch {
    return UNAVAILABLE();
  }
}
