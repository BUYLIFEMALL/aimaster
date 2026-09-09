"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";

export interface AddBroadcastRecipientState {
  error?: string;
}

/**
 * 리포트를 본인뿐 아니라 함께 받아볼 사람(카카오톡 친구/구독자)에게도 보낼 수 있도록
 * 전화번호를 등록한다. 실제 발송은 SOLAPI 브랜드메시지(lib/kakaoSend.ts)를 거치므로,
 * 카카오톡 채널 친구가 아니어도 전화번호만 맞으면 도달한다.
 */
export async function addBroadcastRecipientAction(
  _prevState: AddBroadcastRecipientState,
  formData: FormData,
): Promise<AddBroadcastRecipientState> {
  const user = await requireProgramAccess();
  const phone = String(formData.get("phone") ?? "").replace(/[^0-9]/g, "");
  const label = String(formData.get("label") ?? "").trim();

  if (!/^0\d{9,10}$/.test(phone)) return { error: "올바른 휴대폰 번호를 입력해주세요. (예: 01012345678)" };

  const supabase = await createClient();
  const { error } = await supabase.from("kakao_broadcast_recipients").insert({
    user_id: user.id,
    phone,
    label: label || null,
  });

  if (error) return { error: error.message };

  revalidatePath("/settings");
  return {};
}

export async function deleteBroadcastRecipientAction(id: string) {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  await supabase.from("kakao_broadcast_recipients").delete().eq("id", id).eq("user_id", user.id);

  revalidatePath("/settings");
}
