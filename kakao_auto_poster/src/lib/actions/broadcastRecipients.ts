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

export interface BulkAddResultRow {
  line: string;
  ok: boolean;
  error?: string;
}

export interface BulkAddBroadcastRecipientsState {
  error?: string;
  results?: BulkAddResultRow[];
}

/**
 * 여러 명을 한 번에 등록한다. 한 줄에 한 명씩, "전화번호" 또는 "전화번호,이름" 형식으로
 * 붙여넣는 방식 — crm-google-form의 RCS 프로모션 발송(sendRcsPromotionAction)이 결과를
 * 대상별로 {name, phone, ok, error} 배열로 돌려주는 것과 같은 방식으로, 줄 단위 성공/실패를
 * 리포트한다.
 */
export async function addBulkBroadcastRecipientsAction(
  _prevState: BulkAddBroadcastRecipientsState,
  formData: FormData,
): Promise<BulkAddBroadcastRecipientsState> {
  const user = await requireProgramAccess();
  const raw = String(formData.get("bulkPhones") ?? "");
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return { error: "등록할 전화번호를 한 줄에 한 명씩 입력해주세요." };
  if (lines.length > 500) return { error: "한 번에 최대 500명까지만 등록할 수 있습니다." };

  const supabase = await createClient();
  const { data: existing } = await supabase.from("kakao_broadcast_recipients").select("phone").eq("user_id", user.id);
  const existingPhones = new Set((existing ?? []).map((r) => r.phone));

  const results: BulkAddResultRow[] = [];
  const toInsert: { user_id: string; phone: string; label: string | null }[] = [];
  const seenInBatch = new Set<string>();

  for (const line of lines) {
    const [phoneRaw, ...labelParts] = line.split(",");
    const phone = (phoneRaw ?? "").replace(/[^0-9]/g, "");
    const label = labelParts.join(",").trim() || null;

    if (!/^0\d{9,10}$/.test(phone)) {
      results.push({ line, ok: false, error: "번호 형식 오류" });
      continue;
    }
    if (existingPhones.has(phone) || seenInBatch.has(phone)) {
      results.push({ line, ok: false, error: "이미 등록됨" });
      continue;
    }
    seenInBatch.add(phone);
    toInsert.push({ user_id: user.id, phone, label });
    results.push({ line, ok: true });
  }

  if (toInsert.length > 0) {
    const { error } = await supabase.from("kakao_broadcast_recipients").insert(toInsert);
    if (error) return { error: error.message };
  }

  revalidatePath("/settings");
  return { results };
}

export async function deleteBroadcastRecipientAction(id: string) {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  await supabase.from("kakao_broadcast_recipients").delete().eq("id", id).eq("user_id", user.id);

  revalidatePath("/settings");
}
