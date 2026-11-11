"use server";

// 카드 결제(토스페이먼츠) 설정 — 몰 운영자 본인 토스 계정 키. 시크릿 키는 DB 함수로만 저장(화면엔 「등록됨」만), 승인·환불은 DB 함수가 직접 부른다(0028)
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getStoreBySlug } from "@/lib/store";
import { checkClientKey, checkSecretKey } from "@/lib/payment";

export type PaymentState = { error: string | null; message: string | null; clientKey: string; enabled: boolean };

export async function savePaymentAction(slug: string, _prev: PaymentState, form: FormData): Promise<PaymentState> {
  const clientKey = String(form.get("client_key") ?? "").trim();
  const secretInput = String(form.get("secret_key") ?? "").trim();
  const removeSecret = form.get("remove_secret") === "on";
  const enabled = form.get("enabled") === "on";
  const back = (error: string | null, message: string | null): PaymentState => ({ error, message, clientKey, enabled });

  const keyError = checkClientKey(clientKey) ?? checkSecretKey(secretInput);
  if (keyError) return back(keyError, null);

  const store = await getStoreBySlug(slug);
  const supabase = await createClient();
  const { error } = await supabase.rpc("mall_builder_payment_save", {
    p_store_id: store.id,
    p_client_key: clientKey,
    p_enabled: enabled,
    p_secret_key: removeSecret ? "" : secretInput || null,
  });
  if (error) return back(error.message, null);
  revalidatePath(`/s/${slug}`, "layout");
  return back(null, enabled ? "저장했습니다. 손님 주문서에 「카드 결제」가 보입니다." : "저장했습니다. 카드 결제는 꺼져 있습니다.");
}
