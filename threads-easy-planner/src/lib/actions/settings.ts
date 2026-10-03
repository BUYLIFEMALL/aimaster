"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AIProvider } from "@/lib/apiKeys";

export interface SaveApiKeyState {
  error?: string;
  success?: boolean;
}

const VALID_PROVIDERS: AIProvider[] = ["openai", "gemini", "anthropic"];

export async function saveApiKeyAction(formData: FormData): Promise<void> {
  const user = await requireProgramAccess();
  const provider = String(formData.get("provider")) as AIProvider;
  const apiKey = String(formData.get("apiKey") ?? "").trim();

  if (!VALID_PROVIDERS.includes(provider) || !apiKey) {
    return;
  }


  // 플랫폼 패턴 §21 준수: createAdminClient를 사용하여 RLS 에러 방어
  const admin = createAdminClient() as any;
  const { error } = await admin
    .from("user_api_keys")
    .upsert(
      { user_id: user.id, provider, api_key: apiKey },
      { onConflict: "user_id,provider" },
    );

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/settings");
}

export async function deleteApiKeyAction(formData: FormData) {
  const user = await requireProgramAccess();
  const provider = String(formData.get("provider")) as AIProvider;

  const admin = createAdminClient() as any;
  await admin
    .from("user_api_keys")
    .delete()
    .eq("user_id", user.id)
    .eq("provider", provider);


  revalidatePath("/settings");
}
