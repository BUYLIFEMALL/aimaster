// 메이커 연계 M1(2026-11-19, Master msg_336575c1b8e9) — 운영자 상품 목록에서 고른 상품을 바나나 「🛍 상품 대표사진 합성」으로 보낼 작업 만들기.
// 순수 함수만(단위 시험 대상, DB·네트워크·화면 없음). 약속은 공용 사본 productPhotoHandoff(기준 banana-canvas, 직접 고치지 않음).
// M1 범위: 보내기까지. 돌아온 결과를 쇼핑몰에 저장하는 일(사진 제안 표·적용)은 M2·M3 — 그 전까지는 결과를 저장하지 않고
// 고정 문구 「아직 받을 수 없음」으로 그 결과의 번호(resultId)를 정확히 되돌려 바나나가 「전송 중」에 머물지 않게 한다(재시도·저장 0).
import { PRODUCT_MAX_PHOTOS, PRODUCT_MAX_PRODUCTS, PRODUCT_MSG_JOB, PRODUCT_MSG_SAVED, PRODUCT_RECEIVER_ORIGIN } from "./productPhotoHandoff.ts";

export interface MallPhotoRow {
  id: string;
  name: string;
  images: { url?: unknown }[] | null;
  /** 분양몰 거울 상품이면 원본 상품 id(사진은 원본 몰 것이라 보내지 않음) */
  source_product_id: string | null;
  updated_at: string | null;
}
export interface MallPhotoItem { productId: string; label: string; baseRevision: string; photos: { role: "main" | "sub"; url: string }[] }
export interface MallPhotoSkip { productId: string; label: string; reason: string }

export const SKIP_NOT_MINE = "이 몰 상품이 아닙니다.";
export const SKIP_MIRROR = "분양몰 거울 상품은 원본 몰 사진이라 보낼 수 없습니다.";
export const SKIP_NO_PHOTO = "사진이 없습니다.";
export const SKIP_NO_REVISION = "수정 시각을 읽지 못했습니다.";
export const SKIP_TOO_MANY = `한 번에 ${PRODUCT_MAX_PRODUCTS}개까지 보낼 수 있습니다.`;
/** M2 전 결과 응답 고정 문구(번호·경로·원문 오류를 넣지 않음) */
export const MALL_RESULT_NOT_READY = "쇼핑몰은 아직 합성 결과를 받아 저장하지 않습니다(사진 제안 저장 준비 중). 결과는 바나나에서 내려받아 두세요.";

const isHttps = (v: unknown): v is string => typeof v === "string" && /^https:\/\/[^\s]+$/.test(v) && v.length <= 2000;

/**
 * 고른 상품 id → 보낼 작업 목록과 뺀 목록. rows는 「이 몰」 상품만 들어 있어야 한다(호출하는 쪽이 store_id로 읽음).
 * 고른 순서를 지키고, 같은 id는 한 번만, 최대 PRODUCT_MAX_PRODUCTS개.
 */
export function planMallPhotoJob(rows: readonly MallPhotoRow[], pickedIds: readonly string[]): { items: MallPhotoItem[]; skipped: MallPhotoSkip[] } {
  const byId = new Map(rows.map((r) => [r.id, r]));
  const items: MallPhotoItem[] = [];
  const skipped: MallPhotoSkip[] = [];
  const seen = new Set<string>();
  for (const id of pickedIds) {
    if (seen.has(id)) continue;
    seen.add(id);
    const r = byId.get(id);
    if (!r) { skipped.push({ productId: id, label: "상품", reason: SKIP_NOT_MINE }); continue; }
    const label = (r.name || "상품").slice(0, 100);
    if (r.source_product_id) { skipped.push({ productId: id, label, reason: SKIP_MIRROR }); continue; }
    const urls = (Array.isArray(r.images) ? r.images : []).map((im) => im?.url).filter(isHttps).slice(0, PRODUCT_MAX_PHOTOS);
    if (!urls.length) { skipped.push({ productId: id, label, reason: SKIP_NO_PHOTO }); continue; }
    const baseRevision = typeof r.updated_at === "string" ? r.updated_at.trim().slice(0, 40) : "";
    if (!baseRevision) { skipped.push({ productId: id, label, reason: SKIP_NO_REVISION }); continue; }
    if (items.length >= PRODUCT_MAX_PRODUCTS) { skipped.push({ productId: id, label, reason: SKIP_TOO_MANY }); continue; }
    items.push({ productId: id, label, baseRevision, photos: urls.map((url, i) => ({ role: i === 0 ? "main" : "sub", url })) });
  }
  return { items, skipped };
}

