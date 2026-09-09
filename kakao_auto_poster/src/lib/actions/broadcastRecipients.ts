"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { normalizePhone, parseBroadcastRecipientsWorkbook } from "@/lib/broadcastRecipients";

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
  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  const label = String(formData.get("label") ?? "").trim();
  const groupId = String(formData.get("groupId") ?? "").trim() || null;

  if (!phone) return { error: "올바른 휴대폰 번호를 입력해주세요. (예: 01012345678)" };

  const supabase = await createClient();
  const { error } = await supabase.from("kakao_broadcast_recipients").insert({
    user_id: user.id,
    phone,
    label: label || null,
    group_id: groupId,
  });

  if (error) return { error: error.message };

  revalidatePath("/recipients");
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
 * 여러 명을 한 번에 등록한다. 한 줄에 한 명씩, "이름,전화번호"(이름 생략 시 전화번호만)
 * 형식으로 붙여넣는 방식 — crm-google-form의 RCS 프로모션 발송(sendRcsPromotionAction)이
 * 결과를 대상별로 {name, phone, ok, error} 배열로 돌려주는 것과 같은 방식으로, 줄 단위
 * 성공/실패를 리포트한다.
 */
export async function addBulkBroadcastRecipientsAction(
  _prevState: BulkAddBroadcastRecipientsState,
  formData: FormData,
): Promise<BulkAddBroadcastRecipientsState> {
  const user = await requireProgramAccess();
  const raw = String(formData.get("bulkPhones") ?? "");
  const groupId = String(formData.get("groupId") ?? "").trim() || null;
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
  const toInsert: { user_id: string; phone: string; label: string | null; group_id: string | null }[] = [];
  const seenInBatch = new Set<string>();

  for (const line of lines) {
    const parts = line.split(",").map((p) => p.trim());
    // 이름 없이 전화번호만 한 줄에 있는 경우와, "이름,전화번호" 두 열인 경우를 모두 지원한다.
    const [label, phoneRaw] = parts.length === 1 ? [null, parts[0]] : [parts[0] || null, parts[1]];
    const phone = normalizePhone(phoneRaw ?? "");

    if (!phone) {
      results.push({ line, ok: false, error: "번호 형식 오류" });
      continue;
    }
    if (existingPhones.has(phone) || seenInBatch.has(phone)) {
      results.push({ line, ok: false, error: "이미 등록됨" });
      continue;
    }
    seenInBatch.add(phone);
    toInsert.push({ user_id: user.id, phone, label, group_id: groupId });
    results.push({ line, ok: true });
  }

  if (toInsert.length > 0) {
    const { error } = await supabase.from("kakao_broadcast_recipients").insert(toInsert);
    if (error) return { error: error.message };
  }

  revalidatePath("/recipients");
  return { results };
}

export interface ImportBroadcastRecipientsState {
  error?: string;
  importedCount?: number;
  skippedCount?: number;
}

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB

/**
 * 엑셀(xlsx) 파일을 업로드해서 수신자를 대량 등록한다 — stepmail의
 * lib/actions/leads.ts의 importLeadsAction과 동일한 패턴. 이미 등록된 전화번호는
 * 건너뛴다(중복 등록 방지).
 */
export async function importBroadcastRecipientsAction(formData: FormData): Promise<ImportBroadcastRecipientsState> {
  const user = await requireProgramAccess();
  const groupId = String(formData.get("groupId") ?? "").trim() || null;

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "엑셀 파일을 선택해주세요." };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { error: "파일 용량이 너무 큽니다 (최대 5MB)." };
  }

  let parsed;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    parsed = parseBroadcastRecipientsWorkbook(buffer);
  } catch (err) {
    return { error: `엑셀 파일을 읽지 못했습니다: ${err instanceof Error ? err.message : "알 수 없는 오류"}` };
  }

  if (parsed.length === 0) {
    return { error: "가져올 수신자가 없습니다 (전화번호 컬럼을 확인해주세요)." };
  }

  const supabase = await createClient();
  const { data: existing } = await supabase.from("kakao_broadcast_recipients").select("phone").eq("user_id", user.id);
  const existingPhones = new Set((existing ?? []).map((r) => r.phone));

  const toInsert = parsed
    .filter((row) => !existingPhones.has(row.phone))
    .map((row) => ({ user_id: user.id, phone: row.phone, label: row.label, group_id: groupId }));
  const skippedCount = parsed.length - toInsert.length;

  if (toInsert.length > 0) {
    const { error } = await supabase.from("kakao_broadcast_recipients").insert(toInsert);
    if (error) return { error: error.message };
  }

  revalidatePath("/recipients");
  return { importedCount: toInsert.length, skippedCount };
}

export async function deleteBroadcastRecipientAction(id: string) {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  await supabase.from("kakao_broadcast_recipients").delete().eq("id", id).eq("user_id", user.id);

  revalidatePath("/recipients");
}

export interface UpdateBroadcastRecipientState {
  error?: string;
}

/** 삭제 버튼 옆 "수정"으로 이름/전화번호를 고친다. */
export async function updateBroadcastRecipientAction(
  id: string,
  values: { label: string; phone: string },
): Promise<UpdateBroadcastRecipientState> {
  const user = await requireProgramAccess();
  const phone = normalizePhone(values.phone);
  if (!phone) return { error: "올바른 휴대폰 번호를 입력해주세요. (예: 01012345678)" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("kakao_broadcast_recipients")
    .update({ phone, label: values.label.trim() || null })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/recipients");
  return {};
}

/** 수신자 목록 화면의 그룹 선택 드롭다운에서 즉시 저장하는 그룹 이동 기능. */
export async function moveBroadcastRecipientGroupAction(id: string, groupId: string | null): Promise<{ error?: string }> {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { error } = await supabase
    .from("kakao_broadcast_recipients")
    .update({ group_id: groupId })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/recipients");
  return {};
}

/** 체크박스로 선택한 여러 수신자를 한 번에 원하는 그룹으로 이동한다. */
export async function moveManyBroadcastRecipientsGroupAction(
  ids: string[],
  groupId: string | null,
): Promise<{ error?: string }> {
  const user = await requireProgramAccess();
  if (ids.length === 0) return {};
  const supabase = await createClient();

  const { error } = await supabase
    .from("kakao_broadcast_recipients")
    .update({ group_id: groupId })
    .eq("user_id", user.id)
    .in("id", ids);

  if (error) return { error: error.message };

  revalidatePath("/recipients");
  return {};
}
