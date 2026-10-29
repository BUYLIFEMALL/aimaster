"use server";

import { requireProgramAccess } from "@/lib/access";
import { getCoupangDefaults, getWingKeys } from "@/lib/data";
import { getShopProduct } from "@/lib/shop";
import { wingRequest, WingApiError } from "@/lib/coupang/client";
import { PREDICT_PATH, fillNotices, metaPath, metaWarnings, normalizeMeta, normalizePredict, predictBody, type CategoryMeta } from "@/lib/coupang/category";
import { buildCreateBody, checkDraft, type CoupangOption } from "@/lib/coupang/product";
import { createAdminClient } from "@/lib/supabase/admin";
import { createImageLinks } from "@/lib/imageLinks";
import { historyPath, normalizeHistory, productPath, summarizeStatus, type HistoryEntry } from "@/lib/coupang/status";

export type CategoryLoad = { ok: true; code: number; name: string; meta: CategoryMeta } | { ok: false; error: string };

/** C1-7·C1-8 상품 화면용 — 번호를 주면 그 카테고리, 없으면 상품명으로 추천을 받은 뒤 메타를 읽는다(읽기만). */
export async function loadCategoryAction(input: { name: string; code?: number | null }): Promise<CategoryLoad> {
  const user = await requireProgramAccess();
  const keys = await getWingKeys(user.id);
  if (!keys) return { ok: false, error: "먼저 「쿠팡 연결」에서 키를 등록해 주세요." };
  let code = Number(input.code) || 0;
  let name = "";
  try {
    if (!code) {
      if (!input.name.trim()) return { ok: false, error: "상품명이 비어 있습니다." };
      const p = normalizePredict((await wingRequest(keys, "POST", PREDICT_PATH, { body: predictBody({ name: input.name }) })).data);
      if (!p.ok) return { ok: false, error: `쿠팡이 카테고리를 추천하지 못했습니다(${p.reason}). 상품명을 더 자세히 쓰거나 카테고리 번호를 직접 넣어 주세요.` };
      code = p.code;
      name = p.name;
    }
    const meta = normalizeMeta((await wingRequest(keys, "GET", metaPath(code))).data);
    return { ok: true, code, name: name || `카테고리 #${code}`, meta };
  } catch (e) {
    return { ok: false, error: e instanceof WingApiError ? e.message : "쿠팡에 연결하지 못했습니다. 잠시 뒤 다시 시도해 주세요." };
  }
}

export interface DraftInput {
  categoryCode: number | null;
  name: string;
  brand: string;
  manufacturer: string;
  options: CoupangOption[];
  /** 검색옵션(구매옵션이 아닌 속성) — 모든 옵션에 함께 붙인다 */
  searchAttributes: { type: string; value: string }[];
  noticeCategory: string | null;
  searchTags: string[];
}

export type DraftCheck = { problems: string[]; warnings: string[]; images: { main: boolean; extras: number; contents: number } };

/** C1-10 보내기 전 검사 — 쿠팡에 보내지 않는다. 이미지는 보낼 때 짧은 주소(/i/<id>)로 바뀌므로 개수만 본다. */
export async function checkProductDraftAction(productId: string, input: DraftInput): Promise<DraftCheck> {
  const user = await requireProgramAccess();
  const [keys, defaults, shop] = await Promise.all([getWingKeys(user.id), getCoupangDefaults(user.id), getShopProduct(user.id, productId)]);
  if (!shop) return { problems: ["상세페이지 상품을 찾지 못했습니다."], warnings: [], images: { main: false, extras: 0, contents: 0 } };

  // 보낼 때 만들 짧은 주소와 같은 길이의 자리표시 주소(https·200자 규칙 검사용)
  const stub = (i: number) => `https://coupang-ops.buylife.xyz/i/${String(i).padStart(12, "0")}`;
  const images = {
    representation: shop.mainImage ? stub(0) : "",
    extras: shop.extraImages.map((_, i) => stub(100 + i)),
    contents: shop.sectionImages.map((_, i) => stub(200 + i)),
  };
  const options = input.options.map((o) => ({ ...o, attributes: [...o.attributes, ...input.searchAttributes.filter((a) => a.value.trim())] }));
  const problems = checkDraft(
    { vendorId: keys?.vendorId ?? "", wingUserId: keys?.wingUserId ?? "", categoryCode: input.categoryCode, name: input.name, brand: input.brand, manufacturer: input.manufacturer, options, notices: [], searchTags: input.searchTags, images, requested: false },
    defaults,
  );

  const warnings: string[] = [];
  if (keys && input.categoryCode) {
    try {
      const meta = normalizeMeta((await wingRequest(keys, "GET", metaPath(input.categoryCode))).data);
      const usedPurchase = [...new Set(input.options.flatMap((o) => o.attributes.map((a) => a.type)))];
      warnings.push(...metaWarnings(meta, usedPurchase));
      if (!meta.singleAllowed && input.options.length === 1 && !input.options[0].attributes.length) warnings.push("이 카테고리는 옵션 없는 단일 상품을 받지 않습니다. 구매옵션(색상·사이즈 등)을 넣어 주세요.");
      for (const a of meta.attributes.filter((x) => x.required && !x.purchase)) {
        if (!input.searchAttributes.some((s) => s.type === a.name && s.value.trim())) warnings.push(`필수 속성 「${a.name}」 값을 넣어 주세요.`);
      }
      if (meta.notices.length && !fillNotices(meta, input.noticeCategory).length) warnings.push("상품정보제공고시 상품군을 골라 주세요.");
    } catch (e) {
      warnings.push(`카테고리 정보를 다시 읽지 못했습니다: ${e instanceof WingApiError ? e.message : "연결 오류"}`);
    }
  }
  return { problems, warnings, images: { main: Boolean(shop.mainImage), extras: shop.extraImages.length, contents: shop.sectionImages.length } };
}