/**
 * 작업 보내기(「준비됨」을 받은 뒤 1번). 사진을 불러오는 동안 새 작업이 시작되거나 창이 닫히면(isActive false)
 * 그 뒤로는 아무것도 하지 않는다 — 옛 작업의 늦은 완료·실패가 새 작업의 창·메시지·상태 표시를 건드리지 않게(Master msg_4ab005ab0d96).
 * win은 이 작업을 시작할 때 연 창(호출하는 쪽이 작업과 함께 기억). 보내는 곳은 바나나 주소 하나.
 */
export async function sendMallJob(ctx: {
  jobId: string;
  items: readonly MallPhotoItem[];
  win: { postMessage: (msg: unknown, targetOrigin: string) => void };
  isActive: () => boolean;
  fetchPhoto: (url: string) => Promise<Blob>;
  mark: (productId: string, text: string) => void;
}): Promise<{ state: "sent" | "stale" | "empty"; sentIds: string[] }> {
  const products: { productId: string; label: string; baseRevision: string; photos: { role: "main" | "sub"; ref: string; file: Blob }[] }[] = [];
  for (const it of ctx.items) {
    if (!ctx.isActive()) return { state: "stale", sentIds: [] };
    ctx.mark(it.productId, "사진 읽는 중");
    let photos: { role: "main" | "sub"; ref: string; file: Blob }[] | null = null;
    let failed = "";
    try {
      photos = await Promise.all(it.photos.map(async (p) => ({ role: p.role, ref: p.url.split("/").pop() ?? "", file: await ctx.fetchPhoto(p.url) })));
    } catch (err) {
      failed = err instanceof Error ? err.message : "사진을 불러오지 못했습니다.";
    }
    if (!ctx.isActive()) return { state: "stale", sentIds: [] }; // 기다리는 사이 새 작업·창 닫힘 → 표시도 하지 않음
    if (!photos) { ctx.mark(it.productId, failed || "사진을 불러오지 못했습니다."); continue; }
    products.push({ productId: it.productId, label: it.label, baseRevision: it.baseRevision, photos });
    ctx.mark(it.productId, "바나나로 보냄");
  }
  if (!ctx.isActive()) return { state: "stale", sentIds: [] };
  if (!products.length) return { state: "empty", sentIds: [] };
  ctx.win.postMessage({ type: PRODUCT_MSG_JOB, jobId: ctx.jobId, products }, PRODUCT_RECEIVER_ORIGIN);
  return { state: "sent", sentIds: products.map((p) => p.productId) };
}

/**
 * M2(2026-11-19): 저장 결과 응답 — ok는 DB가 done이라고 답했을 때(code === "done")만 true, 그 밖은 고정 문구.
 * 같은 작업·상품·결과 번호·판번호를 그대로 되돌린다(번호 없는 옛 결과는 생략).
 */
export function savedReply(jobId: string, got: { productId: string; resultId: string | null; settingsVersion: string }, code: string, text: string) {
  return {
    type: PRODUCT_MSG_SAVED, jobId, productId: got.productId, ok: code === "done", error: code === "done" ? "" : text,
    ...(got.resultId ? { resultId: got.resultId } : {}), settingsVersion: got.settingsVersion,
  };
}

/** M2 전: 받은 결과에 보낼 「저장 안 함」 응답 — 같은 작업·상품·결과 번호·판번호를 그대로, ok는 항상 false */
export function notReadyReply(jobId: string, got: { productId: string; resultId: string | null; settingsVersion: string }) {
  return {
    type: PRODUCT_MSG_SAVED, jobId, productId: got.productId, ok: false, error: MALL_RESULT_NOT_READY,
    ...(got.resultId ? { resultId: got.resultId } : {}), settingsVersion: got.settingsVersion,
  };
}
