// 원본 자산 경로·종류·형식 규칙 (순수 함수) — W01-A1 (2026-11-18, CC-SNS-01).
// 계약: docs/analysis-ai-influencer-20261118/W00_BASELINE.md §18·§18-R1·§18-R2 (최종 037bfcacc).
// 경로는 `{user_id}/{kind}/{asset_id}.{ext}` 한 가지뿐이고 서버가 만든다. 회원 ID가 경로 맨 앞에 있어야
// 중앙 용량 측정(`member_storage_measure`, `name like '%uid%'`)과 중앙 정리가 회원 파일로 인식한다.
// 이 파일은 DB·저장소를 부르지 않는다(시험에서 바로 불러옴).

export const ASSET_BUCKET = "aif-assets";
export const ASSET_KINDS = ["ref_face", "ref_place", "ref_product", "generated"] as const;
export type AssetKind = (typeof ASSET_KINDS)[number];
export const ASSET_EXTS = ["png", "jpg", "webp", "heic"] as const;
export type AssetExt = (typeof ASSET_EXTS)[number];
export const ASSET_MIMES = ["image/png", "image/jpeg", "image/webp", "image/heic", "image/heif"] as const;
export type AssetMime = (typeof ASSET_MIMES)[number];

/** 참고 이미지 상한(referenceImage.ts와 같음)과 생성 결과 상한 — kind별로 분리(§18-3) */
export const REF_MAX_BYTES = 1024 * 1024;
export const GENERATED_MAX_BYTES = 20 * 1024 * 1024;
/** 화질별 생성 결과 예상 최대 크기 — 유료 생성 전 사전 검사용 보수값(R1-1). 실제 크기 보장 아님 */
export const GENERATED_EST_BYTES: Record<"1K" | "2K" | "4K", number> = { "1K": 4 * 1024 * 1024, "2K": 10 * 1024 * 1024, "4K": GENERATED_MAX_BYTES };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const isCanonicalUuid = (v: unknown): v is string => typeof v === "string" && v.length === 36 && UUID_RE.test(v);

export function isAssetKind(v: unknown): v is AssetKind { return typeof v === "string" && (ASSET_KINDS as readonly string[]).includes(v); }
export function isAssetExt(v: unknown): v is AssetExt { return typeof v === "string" && (ASSET_EXTS as readonly string[]).includes(v); }
export function isAssetMime(v: unknown): v is AssetMime { return typeof v === "string" && (ASSET_MIMES as readonly string[]).includes(v); }

/** MIME → 확장자. heif도 heic 확장자로 저장한다(브랜드 검사는 referenceImage.ts가 함) */
export function extForMime(mime: AssetMime): AssetExt {
  switch (mime) {
    case "image/png": return "png";
    case "image/jpeg": return "jpg";
    case "image/webp": return "webp";
    default: return "heic";
  }
}

export function maxBytesForKind(kind: AssetKind): number {
  return kind === "generated" ? GENERATED_MAX_BYTES : REF_MAX_BYTES;
}

export function estimatedGeneratedBytes(quality: unknown): number {
  return quality === "1K" || quality === "2K" || quality === "4K" ? GENERATED_EST_BYTES[quality] : GENERATED_MAX_BYTES;
}

export type AssetPathParts = { userId: string; kind: AssetKind; assetId: string; ext: AssetExt };

/** 경로를 만든다. 입력이 규칙에 맞지 않으면 예외(서버 내부 오류 — 회원 입력을 그대로 넣지 않는다) */
export function buildAssetPath(p: AssetPathParts): string {
  if (!isCanonicalUuid(p.userId)) throw new Error("userId must be canonical uuid");
  if (!isCanonicalUuid(p.assetId)) throw new Error("assetId must be canonical uuid");
  if (!isAssetKind(p.kind)) throw new Error("invalid kind");
  if (!isAssetExt(p.ext)) throw new Error("invalid ext");
  return `${p.userId}/${p.kind}/${p.assetId}.${p.ext}`;
}

/** 경로를 풀어 본다. 규칙에 어긋나면 null — 다른 회원 경로·세그먼트 추가·대문자·공백 모두 거절 */
export function parseAssetPath(path: unknown): AssetPathParts | null {
  if (typeof path !== "string") return null;
  const m = /^([^/]+)\/([^/]+)\/([^/.]+)\.([^/.]+)$/.exec(path);
  if (!m) return null;
  const [, userId, kind, assetId, ext] = m;
  if (!isCanonicalUuid(userId) || !isCanonicalUuid(assetId) || !isAssetKind(kind) || !isAssetExt(ext)) return null;
  return { userId, kind, assetId, ext };
}

/** 이 경로가 그 회원의 것인가(소유자 경계 — 서버 함수와 조회 라우트가 같은 규칙을 쓴다) */
export function pathBelongsTo(path: unknown, userId: string): boolean {
  const p = parseAssetPath(path);
  return !!p && isCanonicalUuid(userId) && p.userId === userId;
}

/** 저장 전 크기 검사: kind별 상한, 0 이하 거절 */
export function checkAssetBytes(kind: AssetKind, bytes: unknown): { ok: true } | { ok: false; code: "ASSET_EMPTY" | "ASSET_TOO_LARGE" } {
  if (typeof bytes !== "number" || !Number.isInteger(bytes) || bytes <= 0) return { ok: false, code: "ASSET_EMPTY" };
  if (bytes > maxBytesForKind(kind)) return { ok: false, code: "ASSET_TOO_LARGE" };
  return { ok: true };
}