export type SendResult =
  | { ok: true; sellerProductId: number | null; jobId: string; message: string }
  | { ok: false; error: string; problems?: string[] };

const CREATE_PATH = "/v2/providers/seller_api/apis/api/v1/marketplace/seller-products";

/** C1-13·C1-14 「저장만 보내기」(requested=false — 쿠팡 승인 요청 전 단계) + 기록.
 *  쿠팡은 공개 주소의 이미지만 받아 가므로 배포 서버에서만 보낸다. 생성은 재시도하지 않고, 보내기 전에 「sending」 기록을 먼저 남긴다. */
export async function sendProductAction(productId: string, input: DraftInput): Promise<SendResult> {
  const user = await requireProgramAccess();
  if (process.env.VERCEL !== "1") return { ok: false, error: "쿠팡은 공개 인터넷 주소에 있는 이미지만 받아 갑니다. 배포된 주소(coupang-ops.buylife.xyz)에서 보내 주세요. 로컬에서는 「검사하기」까지만 됩니다." };
  const [keys, defaults, shop] = await Promise.all([getWingKeys(user.id), getCoupangDefaults(user.id), getShopProduct(user.id, productId)]);
  if (!keys) return { ok: false, error: "먼저 「쿠팡 연결」에서 키를 등록해 주세요." };
  if (!defaults) return { ok: false, error: "먼저 「배송·반품 기본값」을 저장해 주세요." };
  if (!shop) return { ok: false, error: "상세페이지 상품을 찾지 못했습니다." };
  if (!input.categoryCode) return { ok: false, error: "카테고리를 골라 주세요." };

  const admin = createAdminClient();
  const { data: prev } = await admin.from("coupang_ops_jobs").select("id,status,seller_product_id").eq("user_id", user.id).eq("product_id", productId).neq("status", "failed").order("created_at", { ascending: false }).limit(1);
  if (prev?.length) return { ok: false, error: `이미 보낸 기록이 있습니다(상태 ${prev[0].status}${prev[0].seller_product_id ? `, 상품번호 ${prev[0].seller_product_id}` : ""}). 같은 상품을 두 번 등록하지 않도록 막았습니다.` };

  let meta;
  try {
    meta = normalizeMeta((await wingRequest(keys, "GET", metaPath(input.categoryCode))).data);
  } catch (e) {
    return { ok: false, error: `카테고리 정보를 읽지 못했습니다: ${e instanceof WingApiError ? e.message : "연결 오류"}` };
  }
  const notices = fillNotices(meta, input.noticeCategory);
  const options = input.options.map((o) => ({ ...o, attributes: [...o.attributes, ...input.searchAttributes.filter((a) => a.value.trim())] }));

  const [main, extras, contents] = await Promise.all([
    createImageLinks(user.id, shop.mainImage ? [shop.mainImage.path] : []),
    createImageLinks(user.id, shop.extraImages.map((i) => i.path)),
    createImageLinks(user.id, shop.sectionImages.map((i) => i.path)),
  ]);
  const draft = { vendorId: keys.vendorId, wingUserId: keys.wingUserId, categoryCode: input.categoryCode, name: input.name, brand: input.brand, manufacturer: input.manufacturer, options, notices, searchTags: input.searchTags, images: { representation: main[0] ?? "", extras, contents }, requested: false };
  const problems = checkDraft(draft, defaults);
  if (problems.length) return { ok: false, error: "보내기 전 검사에서 걸렸습니다.", problems };

  const { data: job, error: jobErr } = await admin.from("coupang_ops_jobs").insert({ user_id: user.id, product_id: productId, product_name: input.name.slice(0, 200), category_code: input.categoryCode, requested: false, status: "sending", item_count: options.length }).select("id").single();
  if (jobErr || !job) return { ok: false, error: "기록을 만들지 못해 보내지 않았습니다. 잠시 뒤 다시 시도해 주세요." };

  try {
    const r = await wingRequest(keys, "POST", CREATE_PATH, { body: buildCreateBody(draft, defaults) });
    const res = (r.data ?? {}) as { code?: unknown; message?: unknown; data?: unknown };
    const sellerProductId = Number(res.data) || null;
    const ok = String(res.code ?? "").toUpperCase() === "SUCCESS" || sellerProductId !== null;
    const message = String(res.message ?? (ok ? "저장됨" : "응답 확인 필요"));
    await admin.from("coupang_ops_jobs").update({ status: ok ? "saved" : "unknown", seller_product_id: sellerProductId, message, response: res, updated_at: new Date().toISOString() }).eq("id", job.id);
    return ok ? { ok: true, sellerProductId, jobId: job.id, message } : { ok: false, error: `쿠팡 응답을 확인해야 합니다: ${message}` };
  } catch (e) {
    const known = e instanceof WingApiError && e.status >= 400 && e.status < 500;
    const msg = e instanceof WingApiError ? e.message : "연결이 끊겼습니다 — 쿠팡에 들어갔는지 WING에서 확인해 주세요.";
    await admin.from("coupang_ops_jobs").update({ status: known ? "failed" : "unknown", message: msg.slice(0, 500), response: e instanceof WingApiError ? { status: e.status, body: e.body.slice(0, 2000) } : null, updated_at: new Date().toISOString() }).eq("id", job.id);
    return { ok: false, error: msg };
  }
}

