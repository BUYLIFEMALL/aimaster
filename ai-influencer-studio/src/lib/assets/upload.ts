// POST /api/aif/assets 처리 — 회원이 올린 참고 이미지 한 장을 서버가 받아 비공개 자산으로 저장한다 (W01-A2I, 2026-11-19, CC-SNS-01).
// 계약: docs/analysis-ai-influencer-20261118/W00_BASELINE.md §22(가 안 — 서버 경유 업로드). 경로 별칭·Next 모듈을 쓰지 않는다(시험이 직접 불러온다).
//
// ★ 원본 저장 모드(AIF_ASSETS_MODE)가 "off"인 동안에는 권한 확인 뒤 404만 돌려준다 — 본문을 읽지 않고, 자산용 DB·저장소 의존성도 만들지 않는다.
// 지키는 것
//  * 한 요청에 한 장. 본문(JSON)은 실제로 읽은 바이트 기준 2MiB까지만 읽는다. 사진은 디코딩한 바이트 기준 1MiB 이하.
//  * 회원 id는 호출부가 확인한 세션에서만 온다. 본문의 다른 값(회원 id·경로·자산 id·크기·해시)은 읽지 않는다.
//  * 서버의 형식 확인 범위는 「선언한 MIME + 파일 서명(앞부분)」이다(referenceImage.ts parseImageDataUrl과 같은 기준). 전체 디코드·내용 검사가 아니다.
//  * 저장소에 요청을 보내기 전의 실패만 「저장 안 됨」(4xx·5xx)이다. 보낸 뒤의 실패는 「불명」(200, assetSaved: "unknown")이고 실패로 단정하지 않는다.
//  * 자동으로 다시 보내지 않는다. 불명인 자산은 그대로 둔다. 회원이 같은 사진을 다시 올리면 새 자산이 하나 더 생긴다(중복을 합치지 않는다 — 계약 §22-4).
//  * 응답·로그에는 코드와 고정 문구만. 경로·버킷·객체 id·해시·오류 원문을 싣지 않는다.
import { parseImageDataUrl, readJsonBodyLimited } from "../referenceImage";
import { assetsEnabled, type AssetsMode } from "./generation";
import { isReferenceKind, saveReferenceImage, type AssetStoreDeps } from "./store";

export const UPLOAD_BODY_MAX_BYTES = 2 * 1024 * 1024;

export type AccessResult = { allowed: true; user: { id: string } } | { allowed: false; error: string; status: number };
export type AssetUploadDeps = {
  mode: AssetsMode;
  checkAccess: () => Promise<AccessResult>;
  /** shadow일 때, 본문 검사를 통과한 뒤에만 불린다 */
  getAssetDeps?: () => AssetStoreDeps;
};
export type UploadResult = { status: number; body: Record<string, unknown>; headers: Record<string, string> };

export const UPLOAD_MESSAGES = {
  BODY_TOO_LARGE: "요청이 너무 큽니다. 사진 한 장을 1MB 이하로 줄여 주세요.",
  BODY_INVALID: "요청 형식이 올바르지 않습니다. 화면을 새로고침한 뒤 다시 시도해 주세요.",
  KIND_INVALID: "사진 종류가 올바르지 않습니다.",
  IMAGE_INVALID: "사진 파일을 읽지 못했습니다. PNG·JPG·WebP·HEIC 형식의 사진을 올려 주세요.",
  IMAGE_UNSUPPORTED: "지원하지 않는 사진 형식입니다. PNG·JPG·WebP·HEIC 형식의 사진을 올려 주세요.",
  IMAGE_TOO_LARGE: "사진이 너무 큽니다. 한 장을 1MB 이하로 줄여 주세요.",
  STORAGE_LIMIT: "저장공간이 부족해 사진을 보관하지 못했습니다. 저장공간을 정리하거나 용량을 늘린 뒤 다시 올려 주세요.",
  UNAVAILABLE: "지금은 사진을 보관할 수 없습니다. 잠시 뒤 다시 시도해 주세요.",
} as const;

const NO_STORE = { "Cache-Control": "no-store" };
const out = (status: number, body: Record<string, unknown>): UploadResult => ({ status, body, headers: { ...NO_STORE } });
const fail = (status: number, code: string, message: string) => out(status, { error: message, code });

