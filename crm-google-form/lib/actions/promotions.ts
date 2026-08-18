"use server";

import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { sendRcs } from "@/lib/solapi/client";

export interface PromotionSendResult {
  name: string | null;
  phone: string;
  ok: boolean;
  error?: string;
}

export interface SendRcsPromotionState {
  error?: string;
  results?: PromotionSendResult[];
}

/**
 * 선택된 접수자들에게 RCS 프로모션 메시지를 한 번에 발송한다(자동화 규칙이 아니라 즉시
 * 1회성 발송) — SOLAPI /crm 페이지가 소개한 "RCS 프로모션 메시지" 활용 제안을 구현한
 * 것. 실제 비용이 발생하는 대량 발송이라 반드시 사용자가 화면에서 수신자를 직접 선택하고
 * 버튼을 눌러야만 실행된다.
 */
export async function sendRcsPromotionAction(formData: FormData): Promise<SendRcsPromotionState> {
  const user = await requireProgramAccess();

  const submissionIds = formData.getAll("submissionIds").map(String);
  const messageText = String(formData.get("messageText") ?? "").trim();

  if (submissionIds.length === 0) return { error: "발송할 대상을 1명 이상 선택해주세요." };
  if (!messageText) return { error: "발송할 메시지를 입력해주세요." };

  const supabase = await createClient();

  const { data: solapiAccount, error: accountError } = await supabase
    .from("user_solapi_accounts")
    .select("api_key, api_secret, sender_phone, kakao_pf_id, rcs_brand_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (accountError || !solapiAccount) return { error: "등록된 SOLAPI 계정이 없습니다. 설정 페이지에서 먼저 등록해주세요." };
  if (!solapiAccount.rcs_brand_id) return { error: "RCS 브랜드 인증 ID가 등록되어 있지 않습니다. 설정 페이지에서 등록해주세요." };

  const { data: submissions, error: fetchError } = await supabase
    .from("crm_submissions")
    .select("id, name, phone")
    .eq("user_id", user.id)
    .in("id", submissionIds);

  if (fetchError) return { error: fetchError.message };

  const targets = (submissions ?? []).filter((s) => s.phone);
  const results: PromotionSendResult[] = [];

  for (const target of targets) {
    try {
      const text = messageText.replace(/\{name\}/g, target.name ?? "고객");
      await sendRcs(solapiAccount, target.phone as string, text);
      results.push({ name: target.name, phone: target.phone as string, ok: true });
    } catch (err) {
      results.push({
        name: target.name,
        phone: target.phone as string,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { results };
}
