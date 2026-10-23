import { CreateStudio } from "@/components/studio/CreateStudio";
import { requireProgramAccess } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/server";
import { isGenerationId, presetFromRow, type CreatePreset } from "@/lib/preset";
import type { GenerationRow } from "@/lib/generationTypes";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// v1.12 「이 설정으로 다시 만들기」 — ?from=<곡 번호>면 본인 곡만 읽어 화면에 미리 채운다(자동 생성 없음).
export default async function CreatePage({ searchParams }: { searchParams: { from?: string } }) {
  let preset: CreatePreset | null = null;
  if (isGenerationId(searchParams.from)) {
    const { user } = await requireProgramAccess();
    const { data } = await createAdminClient().from("ams_generations")
      .select("provider, model, prompt, title, lyrics, instrumental, duration_s, options")
      .eq("id", searchParams.from).eq("user_id", user.id).maybeSingle();
    if (data) preset = presetFromRow(data as Pick<GenerationRow, "provider" | "model" | "prompt" | "title" | "lyrics" | "instrumental" | "duration_s" | "options">);
  }
  // 곡 만들기 화면 안 결과 카드에서 눌러도 새 값으로 다시 채우도록 곡 번호를 key로
  return <CreateStudio key={preset ? searchParams.from : "new"} mode="single" preset={preset} />;
}
