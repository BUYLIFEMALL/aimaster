"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { normalizeEmail, normalizePhone, parseBroadcastRecipientsWorkbook } from "@/lib/broadcastRecipients";
import { DUPLICATE_GROUP_NAME, findOrCreateDuplicateGroupId } from "@/lib/duplicateGroup";

export interface AddBroadcastRecipientState {
  error?: string;
}

/**
 * 리포트를 본인뿐 아니라 함께 받아볼 사람(카카오톡 친구/구독자)에게도 보낼 수 있도록
 * 전화번호를 등록한다. 실제 발송은 SOLAPI 브랜드메시지(lib/kakaoSend.ts)를 거치므로,
 * 카카오톡 채널 친구가 아니어도 전화번호만 맞으면 도달한다. 전화번호 없이 이메일만
 * 등록하는 것도 허용한다 — 카카오 채널 없이 이메일로만 정보성 콘텐츠를 받고 싶은
 * 사람을 위한 경로다(사용자 지시, 2026-09-10). 단, 둘 다 없으면 등록할 수 없다.
 */
export async function addBroadcastRecipientAction(
  _prevState: AddBroadcastRecipientState,
  formData: FormData,
): Promise<AddBroadcastRecipientState> {
  const user = await requireProgramAccess();
  const phoneRaw = String(formData.get("phone") ?? "").trim();
  const phone = phoneRaw ? normalizePhone(phoneRaw) : null;
  const label = String(formData.get("label") ?? "").trim();
  const emailRaw = String(formData.get("email") ?? "").trim();
  const email = normalizeEmail(emailRaw);
  const groupId = String(formData.get("groupId") ?? "").trim() || null;

  if (phoneRaw && !phone) return { error: "올바른 휴대폰 번호를 입력해주세요. (예: 01012345678)" };
  if (emailRaw && !email) return { error: "이메일 형식이 올바르지 않습니다." };
  if (!phone && !email) return { error: "전화번호 또는 이메일 중 하나는 입력해주세요." };

  const supabase = await createClient();
  const { error } = await supabase.from("kakao_broadcast_recipients").insert({
    user_id: user.id,
    phone,
    label: label || null,
    email,
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
  duplicate?: boolean;
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

  if (lines.length === 0) return { error: "등록할 전화번호 또는 이메일을 한 줄에 한 명씩 입력해주세요." };
  if (lines.length > 500) return { error: "한 번에 최대 500명까지만 등록할 수 있습니다." };

  const supabase = await createClient();
  const { data: existing } = await supabase.from("kakao_broadcast_recipients").select("phone, email").eq("user_id", user.id);
  const existingPhones = new Set((existing ?? []).map((r) => r.phone).filter((p): p is string => Boolean(p)));
  const existingEmails = new Set((existing ?? []).map((r) => r.email).filter((e): e is string => Boolean(e)));

  const results: BulkAddResultRow[] = [];
  const toInsert: { user_id: string; phone: string | null; label: string | null; email: string | null; group_id: string | null }[] = [];
  const seenPhonesInBatch = new Set<string>();
  const seenEmailsInBatch = new Set<string>();
  // 전화번호나 이메일 중 하나라도 겹치면 조용히 건너뛰지 않고 "중복등록" 그룹으로 몰아서
  // 등록한다 — 회원이 직접 보고 삭제 여부를 판단할 수 있게 한다(사용자 지시, 2026-09-10).
  // 그룹은 실제로 중복이 하나라도 나올 때만 생성한다(불필요한 빈 그룹 방지).
  let duplicateGroupId: string | null = null;
  async function getDuplicateGroupId(): Promise<string> {
    if (!duplicateGroupId) duplicateGroupId = await findOrCreateDuplicateGroupId(supabase, user.id);
    return duplicateGroupId;
  }

  for (const line of lines) {
    const parts = line.split(",").map((p) => p.trim());
    // 전화번호만(1열), "이름,전화번호"(2열), "이름,전화번호,이메일"(3열) 모두 지원한다.
    // 전화번호 자리를 비워두면("친구1,,friend@example.com") 이메일 전용 등록도 가능하다.
    const label = parts.length >= 2 ? parts[0] || null : null;
    const phoneRaw = parts.length >= 2 ? parts[1] : parts[0];
    const email = parts.length >= 3 ? normalizeEmail(parts[2]) : null;
    const phone = phoneRaw ? normalizePhone(phoneRaw) : null;

    if (phoneRaw && !phone) {
      results.push({ line, ok: false, error: "번호 형식 오류" });
      continue;
    }
    if (!phone && !email) {
      results.push({ line, ok: false, error: "전화번호 또는 이메일이 필요합니다" });
      continue;
    }

    const isDuplicate =
      (phone !== null && (existingPhones.has(phone) || seenPhonesInBatch.has(phone))) ||
      (email !== null && (existingEmails.has(email) || seenEmailsInBatch.has(email)));
    if (phone) seenPhonesInBatch.add(phone);
    if (email) seenEmailsInBatch.add(email);

    const rowGroupId = isDuplicate ? await getDuplicateGroupId() : groupId;
    toInsert.push({ user_id: user.id, phone, label, email, group_id: rowGroupId });
    results.push({
      line,
      ok: true,
      duplicate: isDuplicate,
      error: isDuplicate ? `전화번호 또는 이메일이 이미 등록돼 있어 "${DUPLICATE_GROUP_NAME}" 그룹으로 분류됨` : undefined,
    });
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
  duplicateCount?: number;
}

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB

/**
 * 엑셀(xlsx) 파일을 업로드해서 수신자를 대량 등록한다 — stepmail의
 * lib/actions/leads.ts의 importLeadsAction과 동일한 패턴. 전화번호나 이메일 중 하나라도
 * 기존 수신자와 겹치면 건너뛰지 않고 "중복등록" 그룹으로 몰아서 등록한다 — 회원이 직접
 * 보고 삭제 여부를 판단할 수 있게 한다(사용자 지시, 2026-09-10).
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
    return { error: "가져올 수신자가 없습니다 (전화번호 또는 이메일 컬럼을 확인해주세요)." };
  }

  const supabase = await createClient();
  const { data: existing } = await supabase.from("kakao_broadcast_recipients").select("phone, email").eq("user_id", user.id);
  const existingPhones = new Set((existing ?? []).map((r) => r.phone).filter((p): p is string => Boolean(p)));
  const existingEmails = new Set((existing ?? []).map((r) => r.email).filter((e): e is string => Boolean(e)));

  let duplicateGroupId: string | null = null;
  let duplicateCount = 0;
  const toInsert: { user_id: string; phone: string | null; label: string | null; email: string | null; group_id: string | null }[] = [];

  for (const row of parsed) {
    const isDuplicate = (row.phone !== null && existingPhones.has(row.phone)) || (row.email !== null && existingEmails.has(row.email));
    let rowGroupId = groupId;
    if (isDuplicate) {
      duplicateCount += 1;
      if (!duplicateGroupId) duplicateGroupId = await findOrCreateDuplicateGroupId(supabase, user.id);
      rowGroupId = duplicateGroupId;
    }
    toInsert.push({ user_id: user.id, phone: row.phone, label: row.label, email: row.email, group_id: rowGroupId });
  }

  if (toInsert.length > 0) {
    const { error } = await supabase.from("kakao_broadcast_recipients").insert(toInsert);
    if (error) return { error: error.message };
  }

  revalidatePath("/recipients");
  return { importedCount: toInsert.length, skippedCount: 0, duplicateCount };
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

/** 삭제 버튼 옆 "수정"으로 이름/전화번호/이메일을 고친다. 전화번호를 비워도 이메일이 있으면 저장된다. */
export async function updateBroadcastRecipientAction(
  id: string,
  values: { label: string; phone: string; email: string },
): Promise<UpdateBroadcastRecipientState> {
  const user = await requireProgramAccess();
  const phoneTrimmed = values.phone.trim();
  const phone = phoneTrimmed ? normalizePhone(phoneTrimmed) : null;
  if (phoneTrimmed && !phone) return { error: "올바른 휴대폰 번호를 입력해주세요. (예: 01012345678)" };
  const emailTrimmed = values.email.trim();
  const email = normalizeEmail(emailTrimmed);
  if (emailTrimmed && !email) return { error: "이메일 형식이 올바르지 않습니다." };
  if (!phone && !email) return { error: "전화번호 또는 이메일 중 하나는 입력해주세요." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("kakao_broadcast_recipients")
    .update({ phone, label: values.label.trim() || null, email })
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

/**
 * 수신이 안 되는 사람을 발송 대상에서 제외/재포함한다 — stepmail 리드의 "발송제외 처리"와
 * 같은 개념. 제외된 사람은 리포트 자동 발송(lib/kakaoSend.ts)과 수동 메시지 발송
 * (lib/actions/broadcastSend.ts) 양쪽 모두에서 대상 조회 시 걸러진다.
 */
export async function toggleBroadcastRecipientExcludedAction(id: string, excluded: boolean): Promise<{ error?: string }> {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { error } = await supabase
    .from("kakao_broadcast_recipients")
    .update({ excluded })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/recipients");
  return {};
}
