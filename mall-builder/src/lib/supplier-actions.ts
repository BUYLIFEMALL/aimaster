"use server";

// D34 공급사 서버 동작 — 권한·상태 검사는 DB 함수(0053)가 다시 한다
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type SupplierInviteState = { error: string | null; link: string | null; keep: Record<string, string> };

async function originOf() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  return host ? `${h.get("x-forwarded-proto") ?? "https"}://${host}` : "";
}

async function storeIdOf(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("mall_builder_stores").select("id").eq("slug", slug).maybeSingle();
  return { supabase, id: (data?.id as string | undefined) ?? null };
}

const field = (form: FormData, k: string) => String(form.get(k) ?? "").trim();

/** 운영자: 공급사 초대 — 링크는 주소창·기록에 남지 않게 화면 상태로만 돌려준다(이때 한 번만 보임) */
export async function inviteSupplierAction(slug: string, _prev: SupplierInviteState, form: FormData): Promise<SupplierInviteState> {
  const keep = Object.fromEntries(["name", "email", "biz_no", "contact_name", "phone", "memo"].map((k) => [k, field(form, k)]));
  const { supabase, id } = await storeIdOf(slug);
  if (!id) return { error: "몰을 찾을 수 없습니다.", link: null, keep };
  const { data, error } = await supabase.rpc("mall_builder_supplier_invite", {
    p_store_id: id, p_name: keep.name, p_email: keep.email, p_biz_no: keep.biz_no, p_contact_name: keep.contact_name, p_phone: keep.phone, p_memo: keep.memo,
  });
  if (error) return { error: error.message, link: null, keep };
  revalidatePath(`/s/${slug}/admin/suppliers`);
  return { error: null, link: `${await originOf()}/invite/supplier/${(data as { token: string }).token}`, keep: {} };
}

export type ReinviteState = { error: string | null; link: string | null };

/** 운영자: 수락 대기 공급사 링크 다시 만들기(옛 링크는 못 씀) */
export async function reinviteSupplierAction(slug: string, supplierId: string, _prev: ReinviteState): Promise<ReinviteState> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("mall_builder_supplier_reinvite", { p_id: supplierId });
  if (error) return { error: error.message, link: null };
  revalidatePath(`/s/${slug}/admin/suppliers`);
  return { error: null, link: `${await originOf()}/invite/supplier/${(data as { token: string }).token}` };
}

function back(path: string, error?: string | null, ok?: string): never {
  redirect(error ? `${path}?error=${encodeURIComponent(error)}` : `${path}?ok=1&msg=${encodeURIComponent(ok ?? "처리했습니다.")}`);
}

/** 운영자: 공급사 정보·상태 저장 */
export async function updateSupplierAction(slug: string, supplierId: string, form: FormData) {
  const supabase = await createClient();
  const status = field(form, "status");
  const { error } = await supabase.rpc("mall_builder_supplier_update", {
    p_id: supplierId, p_name: field(form, "name"), p_biz_no: field(form, "biz_no"), p_contact_name: field(form, "contact_name"),
    p_phone: field(form, "phone"), p_memo: field(form, "memo"), p_status: status,
  });
  revalidatePath(`/s/${slug}/admin/suppliers`);
  back(`/s/${slug}/admin/suppliers`, error?.message, status === "revoked" ? "초대를 거뒀습니다. 그 링크는 더 이상 쓸 수 없습니다." : "공급사 정보를 저장했습니다.");
}

/** 공급사 본인: 담당자·연락처 고치기 */
export async function updateSupplierSelfAction(slug: string, form: FormData) {
  const { supabase, id } = await storeIdOf(slug);
  if (!id) back(`/s/${slug}/supplier`, "몰을 찾을 수 없습니다.");
  const { error } = await supabase.rpc("mall_builder_supplier_update_self", { p_store_id: id, p_contact_name: field(form, "contact_name"), p_phone: field(form, "phone") });
  revalidatePath(`/s/${slug}/supplier`);
  back(`/s/${slug}/supplier`, error?.message, "담당자 정보를 저장했습니다.");
}

// ── D35 공급사 상품 ──
const num = (form: FormData, k: string) => String(form.get(k) ?? "").replace(/[^0-9]/g, "");

