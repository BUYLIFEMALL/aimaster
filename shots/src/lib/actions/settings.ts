"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { ALL_PROVIDERS } from "@/lib/apiKeys";
import type { ApiKeyProvider } from "@/types/database.types";

export interface SaveApiKeyState {
  error?: string;
  success?: boolean;
}

export async function saveApiKeyAction(
  _prevState: SaveApiKeyState,
  formData: FormData,
): Promise<SaveApiKeyState> {
  const user = await requireProgramAccess();
  const provider = String(formData.get("provider")) as ApiKeyProvider;
  const apiKey = String(formData.get("apiKey") ?? "").trim();

  if (!ALL_PROVIDERS.includes(provider)) {
    return { error: "알 수 없는 provider입니다." };
  }
  if (!apiKey) {
    return { error: "API 키를 입력해주세요." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("user_api_keys")
    .upsert({ user_id: user.id, provider, api_key: apiKey }, { onConflict: "user_id,provider" });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/settings");
  return { success: true };
}

export async function deleteApiKeyAction(formData: FormData) {
  const user = await requireProgramAccess();
  const provider = String(formData.get("provider")) as ApiKeyProvider;
  const supabase = await createClient();

  await supabase
    .from("user_api_keys")
    .delete()
    .eq("user_id", user.id)
    .eq("provider", provider);

  revalidatePath("/settings");
}

export interface SaveVoiceIdState {
  error?: string;
  success?: boolean;
}

/**
 * 최종 영상 렌더링(JSON2Video)의 내레이션 음성(ElevenLabs) 설정을 저장한다.
 * Voice ID만 있으면 JSON2Video 자체 ElevenLabs 연동(크레딧)으로 동작한다. Connection ID는
 * 본인 ElevenLabs 계정의 비공개 커스텀 음성을 쓸 때만 필요한 선택 사항이다 — json2video.com
 * 대시보드의 "Connections"에서 미리 연결한 뒤 그 연결에 붙인 ID(예: "my-elevenlabs")를 저장한다.
 */
export async function saveVoiceIdAction(
  _prevState: SaveVoiceIdState,
  formData: FormData,
): Promise<SaveVoiceIdState> {
  const user = await requireProgramAccess();
  const voiceId = String(formData.get("elevenlabsVoiceId") ?? "").trim();
  const connectionId = String(formData.get("elevenlabsConnectionId") ?? "").trim();
  if (!voiceId) {
    return { error: "Voice ID를 입력해주세요." };
  }
  // 흔한 실수 방지: Connection ID엔 json2video.com에서 직접 정한 "이름"(예: my-elevenlabs)이
  // 들어가야 하는데, 그 옆 apikey 칸에 넣는 실제 ElevenLabs API 키(sk_로 시작, 매우 김)를
  // 잘못 붙여넣는 경우가 있어 미리 걸러준다.
  if (connectionId && (connectionId.startsWith("sk_") || connectionId.length > 40)) {
    return {
      error:
        "Connection ID에 API 키가 아니라 json2video.com에서 직접 정한 이름(예: my-elevenlabs)을 입력해주세요.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("user_render_settings").upsert(
    { user_id: user.id, elevenlabs_voice_id: voiceId, elevenlabs_connection_id: connectionId || null },
    { onConflict: "user_id" },
  );
  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { success: true };
}

export async function deleteVoiceIdAction() {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  await supabase.from("user_render_settings").delete().eq("user_id", user.id);

  revalidatePath("/settings");
}
