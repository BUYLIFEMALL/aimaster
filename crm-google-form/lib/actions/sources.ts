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

type NotifyChannel = "notify_email" | "notify_telegram" | "notify_sms" | "notify_alimtalk" | "notify_friendtalk";

export async function toggleNotifyChannelAction(
  sourceId: string,
  channel: NotifyChannel,
  value: boolean,
): Promise<{ error?: string }> {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { error } = await supabase
    .from("crm_form_sources")
    .update({ [channel]: value } as Partial<Record<NotifyChannel, boolean>>)
    .eq("id", sourceId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/sources");
  return {};
}

/** 알림톡 템플릿ID와, "#{변수명}=구글폼 질문 제목" 형식(줄바꿈 구분)의 변수 매핑을 저장한다. */
export async function updateKakaoConfigAction(
  sourceId: string,
  formData: FormData,
): Promise<FormSourceActionState> {
  const user = await requireProgramAccess();

  const templateId = String(formData.get("kakaoTemplateId") ?? "").trim() || null;
  const variablesRaw = String(formData.get("kakaoVariables") ?? "");

  const variables: Record<string, string> = {};
  for (const line of variablesRaw.split("\n")) {
    const [key, ...rest] = line.split("=");
    const trimmedKey = key?.trim();
    const value = rest.join("=").trim();
    if (trimmedKey && value) variables[trimmedKey] = value;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("crm_form_sources")
    .update({ kakao_template_id: templateId, kakao_variables: variables })
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
