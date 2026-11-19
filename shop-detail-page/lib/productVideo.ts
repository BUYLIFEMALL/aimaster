// 상품에 붙이는 쇼츠(유튜브) — 받는 쪽(상세페이지)의 검사·저장 순서·표시 규칙. MOV-20261119-01 (2026-11-20).
// 브라우저·DB에 기대지 않는 순수 함수만 둔다(tests/productVideo.test.mjs).
//
// 영상 정보가 어떤 길로 들어오는지(창 사이 메시지·서버 호출)는 여기서 정하지 않는다 — 송수신 계약 수정판을 기다리는 중이다
// (2026-11-20 맥미니 검수: 원스톱의 Cross-Origin-Opener-Policy same-origin 때문에 원스톱이 연 창과의 연결이 끊긴다).
// 어떤 길이든 서버는 attachVideo 한 곳을 지나고, 거기서 다시 검사하고 본인 상품인지 확인한 뒤에만 저장한다.

export const VIDEO_TITLE_MAX = 100;
/** 남의 상품·없는 상품을 구분해 알려 주지 않는다(상품 번호가 있는지 떠볼 수 없게) */
export const NOT_OWN_PRODUCT = "본인 상품이 아닙니다. 상세페이지에 로그인한 계정을 확인해 주세요.";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const PRIVACY = ["public", "unlisted", "private"] as const;
export type VideoPrivacy = (typeof PRIVACY)[number];

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
export const isUuid = (v: unknown): v is string => typeof v === "string" && UUID.test(v);
export const isVideoId = (v: unknown): v is string => typeof v === "string" && VIDEO_ID.test(v);
const cleanText = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : "");

/** 시각 글자를 표준 형식으로. 없으면 null, 형식이 틀리면 undefined */
function isoOrNull(v: unknown): string | null | undefined {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v !== "string" || v.length > 40) return undefined;
  const t = Date.parse(v);
  return Number.isFinite(t) ? new Date(t).toISOString() : undefined;
}

/** 영상 주소는 받은 값을 쓰지 않고 영상 번호로 여기서 만든다(다른 주소가 끼어들 수 없게) */
export const shortsUrl = (videoId: string) => `https://www.youtube.com/shorts/${videoId}`;

// ── 받은 영상 정보 검사 ────────────────────────────────────────────────────────
export interface VideoInput {
  productId: string;
  videoId: string;
  title: string;
  privacy: VideoPrivacy;
  publishAt: string | null;
  uploadedAt: string | null;
  sourceItemId: string | null;
}

/**
 * 영상 정보 한 건({productId, sourceItemId?, video:{videoId, title, privacy, publishAt, uploadedAt}})을 검사해 저장할 모양으로 만든다.
 * **서버가 부른다** — 보내는 쪽·브라우저에서 이미 검사했다는 사실은 믿지 않는다. 받은 값에 주소(url)가 있어도 읽지 않는다.
 */
export function checkVideoInput(raw: unknown): { input: VideoInput } | { error: string } {
  if (!isRecord(raw)) return { error: "영상 정보가 올바르지 않습니다." };
  if (!isUuid(raw.productId)) return { error: "상품 번호가 올바르지 않습니다." };
  const video = isRecord(raw.video) ? raw.video : raw;
  if (!isVideoId(video.videoId)) return { error: "영상 번호가 올바르지 않습니다." };
  if (typeof video.privacy !== "string" || !(PRIVACY as readonly string[]).includes(video.privacy)) return { error: "공개 범위가 올바르지 않습니다." };
  const publishAt = isoOrNull(video.publishAt);
  const uploadedAt = isoOrNull(video.uploadedAt);
  if (publishAt === undefined || uploadedAt === undefined) return { error: "시각 형식이 올바르지 않습니다." };
  if (video.privacy === "private" && !publishAt) return { error: "비공개 영상은 상품 화면에 붙일 수 없습니다. 예약 공개를 걸었거나 공개·일부 공개인 영상만 붙일 수 있습니다." };
  return {
    input: {
      productId: raw.productId.toLowerCase(),
      videoId: video.videoId,
      title: cleanText(video.title, VIDEO_TITLE_MAX),
      privacy: video.privacy as VideoPrivacy,
      publishAt,
      uploadedAt,
      sourceItemId: isUuid(raw.sourceItemId) ? raw.sourceItemId.toLowerCase() : null,
    },
  };
}

// ── 서버: 소유 확인 뒤 저장 ────────────────────────────────────────────────────
export interface VideoStore {
  /** 로그인 회원의 상품이면 표시용 이름, 아니면(없거나 남의 상품) null */
  ownProductLabel(userId: string, productId: string): Promise<string | null>;
  /** 한 줄 넣기. 같은 상품·같은 영상이 이미 있으면 "duplicate", DB 권한 정책이 막으면 "denied" */
  insert(userId: string, input: VideoInput): Promise<"inserted" | "duplicate" | "denied" | { error: string }>;
}

export interface AttachResult { ok: boolean; duplicate: boolean; error: string; productLabel?: string }

/**
 * 붙이기의 서버 쪽 순서: 다시 검사 → 본인 상품 확인 → 저장. 본인 상품이 아니면 저장을 시도하지 않는다.
 * 중복이면 기존 값을 그대로 두고 성공(duplicate)으로 답한다. DB 오류 원문은 밖으로 내보내지 않는다.
 */
export async function attachVideo(store: VideoStore, userId: string, raw: unknown): Promise<AttachResult> {
  const fail = (error: string): AttachResult => ({ ok: false, duplicate: false, error });
  if (!isUuid(userId)) return fail("로그인이 필요합니다.");
  const checked = checkVideoInput(raw);
  if ("error" in checked) return fail(checked.error);
  const label = await store.ownProductLabel(userId, checked.input.productId);
  if (label === null) return fail(NOT_OWN_PRODUCT);
  const saved = await store.insert(userId, checked.input);
  if (saved === "denied") return fail(NOT_OWN_PRODUCT);
  if (typeof saved === "object") return fail("저장하지 못했습니다. 잠시 뒤 다시 보내 주세요.");
  return { ok: true, duplicate: saved === "duplicate", error: "", productLabel: label };
}

// ── 상품 화면 표시 규칙 ────────────────────────────────────────────────────────
export interface StoredVideo { video_id: string; title: string; privacy: string; publish_at: string | null; uploaded_at: string | null }

const KST = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric", hour: "numeric", minute: "2-digit", hour12: false });

/**
 * 상품 화면에 어떻게 보일지.
 * - 예약 공개 전: 「공개 예정」 글만, 주소는 걸지 않는다.
 * - 예약 시각이 지남: 상세페이지는 유튜브의 실제 상태를 모른다 — 「공개됨」이라고 단정하지 않는다.
 */
export function videoStatus(v: StoredVideo, now: number): { kind: "public" | "unlisted" | "scheduled" | "check"; label: string; url: string | null } {
  const url = isVideoId(v.video_id) ? shortsUrl(v.video_id) : null;
  const at = v.publish_at ? Date.parse(v.publish_at) : NaN;
  if (v.privacy === "private") {
    if (Number.isFinite(at) && at > now) return { kind: "scheduled", label: `${KST.format(at)} 공개 예정`, url: null };
    return { kind: "check", label: "예약 시각 지남 — 유튜브에서 공개 여부를 확인해 주세요", url };
  }
  return v.privacy === "unlisted" ? { kind: "unlisted", label: "일부 공개(주소를 아는 사람만)", url } : { kind: "public", label: "공개", url };
}