export type JobRow = { id: string; status: string; seller_product_id: number | null; message: string | null; created_at: string; item_count: number };

/** 이 상품의 쿠팡 등록 기록(최근 10건, 회원 본인 것만) */
export async function listJobsAction(productId: string): Promise<JobRow[]> {
  const user = await requireProgramAccess();
  const { data } = await createAdminClient().from("coupang_ops_jobs").select("id,status,seller_product_id,message,created_at,item_count").eq("user_id", user.id).eq("product_id", productId).order("created_at", { ascending: false }).limit(10);
  return (data ?? []) as JobRow[];
}

/** C1-14 등록 현황·승인 상태 확인 — 쿠팡 상품 조회 + 상태변경이력(읽기만)으로 기록 상태와 반려 사유를 갱신한다 */
export async function refreshJobStatusAction(jobId: string): Promise<{ ok: true; statusName: string; message: string } | { ok: false; error: string }> {
  const user = await requireProgramAccess();
  const keys = await getWingKeys(user.id);
  if (!keys) return { ok: false, error: "먼저 「쿠팡 연결」에서 키를 등록해 주세요." };
  const admin = createAdminClient();
  const { data: job } = await admin.from("coupang_ops_jobs").select("id,seller_product_id").eq("id", jobId).eq("user_id", user.id).maybeSingle();
  if (!job?.seller_product_id) return { ok: false, error: "쿠팡 상품번호가 있는 기록만 상태를 확인할 수 있습니다." };
  const id = Number(job.seller_product_id);
  try {
    const [product, history] = await Promise.all([
      wingRequest(keys, "GET", productPath(id)),
      wingRequest(keys, "GET", historyPath(id), { query: "maxPerPage=20" }).then((r) => normalizeHistory(r.data)).catch(() => [] as HistoryEntry[]),
    ]);
    const s = summarizeStatus(product.data, history);
    await admin.from("coupang_ops_jobs").update({ ...(s.jobStatus ? { status: s.jobStatus } : {}), message: s.message, updated_at: new Date().toISOString() }).eq("id", job.id).eq("user_id", user.id);
    return { ok: true, statusName: s.statusName, message: s.message };
  } catch (e) {
    return { ok: false, error: `쿠팡 상태를 읽지 못했습니다: ${e instanceof WingApiError ? e.message : "연결 오류"}` };
  }
}