/** 공급사: 상품 올리기(productId null)·고치기 — 재고만 바꾸면 그대로, 내용이 바뀌면 다시 승인 대기 */
export async function saveSupplierProductAction(slug: string, productId: string | null, form: FormData) {
  const base = `/s/${slug}/supplier/products`;
  const { supabase, id } = await storeIdOf(slug);
  if (!id) back(base, "몰을 찾을 수 없습니다.");
  let images: unknown = [];
  try {
    images = JSON.parse(String(form.get("images") ?? "[]"));
  } catch {
    back(productId ? `${base}/${productId}` : `${base}/new`, "사진 목록을 읽지 못했습니다. 다시 시도해 주세요.");
  }
  const stockOn = form.get("stock_on") === "on";
  const p = {
    name: field(form, "name"),
    summary: field(form, "summary"),
    description: String(form.get("description") ?? ""),
    supply_price: num(form, "supply_price"),
    base_price: num(form, "base_price"),
    tax_type: field(form, "tax_type") || "taxable",
    stock_mode: stockOn ? "product" : "none",
    stock: stockOn ? num(form, "stock") || "0" : "0",
    images,
  };
  const { data: savedId, error } = await supabase.rpc("mall_builder_supplier_product_save", { p_store_id: id, p_product_id: productId, p });
  if (error) back(productId ? `${base}/${productId}` : `${base}/new`, error.message);
  // M1-2(0068) 수수료율 방식 몰이면 리셀러 판매수수료율도 저장(공급가는 DB가 다시 계산)
  const resellerRate = String(form.get("reseller_rate") ?? "").trim();
  if (resellerRate !== "" && savedId) {
    const { error: rateError } = await supabase.rpc("mall_builder_product_reseller_rate_set", { p_product_id: savedId as string, p_rate: Number(resellerRate.replace(/[^0-9.]/g, "")) });
    if (rateError) back(`${base}/${savedId}`, rateError.message);
  }
  revalidatePath(base);
  back(base, null, productId ? "저장했습니다. 내용을 바꿨다면 운영자 승인 뒤 다시 판매됩니다." : `「${p.name}」을 올렸습니다. 운영자 승인을 기다려 주세요.`);
}

/** 공급사: 판매 멈춤/다시 열기 */
export async function pauseSupplierProductAction(slug: string, productId: string, pause: boolean) {
  const base = `/s/${slug}/supplier/products`;
  const supabase = await createClient();
  const { error } = await supabase.rpc("mall_builder_supplier_product_pause", { p_product_id: productId, p_pause: pause });
  revalidatePath(base);
  back(base, error?.message, pause ? "판매를 멈췄습니다. 손님에게 보이지 않습니다." : "다시 판매합니다.");
}

/** 운영자: 공급사 상품 승인(판매가·바로 판매)/반려(사유) */
export async function reviewSupplierProductAction(slug: string, productId: string, action: "approve" | "reject", form: FormData) {
  const base = `/s/${slug}/admin/suppliers`;
  const supabase = await createClient();
  const price = num(form, "base_price");
  const { error } = await supabase.rpc("mall_builder_product_review", {
    p_product_id: productId,
    p_action: action,
    p_note: action === "reject" ? field(form, "note") : "",
    p_base_price: price ? Number(price) : null,
    p_on_sale: form.get("on_sale") === "on",
  });
  revalidatePath(base);
  revalidatePath(`/s/${slug}`, "layout");
  back(base, error?.message, action === "approve" ? "승인했습니다." : "반려했습니다. 공급사 화면에 사유가 보입니다.");
}

// ── D36 공급사 발송 ──
/** 공급사: 품목 송장 넣기·고치기. 남은 품목이 모두 공급사 품목이고 다 발송되면 DB가 주문을 「배송 중」으로 */
export async function shipSupplierItemAction(slug: string, itemId: string, form: FormData) {
  const base = `/s/${slug}/supplier/orders`;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("mall_builder_supplier_ship", { p_item_id: itemId, p_courier: field(form, "courier"), p_tracking: field(form, "tracking_no") });
  revalidatePath(base);
  back(base, error?.message, data === "shipping" ? "송장을 넣었습니다. 이 주문의 품목이 모두 발송되어 주문이 「배송 중」으로 바뀌었습니다." : "송장을 넣었습니다.");
}

// ── D37 공급사 정산 ──
/** 대표: 직접 송금한 뒤 「지급 완료」 — 잔액 이하만(DB가 다시 검사) */
export async function settleSupplierAction(slug: string, supplierId: string, form: FormData) {
  const base = `/s/${slug}/admin/supplier-settlements`;
  const supabase = await createClient();
  const amount = Number(String(form.get("amount") ?? "").replace(/[^0-9]/g, ""));
  const { error } = await supabase.rpc("mall_builder_supplier_settle", { p_supplier_id: supplierId, p_amount: amount || null, p_memo: field(form, "memo") });
  revalidatePath(base);
  back(base, error?.message, `${amount.toLocaleString("ko-KR")}원을 지급 완료로 기록했습니다.`);
}

