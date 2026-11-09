"use server";

// 세금계산서 발행(볼타, D19) 설정 — 몰 운영자 본인 볼타 계정 키. 키는 DB 함수로만 저장(화면엔 「등록됨」만), 발행·조회는 DB 함수가 직접 부른다(0039)
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getStoreBySlug } from "@/lib/store";

export type TaxState = { error: string | null; message: string | null; managerEmail: string; businessType: string; businessItem: string };

export async function saveTaxSettingsAction(slug: string, prev: TaxState, form: FormData): Promise<TaxState> {
  const values = {
    managerEmail: String(form.get("manager_email") ?? "").trim(),
    businessType: String(form.get("business_type") ?? "").trim(),
    businessItem: String(form.get("business_item") ?? "").trim(),
  };
  const keyInput = String(form.get("api_key") ?? "").trim();
  const remove = form.get("remove_key") === "on";
  const back = (error: string | null, message: string | null): TaxState => ({ error, message, ...values });
  if (keyInput && !/^(test|live)_[A-Za-z0-9_-]{6,200}$/.test(keyInput)) return back("볼타 API 키는 test_ 또는 live_로 시작하는 키를 넣어 주세요.", null);

  const store = await getStoreBySlug(slug);
  const supabase = await createClient();
  const { error } = await supabase.rpc("mall_builder_tax_settings_save", {
    p_store_id: store.id,
    p_manager_email: values.managerEmail,
    p_business_type: values.businessType,
    p_business_item: values.businessItem,
    p_api_key: remove ? "" : keyInput || null,
  });
  if (error) return back(error.message, null);
  revalidatePath(`/s/${slug}`, "layout");
  return back(null, "저장했습니다. 「연결 시험」으로 키를 확인해 보세요.");
}

/** 연결 시험(포인트 차감 없음) — 발급자 목록 조회 */
export async function testTaxKeyAction(slug: string, prev: TaxState): Promise<TaxState> {
  const store = await getStoreBySlug(slug);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("mall_builder_tax_key_test", { p_store_id: store.id });
  if (error) return { ...prev, error: error.message, message: null };
  const r = data as { ok: boolean; message?: string };
  return r.ok ? { ...prev, error: null, message: "볼타에 연결됐습니다. 공동인증서는 볼타 화면에서 등록해 두어야 발행됩니다." } : { ...prev, error: r.message ?? "연결하지 못했습니다.", message: null };
}