/** 엄격한 base64(이미 parseImageDataUrl이 모양을 확인한 값)를 바이트로 */
function decodeBase64(b64: string): Uint8Array | null {
  try {
    const bin = globalThis.atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

export async function handlePostAsset(req: Request, deps: AssetUploadDeps): Promise<UploadResult> {
  // 1) 권한 → 모드. 둘 중 하나에서 끝나면 본문·저장소에 닿지 않는다
  const auth = await deps.checkAccess();
  if (!auth.allowed) return out(auth.status, { error: auth.error });
  if (!assetsEnabled(deps.mode)) return fail(404, "ASSET_FEATURE_OFF", "자료를 찾을 수 없습니다.");

  // 2) 본문 — 실제로 읽은 바이트 기준 상한
  const body = await readJsonBodyLimited(req, UPLOAD_BODY_MAX_BYTES);
  if (!body.ok) return fail(body.status, body.code, UPLOAD_MESSAGES[body.code]);
  const b = body.value;
  if (typeof b !== "object" || b === null || Array.isArray(b)) return fail(400, "BODY_INVALID", UPLOAD_MESSAGES.BODY_INVALID);
  const { kind, image } = b as { kind?: unknown; image?: unknown };
  if (!isReferenceKind(kind)) return fail(400, "KIND_INVALID", UPLOAD_MESSAGES.KIND_INVALID);

  // 3) 사진 한 장 — 선언 MIME·파일 서명·1MiB 상한(생성 요청의 참고 이미지 검사와 같은 함수)
  const parsed = parseImageDataUrl(image);
  if (!parsed.ok) {
    if (parsed.code === "REFERENCE_TOO_LARGE") return fail(400, "IMAGE_TOO_LARGE", UPLOAD_MESSAGES.IMAGE_TOO_LARGE);
    if (parsed.code === "REFERENCE_UNSUPPORTED") return fail(400, "IMAGE_UNSUPPORTED", UPLOAD_MESSAGES.IMAGE_UNSUPPORTED);
    return fail(400, "IMAGE_INVALID", UPLOAD_MESSAGES.IMAGE_INVALID);
  }
  const bytes = decodeBase64(parsed.image.base64);
  if (!bytes) return fail(400, "IMAGE_INVALID", UPLOAD_MESSAGES.IMAGE_INVALID);

  // 4) 여기까지 통과한 뒤에만 자산용 의존성을 만든다
  let assetDeps: AssetStoreDeps;
  try {
    if (!deps.getAssetDeps) return fail(503, "ASSET_UNAVAILABLE", UPLOAD_MESSAGES.UNAVAILABLE);
    assetDeps = deps.getAssetDeps();
  } catch {
    return fail(503, "ASSET_UNAVAILABLE", UPLOAD_MESSAGES.UNAVAILABLE);
  }

  // 5) 저장 — 서버가 실제 바이트로 크기·형식·해시를 다시 확인하고 예약 → 업로드 → 확정(store.ts). 재전송 없음
  const r = await saveReferenceImage(assetDeps, { userId: auth.user.id, kind, mime: parsed.image.mime, bytes });
  if (r.assetSaved === true) return out(200, { assetId: r.assetId, assetSaved: true });
  if (r.assetSaved === "unknown") return out(200, { assetId: r.assetId, assetSaved: "unknown", assetCode: r.code });
  // 저장소에 요청을 보내기 전에 끝난 경우만 여기로 온다(저장 안 됨 확정). 자산 id는 돌려주지 않는다.
  if (r.code === "STORAGE_LIMIT") return fail(507, "STORAGE_LIMIT", UPLOAD_MESSAGES.STORAGE_LIMIT);
  if (r.code === "ASSET_TOO_LARGE") return fail(400, "IMAGE_TOO_LARGE", UPLOAD_MESSAGES.IMAGE_TOO_LARGE);
  if (r.code === "ASSET_FORMAT" || r.code === "ASSET_EMPTY") return fail(400, "IMAGE_INVALID", UPLOAD_MESSAGES.IMAGE_INVALID);
  return fail(503, "ASSET_UNAVAILABLE", UPLOAD_MESSAGES.UNAVAILABLE);
}
