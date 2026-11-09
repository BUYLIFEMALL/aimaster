"use server";

// 쿠폰·포인트(D17·D18) 저장 동작 — 운영자: 설정·쿠폰 만들기/끄기/발급·포인트 지급/차감, 손님: 쿠폰 받기·코드 등록
// 권한은 표 규칙(운영자만 쓰기)과 DB 함수(발급·받기·지급)가 다시 검사한다
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validateCouponForm } from "@/lib/benefits";

function go(path: string, error?: string | null, ok?: string): never {
  const q = error ? `error=${encodeURIComponent(error)}` : `ok=1&msg=${encodeURIComponent(ok ?? "처리했습니다.")}`;
  redirect(`${path}${path.includes("?") ? "&" : "?"}${q}`);
}

async function staffStore(slug: string, back: string) {
  const supabase = await createClient();
  const { data: store } = await supabase.from("mall_builder_stores").select("id").eq("slug", slug).maybeSingle();
  if (!store) go(back, "몰을 찾을 수 없습니다.");
  const { data: staff } = await supabase.rpc("mall_builder_is_store_staff", { p_store_id: store.id });
  if (staff !== true) go(back, "이 몰을 고칠 권한이 없습니다.");
  return { supabase, storeId: store.id as string };
}

const int = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").replace(/,/g, "").trim();
  return s === "" ? null : Number(s);
};

/** 운영자: 포인트 설정 + 등급별 적립률(비우면 몰 기본) */
export async function savePointSettingsAction(slug: string, form: FormData) {
  const back = `/s/${slug}/admin/coupons`;
  const v = {
    enabled: form.get("enabled") === "on",
    earn_rate: Number(form.get("earn_rate")),
    min_use: int(form.get("min_use")) ?? 0,
    use_unit: int(form.get("use_unit")) ?? 100,
    max_use_rate: int(form.get("max_use_rate")) ?? 100,
    expire_months: int(form.get("expire_months")) ?? 12,
    expire_notice: form.get("expire_notice") === "on",
  };
  if (!Number.isFinite(v.earn_rate) || v.earn_rate < 0 || v.earn_rate > 50) go(back, "적립률은 0~50%로 입력해 주세요.");
  if (!Number.isInteger(v.min_use) || v.min_use < 0) go(back, "최소 보유 포인트를 다시 입력해 주세요.");
  if (!Number.isInteger(v.use_unit) || v.use_unit < 1 || v.use_unit > 10000) go(back, "사용 단위는 1~10,000점으로 입력해 주세요.");
  if (!Number.isInteger(v.max_use_rate) || v.max_use_rate < 1 || v.max_use_rate > 100) go(back, "최대 사용 비율은 1~100%로 입력해 주세요.");
  if (!Number.isInteger(v.expire_months) || v.expire_months < 1 || v.expire_months > 60) go(back, "소멸 기간은 1~60개월로 입력해 주세요.");
  const { supabase, storeId } = await staffStore(slug, back);
  const { error } = await supabase.from("mall_builder_point_settings").upsert({ store_id: storeId, ...v, earn_rate: Math.round(v.earn_rate * 10) / 10, updated_at: new Date().toISOString() });
  if (error) go(back, error.message);
  // 등급별 적립률: grade_rate_<id> 칸, 비우면 null(몰 기본)
  for (const [key, raw] of form.entries()) {
    if (!key.startsWith("grade_rate_")) continue;
    const s = String(raw).trim();
    const rate = s === "" ? null : Number(s);
    if (rate != null && (!Number.isFinite(rate) || rate < 0 || rate > 50)) go(back, "등급별 적립률은 0~50%로 입력해 주세요.");
    const { error: e } = await supabase.from("mall_builder_customer_grades").update({ point_rate: rate == null ? null : Math.round(rate * 10) / 10 }).eq("id", key.slice(11)).eq("store_id", storeId);
    if (e) go(back, e.message);
  }
  revalidatePath(`/s/${slug}`, "layout");
  go(back, null, "포인트 설정을 저장했습니다.");
}

