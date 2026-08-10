"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import type { AnalysisModel } from "@/lib/ai/models";

export interface PreferencesActionState {
  error?: string;
  success?: boolean;
}

export async function savePreferredModelAction(
  _prevState: PreferencesActionState,
  formData: FormData,
): Promise<PreferencesActionState> {
  const user = await requireProgramAccess();
  const model = String(formData.get("model") ?? "") as AnalysisModel;

  if (!model) {
    return { error: "모델을 선택해주세요." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("real_estate_user_preferences").upsert(
    { user_id: user.id, preferred_model: model, updated_at: new Date().toISOString() },
    { onConflict: "user_id" },
  );

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/settings");
  return { success: true };
}
