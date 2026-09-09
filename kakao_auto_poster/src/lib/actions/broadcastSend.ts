"use server";

import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { sendFriendtalk } from "@/lib/solapi/client";

export interface BroadcastSendResultRow {
  label: string | null;
  phone: string;
  ok: boolean;
  error?: string;
}

export interface SendCustomBroadcastState {
  error?: string;
  results?: BroadcastSendResultRow[];
}

/**
 * 수신자 목록 화면에서 체크박스로 고른 사람들에게 자유롭게 쓴 메시지를 즉시 보낸다.
 * 리포트 자동 발송(lib/kakaoSend.ts)과 달리 대상을 직접 골라서 1회성으로 보내는
 * 용도라 알림톡(사전 승인된 고정 템플릿만 가능)은 쓸 수 없고, 브랜드메시지(자유형)로만
 * 보낸다 — crm-google-form의 sendRcsPromotionAction과 같은 성격의 기능이다. 그래서
 * 채널을 친구 추가하지 않은 사람에게는 도달하지 않는다(기본값 targeting: 'I').
 */
export async function sendCustomBroadcastAction(
  recipientIds: string[],
  message: string,
): Promise<SendCustomBroadcastState> {
  const user = await requireProgramAccess();
  const text = message.trim();

  if (recipientIds.length === 0) return { error: "발송할 대상을 1명 이상 선택해주세요." };
  if (!text) return { error: "발송할 메시지를 입력해주세요." };

  const supabase = await createClient();
  const { data: solapiAccount } = await supabase
    .from("user_solapi_accounts")
    .select("api_key, api_secret, sender_phone, kakao_pf_id, rcs_brand_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!solapiAccount) {
    return { error: "SOLAPI 계정이 등록되어 있지 않습니다. 설정 페이지에서 먼저 등록해주세요." };
  }
  if (!solapiAccount.kakao_pf_id) {
    return { error: "카카오 채널 ID(pfId)가 등록되어 있지 않습니다. 설정 페이지에서 등록해주세요." };
  }

  const { data: targets, error: fetchError } = await supabase
    .from("kakao_broadcast_recipients")
    .select("label, phone")
    .eq("user_id", user.id)
    .in("id", recipientIds);

  if (fetchError) return { error: fetchError.message };
  if (!targets || targets.length === 0) return { error: "선택한 수신자를 찾을 수 없습니다." };

  const results: BroadcastSendResultRow[] = [];
  for (const target of targets) {
    try {
      await sendFriendtalk(solapiAccount, target.phone, text);
      results.push({ label: target.label, phone: target.phone, ok: true });
    } catch (err) {
      results.push({
        label: target.label,
        phone: target.phone,
        ok: false,
        error: err instanceof Error ? err.message : "발송 실패",
      });
    }
  }

  return { results };
}
