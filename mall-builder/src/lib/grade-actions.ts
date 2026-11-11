"use server";

// T1 등급·할인 서버 동작 — 권한·값 검사는 DB 함수·보안 규칙(0057)이 다시 한다
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const field = (form: FormData, k: string) => String(form.get(k) ?? "").trim();
const intOf = (v: string) => (v === "" ? NaN : Math.floor(Number(v.replace(/[^0-9.]/g, ""))));

function back(path: string, error?: string | null, ok?: string): never {
  const [p, hash] = path.split("#");
  redirect(`${p}?${error ? `error=${encodeURIComponent(error)}` : `ok=1&msg=${encodeURIComponent(ok ?? "저장했습니다.")}`}${hash ? `#${hash}` : ""}`);
}

async function storeIdOf(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("mall_builder_stores").select("id").eq("slug", slug).maybeSingle();
  return { supabase, id: (data?.id as string | undefined) ?? null };
}

/** 등급 추가(gradeId null)·고치기 */
export async function saveGradeAction(slug: string, gradeId: string | null, form: FormData) {
  const base = `/s/${slug}/admin/grades`;
  const { supabase, id } = await storeIdOf(slug);
  if (!id) back(base, "몰을 찾을 수 없습니다.");
  const { error } = await supabase.rpc("mall_builder_grade_save", {
    p_store_id: id,
    p_id: gradeId,
    p_name: field(form, "name"),
    p_is_business: field(form, "type") === "business",
    p_rank: intOf(field(form, "rank")) || 0,
    p_default_rate: intOf(field(form, "default_rate")) || 0,
  });
  revalidatePath(`/s/${slug}`, "layout");
  back(base, error?.message, gradeId ? "등급을 저장했습니다." : "등급을 추가했습니다.");
}

export async function deleteGradeAction(slug: string, gradeId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("mall_builder_grade_delete", { p_id: gradeId });
  revalidatePath(`/s/${slug}`, "layout");
  back(`/s/${slug}/admin/grades`, error?.message, "등급을 지웠습니다.");
}

/** 카테고리 × 등급 할인율 한꺼번에 저장 — 칸 이름 rate_<카테고리>_<등급>, 비우면 지움(상위 카테고리·등급 기본율을 따름) */
export async function saveCategoryRatesAction(slug: string, form: FormData) {
  const base = `/s/${slug}/admin/grades#category-rates`;
  const { supabase, id } = await storeIdOf(slug);
  if (!id) back(base, "몰을 찾을 수 없습니다.");
  const upserts: { store_id: string; category_id: string; grade_id: string; discount_rate: number }[] = [];
  const clears: { category_id: string; grade_id: string }[] = [];
  for (const [k, v] of form.entries()) {
    const m = /^rate_([0-9a-f-]{36})_([0-9a-f-]{36})$/.exec(k);
    if (!m) continue;
    const raw = String(v).trim();
    if (raw === "") { clears.push({ category_id: m[1], grade_id: m[2] }); continue; }
    const n = intOf(raw);
    if (!(n >= 0 && n <= 90)) back(base, "할인율은 0~90 사이 숫자로 적어 주세요.");
    upserts.push({ store_id: id!, category_id: m[1], grade_id: m[2], discount_rate: n });
  }
  if (upserts.length) {
    const { error } = await supabase.from("mall_builder_category_grade_rates").upsert(upserts, { onConflict: "category_id,grade_id" });
    if (error) back(base, error.message);
  }
  for (const c of clears) {
    await supabase.from("mall_builder_category_grade_rates").delete().eq("store_id", id!).eq("category_id", c.category_id).eq("grade_id", c.grade_id);
  }
  revalidatePath(`/s/${slug}`, "layout");
  back(base, null, `카테고리 할인율을 저장했습니다(${upserts.length}칸).`);
}

/** 최소 마진 % — 공급사 상품은 공급가 × (1 + 이 값) 밑으로 팔리지 않음 */
export async function saveMinMarginAction(slug: string, form: FormData) {
  const base = `/s/${slug}/admin/grades#margin`;
  const { supabase, id } = await storeIdOf(slug);
  if (!id) back(base, "몰을 찾을 수 없습니다.");
  const v = Number(field(form, "min_margin").replace(/[^0-9.]/g, "") || "0");
  if (!(v >= 0 && v <= 100)) back(base, "최소 마진은 0~100% 사이로 적어 주세요.");
  const { error } = await supabase.from("mall_builder_price_rules").upsert({ store_id: id!, min_margin_rate: Math.round(v * 100) / 100, updated_at: new Date().toISOString() }, { onConflict: "store_id" });
  revalidatePath(`/s/${slug}`, "layout");
  back(base, error?.message, `최소 마진을 ${v}%로 저장했습니다.`);
}

/** 손님 등급 바꾸기 */
export async function setCustomerGradeAction(slug: string, customerId: string, form: FormData) {
  const base = `/s/${slug}/admin/customers/${customerId}`;
  const supabase = await createClient();
  const { error } = await supabase.rpc("mall_builder_customer_set_grade", { p_customer_id: customerId, p_grade_id: field(form, "grade_id") });
  revalidatePath(`/s/${slug}`, "layout");
  back(base, error?.message, "등급을 바꿨습니다.");
}

/** 공급사 바로 판매 켜기·끄기 */
export async function setSupplierAutoAction(slug: string, supplierId: string, auto: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("mall_builder_supplier_set_auto", { p_id: supplierId, p_auto: auto });
  revalidatePath(`/s/${slug}/admin/suppliers`);
  back(`/s/${slug}/admin/suppliers`, error?.message, auto ? "이 공급사 상품은 이제 등록하면 바로 판매됩니다." : "이 공급사 상품은 이제 운영자 승인 뒤 판매됩니다.");
}