// ── T1(0060) 공급사 옵션 판매가·배송비 ──
/** 운영자: 공급사 상품 옵션별 판매 추가금 — 칸 이름 「p:조합 열쇠」. 판매가가 공급가보다 낮아지면 DB가 막음 */
export async function setVariantPricesAction(slug: string, productId: string, form: FormData) {
  const base = `/s/${slug}/admin/products/${productId}`;
  const prices: Record<string, number> = {};
  for (const [k, v] of form.entries()) {
    if (!k.startsWith("p:")) continue;
    const n = String(v).replace(/[^0-9-]/g, "");
    if (n !== "" && n !== "-") prices[k.slice(2)] = Number(n);
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("mall_builder_variant_prices_set", { p_product_id: productId, p_prices: prices });
  revalidatePath(base);
  revalidatePath(`/s/${slug}`, "layout");
  back(base, error?.message, "옵션별 판매 추가금을 저장했습니다.");
}

function shippingInput(form: FormData) {
  return {
    type: field(form, "ship_type") || "mall",
    base_fee: num(form, "base_fee"),
    free_over: num(form, "free_over"),
    jeju_fee: num(form, "jeju_fee"),
    island_fee: num(form, "island_fee"),
  };
}

/** 공급사 본인: 내 배송비 정책(「mall」이면 몰 기본 배송비 따르기) */
export async function saveSupplierShippingAction(slug: string, form: FormData) {
  const { supabase, id } = await storeIdOf(slug);
  if (!id) back(`/s/${slug}/supplier`, "몰을 찾을 수 없습니다.");
  const { error } = await supabase.rpc("mall_builder_supplier_shipping_save", { p_store_id: id, p: shippingInput(form) });
  revalidatePath(`/s/${slug}/supplier`);
  revalidatePath(`/s/${slug}`, "layout");
  back(`/s/${slug}/supplier`, error?.message, "배송비를 저장했습니다. 다음 주문부터 적용됩니다.");
}

/** 운영자: 공급사 배송비 보고 고치기 */
export async function setSupplierShippingAction(slug: string, supplierId: string, form: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("mall_builder_supplier_shipping_set", { p_supplier_id: supplierId, p: shippingInput(form) });
  revalidatePath(`/s/${slug}/admin/suppliers`);
  revalidatePath(`/s/${slug}`, "layout");
  back(`/s/${slug}/admin/suppliers`, error?.message, "공급사 배송비를 저장했습니다. 다음 주문부터 적용됩니다.");
}

// ── M1-1(0068) 공급가 방식·본사 판매수수료율 ──
/** 몰 대표: 공급가 방식(직접 입력 / 수수료율 자동)·몰 기본 본사율 */
export async function saveSupplySettingsAction(slug: string, storeId: string, form: FormData) {
  const base = `/s/${slug}/admin/suppliers`;
  const mode = form.get("supply_mode") === "rate" ? "rate" : "manual";
  const rate = Number(String(form.get("hq_rate") ?? "").replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(rate) || rate < 0 || rate > 50) back(base, "본사 판매수수료율은 0~50 사이 숫자로 적어 주세요.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("mall_builder_supply_settings_save", { p_store_id: storeId, p_mode: mode, p_hq_rate: rate });
  revalidatePath(base);
  back(base, error?.message, mode === "rate" ? `수수료율 자동 방식·기본 본사율 ${rate}%로 저장했습니다. 공급가를 다시 계산했습니다.` : "공급가 직접 입력 방식으로 저장했습니다.");
}

/** 몰 대표: 공급사별 본사 판매수수료율(비우면 몰 기본값) */
export async function setSupplierHqRateAction(slug: string, supplierId: string, form: FormData) {
  const base = `/s/${slug}/admin/suppliers`;
  const raw = String(form.get("hq_rate") ?? "").trim();
  const rate = raw === "" ? null : Number(raw.replace(/[^0-9.]/g, ""));
  if (rate !== null && (!Number.isFinite(rate) || rate < 0 || rate > 50)) back(base, "본사 판매수수료율은 0~50 사이 숫자로 적어 주세요.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("mall_builder_supplier_hq_rate_set", { p_supplier_id: supplierId, p_rate: rate });
  revalidatePath(base);
  back(base, error?.message, rate === null ? "이 공급사는 몰 기본 본사율을 따릅니다. 공급가를 다시 계산했습니다." : `이 공급사 본사 판매수수료율을 ${rate}%로 저장했습니다. 공급가를 다시 계산했습니다.`);
}