/** 운영자: 쿠폰 만들기 */
export async function createCouponAction(slug: string, form: FormData) {
  const back = `/s/${slug}/admin/coupons`;
  const target = String(form.get("target") ?? "all");
  const f = {
    name: String(form.get("name") ?? "").trim(),
    discount_type: String(form.get("discount_type") ?? ""),
    value: int(form.get("value")) ?? 0,
    max_discount: int(form.get("max_discount")),
    min_order: int(form.get("min_order")) ?? 0,
    valid_days: int(form.get("valid_days")),
    ends_at: String(form.get("ends_at") ?? "") ? new Date(`${form.get("ends_at")}T23:59:59+09:00`).toISOString() : null,
    target,
    target_ids: target === "category" ? form.getAll("category_ids").map(String) : target === "product" ? form.getAll("product_ids").map(String) : [],
    issue_mode: String(form.get("issue_mode") ?? ""),
    code: String(form.get("code") ?? "").trim().toUpperCase() || null,
  };
  if (f.discount_type === "amount") f.max_discount = null;
  if (f.issue_mode !== "code") f.code = null;
  const err = validateCouponForm(f);
  if (err) go(back, err);
  const { supabase, storeId } = await staffStore(slug, back);
  const { error } = await supabase.from("mall_builder_coupons").insert({ ...f, store_id: storeId, allow_business: form.get("allow_business") === "on" });
  if (error) go(back, error.message.includes("mall_builder_coupons_store_code") ? "이미 쓰고 있는 쿠폰 코드입니다." : error.message);
  revalidatePath(`/s/${slug}`, "layout");
  go(back, null, `쿠폰 「${f.name}」을(를) 만들었습니다.`);
}

/** 운영자: 쿠폰 켜기·끄기(지우지 않음 — 쓴 주문 기록 보존) */
export async function toggleCouponAction(slug: string, couponId: string, active: boolean) {
  const back = `/s/${slug}/admin/coupons`;
  const { supabase, storeId } = await staffStore(slug, back);
  const { error } = await supabase.from("mall_builder_coupons").update({ is_active: active }).eq("id", couponId).eq("store_id", storeId);
  revalidatePath(`/s/${slug}`, "layout");
  go(back, error?.message, active ? "쿠폰을 다시 켰습니다." : "쿠폰을 껐습니다. 이미 받은 손님도 쓸 수 없습니다.");
}

/** 운영자: 직접 발급(전체·등급·고른 손님) */
export async function issueCouponAction(slug: string, couponId: string, form: FormData) {
  const back = `/s/${slug}/admin/coupons`;
  const scope = String(form.get("scope") ?? "");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("mall_builder_coupon_issue", {
    p_coupon_id: couponId,
    p_scope: scope,
    p_grade_id: scope === "grade" ? String(form.get("grade_id") ?? "") || null : null,
    p_customer_ids: scope === "customers" ? form.getAll("customer_ids").map(String) : null,
  });
  revalidatePath(`/s/${slug}`, "layout");
  go(back, error?.message, `${Number(data ?? 0)}명에게 발급했습니다. (이미 가진 손님은 건너뜀)`);
}

/** 운영자: 손님 포인트 지급(+)·차감(−) */
export async function adjustPointsAction(slug: string, customerId: string, form: FormData) {
  const back = `/s/${slug}/admin/customers/${customerId}`;
  const amount = int(form.get("amount"));
  const sign = form.get("sign") === "minus" ? -1 : 1;
  if (amount == null || !Number.isInteger(amount) || amount <= 0) go(back, "포인트를 1 이상으로 입력해 주세요.");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("mall_builder_points_adjust", { p_customer_id: customerId, p_amount: sign * amount, p_note: String(form.get("note") ?? "") });
  revalidatePath(`/s/${slug}`, "layout");
  go(back, error?.message, `포인트를 ${sign > 0 ? "지급" : "차감"}했습니다. 잔액 ${Number(data ?? 0).toLocaleString("ko-KR")}점`);
}

/** 손님: 쿠폰 받기 */
export async function downloadCouponAction(slug: string, couponId: string, back: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("mall_builder_coupon_download", { p_coupon_id: couponId });
  revalidatePath(`/s/${slug}`, "layout");
  go(back, error?.message, `「${String(data ?? "쿠폰")}」 쿠폰을 받았습니다. 주문서에서 쓸 수 있습니다.`);
}

/** 손님: 쿠폰 코드 등록(마이페이지) */
export async function redeemCouponAction(slug: string, form: FormData) {
  const back = `/s/${slug}/my`;
  const supabase = await createClient();
  const { data: store } = await supabase.from("mall_builder_stores").select("id").eq("slug", slug).maybeSingle();
  if (!store) go(back, "몰을 찾을 수 없습니다.");
  const { data, error } = await supabase.rpc("mall_builder_coupon_redeem", { p_store_id: store.id, p_code: String(form.get("code") ?? "") });
  revalidatePath(`/s/${slug}`, "layout");
  go(back, error?.message, `「${String(data ?? "쿠폰")}」 쿠폰을 등록했습니다.`);
}
