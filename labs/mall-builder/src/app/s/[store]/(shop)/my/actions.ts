"use server";

import { parseBirthMd } from "@/lib/benefits";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validateAddress, validateCustomer } from "@/lib/customers";
import { validateBusinessApplication } from "@/lib/business";

// 보안 규칙(본인 줄만 쓰기, 영업 중 몰에만 가입)을 그대로 거친다

export type JoinState = { error: string | null; name: string; phone: string; marketing_agree: boolean };

async function signedIn(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect(`/login?next=${encodeURIComponent(`/s/${slug}/join`)}`);
  const { data: store } = await supabase.from("mall_builder_stores").select("id").eq("slug", slug).maybeSingle();
  if (!store) redirect(`/s/${slug}`);
  return { supabase, userId: data.user.id, storeId: store.id as string };
}

/** 내 가입 줄 — 없으면 가입 화면으로 */
async function myCustomer(slug: string) {
  const ctx = await signedIn(slug);
  const { data } = await ctx.supabase
    .from("mall_builder_store_customers")
    .select("id")
    .eq("store_id", ctx.storeId)
    .eq("user_id", ctx.userId)
    .maybeSingle();
  if (!data) redirect(`/s/${slug}/join`);
  return { ...ctx, customerId: data.id as string };
}

function back(slug: string, msg?: { error?: string; ok?: string }): never {
  revalidatePath(`/s/${slug}`, "layout");
  const q = msg?.error ? `?error=${encodeURIComponent(msg.error)}` : msg?.ok ? `?ok=${encodeURIComponent(msg.ok)}` : "";
  redirect(`/s/${slug}/my${q}`);
}

/** 이 몰에 가입 — next가 같은 몰 안 주소면 가입 뒤 그리로 */
export async function joinAction(slug: string, next: string, _prev: JoinState, form: FormData): Promise<JoinState> {
  const raw = { name: form.get("name"), phone: form.get("phone"), marketing_agree: form.get("marketing_agree") };
  const values = { name: String(raw.name ?? ""), phone: String(raw.phone ?? ""), marketing_agree: raw.marketing_agree === "on" };
  if (form.get("agree_terms") !== "on") return { ...values, error: "이용약관과 개인정보 수집·이용에 동의해 주세요." };
  const v = validateCustomer(raw);
  if (!v.ok) return { ...values, error: v.error };
  const birth = parseBirthMd(form.get("birth_m"), form.get("birth_d"));
  if (!birth.ok) return { ...values, error: birth.error };
  const { supabase, userId, storeId } = await signedIn(slug);
  // 가입하면 「가입 축하」 쿠폰이 DB 트리거로 자동 발급된다(D17)
  // 폐쇄몰(D20): 초대 코드는 DB 트리거가 확인하고 비워 저장한다(맞으면 바로 입장, 승인제면 대기)
  const inviteCode = String(form.get("invite_code") ?? "").trim().toUpperCase() || null;
  const { error } = await supabase.from("mall_builder_store_customers").insert({ ...v.value, birth_md: birth.value, store_id: storeId, user_id: userId, invite_code: inviteCode });
  if (error && error.code !== "23505" && /초대 코드|회원 전용/.test(error.message)) return { ...values, error: error.message };
  // 이미 가입한 경우(23505)는 그대로 통과
  if (error && error.code !== "23505") return { ...values, error: "가입하지 못했습니다. 잠시 뒤 다시 시도해 주세요." };
  revalidatePath(`/s/${slug}`, "layout");
  redirect(next.startsWith(`/s/${slug}/`) ? next : `/s/${slug}/my`);
}

/** 폐쇄몰(D20): 입장 대기·반려 손님이 초대 코드로 바로 입장 */
export async function applyInviteCodeAction(slug: string, form: FormData) {
  const supabase = await createClient();
  const { data: store } = await supabase.from("mall_builder_stores").select("id").eq("slug", slug).maybeSingle();
  if (!store) back(slug, { error: "몰을 찾을 수 없습니다." });
  const { error } = await supabase.rpc("mall_builder_member_use_code", { p_store_id: store!.id, p_code: String(form.get("invite_code") ?? "") });
  revalidatePath(`/s/${slug}`, "layout");
  back(slug, error ? { error: error.message } : { ok: "초대 코드가 확인되어 입장했습니다." });
}

