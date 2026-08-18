"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";

export interface FormSourceActionState {
  error?: string;
}

export async function createFormSourceAction(formData: FormData): Promise<FormSourceActionState> {
  const user = await requireProgramAccess();
  const name = String(formData.get("name") ?? "").trim();

  if (!name) return { error: "폼 이름을 입력해주세요." };

  const supabase = await createClient();
  const { error } = await supabase.from("crm_form_sources").insert({
    user_id: user.id,
    name,
  });

  if (error) return { error: error.message };

  revalidatePath("/sources");
  return {};
}

/** 질문 제목 -> 표준 필드(name/phone/email) 매핑을 저장한다. 빈 값은 매핑 해제로 처리한다. */
export async function updateFieldMappingAction(
  sourceId: string,
  formData: FormData,
): Promise<FormSourceActionState> {
  const user = await requireProgramAccess();

  const nameQuestion = String(formData.get("nameQuestion") ?? "").trim();
  const phoneQuestion = String(formData.get("phoneQuestion") ?? "").trim();
  const emailQuestion = String(formData.get("emailQuestion") ?? "").trim();

  const fieldMapping: Record<string, string> = {};
  if (nameQuestion) fieldMapping.name = nameQuestion;
  if (phoneQuestion) fieldMapping.phone = phoneQuestion;
  if (emailQuestion) fieldMapping.email = emailQuestion;

  const supabase = await createClient();
  const { error } = await supabase
    .from("crm_form_sources")
    .update({ field_mapping: fieldMapping })
    .eq("id", sourceId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/sources");
  return {};
}

export async function toggleNotifyChannelAction(
  sourceId: string,
  channel: "notify_email" | "notify_telegram",
  value: boolean,
): Promise<{ error?: string }> {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const updatePayload = channel === "notify_email" ? { notify_email: value } : { notify_telegram: value };
  const { error } = await supabase
    .from("crm_form_sources")
    .update(updatePayload)
    .eq("id", sourceId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/sources");
  return {};
}

export async function toggleFormSourceActiveAction(
  sourceId: string,
  isActive: boolean,
): Promise<{ error?: string }> {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { error } = await supabase
    .from("crm_form_sources")
    .update({ is_active: isActive })
    .eq("id", sourceId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/sources");
  return {};
}

export async function deleteFormSourceAction(sourceId: string): Promise<{ error?: string }> {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { error } = await supabase
    .from("crm_form_sources")
    .delete()
    .eq("id", sourceId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/sources");
  return {};
}
