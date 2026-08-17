"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess, logProgramUsage } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { parseLeadsWorkbook } from "@/lib/leads";
import type { LeadStatus } from "@/types/database.types";

export interface ImportLeadsState {
  error?: string;
  importedCount?: number;
  skippedCount?: number;
}

const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15MB
const UPSERT_BATCH_SIZE = 500;

/**
 * 엑셀(xlsx) 파일을 업로드해서 리드를 대량 등록/갱신한다. 이미 있는 이메일(user_id+email
 * unique)은 최신 정보로 덮어쓴다 — 같은 리스트를 다시 올려서 상태를 동기화하는 용도로도
 * 쓸 수 있게 upsert 방식을 쓴다.
 */
export async function importLeadsAction(formData: FormData): Promise<ImportLeadsState> {
  const user = await requireProgramAccess();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "엑셀 파일을 선택해주세요." };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { error: "파일 용량이 너무 큽니다 (최대 15MB)." };
  }

  let parsed;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    parsed = parseLeadsWorkbook(buffer);
  } catch (err) {
    return { error: `엑셀 파일을 읽지 못했습니다: ${err instanceof Error ? err.message : "알 수 없는 오류"}` };
  }

  if (parsed.length === 0) {
    return { error: "가져올 리드가 없습니다 (이메일 컬럼을 확인해주세요)." };
  }

  const supabase = await createClient();
  let importedCount = 0;
  // 입력일은 엑셀 속 날짜가 아니라, 이 가져오기가 실제로 DB에 반영되는 시점을 담는다
  // (재업로드로 갱신되는 리드도 그 시점의 입력일로 갱신됨).
  const importedAt = new Date().toISOString();

  for (let i = 0; i < parsed.length; i += UPSERT_BATCH_SIZE) {
    const batch = parsed.slice(i, i + UPSERT_BATCH_SIZE).map((row) => ({ ...row, input_date: importedAt, user_id: user.id }));
    const { error, count } = await supabase
      .from("stepmail_leads")
      .upsert(batch, { onConflict: "user_id,email", count: "exact" });
    if (error) {
      return { error: `${importedCount}건 저장 후 오류가 발생했습니다: ${error.message}` };
    }
    importedCount += count ?? batch.length;
  }

  await logProgramUsage({
    userId: user.id,
    action: "import_leads",
    quantity: importedCount,
    metadata: { fileName: file.name },
  });

  revalidatePath("/leads");
  return { importedCount, skippedCount: 0 };
}

export interface UpdateLeadStatusState {
  error?: string;
}

/** 리드 상태를 수동으로 바꾼다 (예: 수신거부 요청이 와서 "stopped"로 직접 표시). */
export async function updateLeadStatusAction(leadId: string, status: LeadStatus): Promise<UpdateLeadStatusState> {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { error } = await supabase
    .from("stepmail_leads")
    .update({ status })
    .eq("id", leadId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/leads");
  return {};
}

export async function deleteLeadAction(leadId: string): Promise<{ error?: string }> {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { error } = await supabase.from("stepmail_leads").delete().eq("id", leadId).eq("user_id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/leads");
  return {};
}

/** 체크박스로 선택한 여러 리드를 한 번에 삭제한다. */
export async function deleteLeadsAction(leadIds: string[]): Promise<{ error?: string }> {
  const user = await requireProgramAccess();
  if (leadIds.length === 0) return {};
  const supabase = await createClient();

  const { error } = await supabase.from("stepmail_leads").delete().eq("user_id", user.id).in("id", leadIds);
  if (error) return { error: error.message };
  revalidatePath("/leads");
  return {};
}

/** 체크박스로 선택한 여러 리드를 한 번에 "발송제외" 처리한다 (개별 행의 "발송제외 처리" 버튼과 동일한 동작의 일괄 버전). */
export async function bulkExcludeLeadsAction(leadIds: string[]): Promise<{ error?: string }> {
  const user = await requireProgramAccess();
  if (leadIds.length === 0) return {};
  const supabase = await createClient();

  const { error } = await supabase
    .from("stepmail_leads")
    .update({ status: "customer_completed" })
    .eq("user_id", user.id)
    .in("id", leadIds);
  if (error) return { error: error.message };
  revalidatePath("/leads");
  return {};
}