export async function updateProfileAction(slug: string, form: FormData) {
  const v = validateCustomer({ name: form.get("name"), phone: form.get("phone"), marketing_agree: form.get("marketing_agree") });
  if (!v.ok) back(slug, { error: v.error });
  // 생일(선택, D17 생일 쿠폰) — 월·일만
  const birth = parseBirthMd(form.get("birth_m"), form.get("birth_d"));
  if (!birth.ok) back(slug, { error: birth.error });
  const { supabase, customerId } = await myCustomer(slug);
  const { error } = await supabase.from("mall_builder_store_customers").update({ ...v.value, birth_md: birth.value }).eq("id", customerId);
  back(slug, error ? { error: error.message } : { ok: "내 정보를 저장했습니다." });
}

export async function saveAddressAction(slug: string, addressId: string | null, form: FormData) {
  const v = validateAddress(Object.fromEntries(form));
  if (!v.ok) back(slug, { error: v.error });
  const { supabase, customerId } = await myCustomer(slug);
  const { count } = await supabase.from("mall_builder_customer_addresses").select("id", { count: "exact", head: true }).eq("customer_id", customerId);
  // 첫 배송지는 자동으로 기본
  const makeDefault = v.value.is_default || !count;
  if (makeDefault) {
    const { error } = await supabase.from("mall_builder_customer_addresses").update({ is_default: false }).eq("customer_id", customerId).eq("is_default", true);
    if (error) back(slug, { error: error.message });
  }
  // 고칠 때는 기본으로 올리는 경우만 반영(체크를 빼서 기본이 사라지는 일 방지 — 기본 바꾸기는 다른 배송지의 「기본으로」)
  const { is_default: _ignored, ...fields } = v.value;
  const { error } = addressId
    ? await supabase.from("mall_builder_customer_addresses").update(makeDefault ? { ...fields, is_default: true } : fields).eq("id", addressId).eq("customer_id", customerId)
    : await supabase.from("mall_builder_customer_addresses").insert({ ...fields, is_default: makeDefault, customer_id: customerId });
  back(slug, error ? { error: error.message } : { ok: "배송지를 저장했습니다." });
}

export async function makeDefaultAddressAction(slug: string, addressId: string) {
  const { supabase, customerId } = await myCustomer(slug);
  const { error: e1 } = await supabase.from("mall_builder_customer_addresses").update({ is_default: false }).eq("customer_id", customerId).eq("is_default", true);
  if (e1) back(slug, { error: e1.message });
  const { error } = await supabase.from("mall_builder_customer_addresses").update({ is_default: true }).eq("id", addressId).eq("customer_id", customerId);
  back(slug, error ? { error: error.message } : { ok: "기본 배송지를 바꿨습니다." });
}

export async function deleteAddressAction(slug: string, addressId: string) {
  const { supabase, customerId } = await myCustomer(slug);
  const { error } = await supabase.from("mall_builder_customer_addresses").delete().eq("id", addressId).eq("customer_id", customerId);
  back(slug, error ? { error: error.message } : { ok: "배송지를 지웠습니다." });
}

/** 사업자 신청 — 파일은 브라우저가 비공개 저장소에 먼저 올리고, 여기서는 DB 함수로 신청만 기록(승인 칸은 함수만 바꾼다) */
export async function applyBusinessAction(slug: string, input: { business_no: string; company: string; ceo_name: string; cert_path: string }): Promise<{ error: string | null }> {
  const v = validateBusinessApplication(input);
  if (!v.ok) return { error: v.error };
  const { supabase, storeId } = await myCustomer(slug);
  const { error } = await supabase.rpc("mall_builder_apply_business", {
    p_store_id: storeId,
    p_business_no: v.value.business_no,
    p_company: v.value.company,
    p_ceo_name: v.value.ceo_name,
    p_cert_path: input.cert_path,
  });
  if (error) return { error: error.message };
  revalidatePath(`/s/${slug}`, "layout");
  return { error: null };
}

/** 이 몰에서만 탈퇴 — 로그인 계정과 다른 몰 가입은 그대로 */
export async function leaveStoreAction(slug: string) {
  const { supabase, customerId } = await myCustomer(slug);
  const { error } = await supabase.from("mall_builder_store_customers").delete().eq("id", customerId);
  if (error) back(slug, { error: error.message });
  revalidatePath(`/s/${slug}`, "layout");
  redirect(`/s/${slug}`);
}
