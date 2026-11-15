"use server";

// M2-5 이용약관·개인정보 처리방침 저장 — 권한(대표만)·분양몰 막기는 DB 함수 mall_builder_policy_save가 다시 검사
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { POLICY_LABEL, cleanPolicyBody, isPolicyKind } from "@/lib/policies";

export type PolicyState = { error: string | null; message: string | null };

export async function savePolicyAction(slug: string, kind: string, _prev: PolicyState, form: FormData): Promise<PolicyState> {
  if (!isPolicyKind(kind)) return { error: "약관 종류가 올바르지 않습니다.", message: null };
  const body = cleanPolicyBody(form.get("body"));
  if (!body.ok) return { error: body.error, message: null };
  const supabase = await createClient();
  const { data: store } = await supabase.from("mall_builder_stores").select("id").eq("slug", slug).maybeSingle();
  if (!store) return { error: "몰을 찾을 수 없습니다.", message: null };
  const { error } = await supabase.rpc("mall_builder_policy_save", { p_store_id: store.id, p_kind: kind, p_body: body.value });
  if (error) return { error: error.message, message: null };
  revalidatePath(`/s/${slug}`, "layout");
  return { error: null, message: body.value ? `${POLICY_LABEL[kind]}을 저장했습니다.` : `${POLICY_LABEL[kind]}을 비웠습니다(유저 화면에서 숨김).` };
}
