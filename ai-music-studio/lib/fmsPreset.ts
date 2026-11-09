import "server-only";
// 무료음악 초안 읽기(D-11) — 회원 본인 것만, 읽기만. 서버 컴포넌트에서 쓴다.
import { requireProgramAccess } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/server";
import { isGenerationId, presetFromFmsDraft, type CreatePreset, type FmsDraftRow } from "@/lib/preset";

export async function presetFromFmsParam(fms: unknown): Promise<CreatePreset | null> {
  if (!isGenerationId(fms)) return null;
  const { user } = await requireProgramAccess();
  const { data } = await createAdminClient()
    .from("free_music_songs")
    .select("title, style_prompt, lyrics, duration_sec")
    .eq("id", fms)
    .eq("user_id", user.id)
    .maybeSingle();
  return data ? presetFromFmsDraft(data as FmsDraftRow) : null;
}
