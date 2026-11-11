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
