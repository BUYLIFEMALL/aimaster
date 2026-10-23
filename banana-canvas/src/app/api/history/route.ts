import { checkProgramAccessApi } from "@/lib/access";
import { ideaSourceName } from "@/lib/bnc/ideaParam";
import { json } from "@/lib/aiRoute";
import { createAdminClient } from "@/lib/supabase/admin";
import { signUrls } from "@/lib/files";
import type { OutputItem } from "@/lib/bnc/types";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET() {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return json({ error: access.error }, access.status);
  const { data, error } = await createAdminClient()
    .from("banana_canvas_results")
    .select("id, kind, title, prompt, model_used, favorite, outputs, created_at, idea_source:options->>ideaSource")
    .eq("user_id", access.user.id)
    .order("created_at", { ascending: false })
    .limit(60);
  if (error) return json({ error: "기록을 불러오지 못했습니다." }, 500);
  const firsts = (data ?? []).map((r) => ((r.outputs as OutputItem[]) ?? []).find((o) => o.path)?.path ?? "");
  const urls = await signUrls(firsts);
  return json({
    items: (data ?? []).map((r, i) => ({
      id: r.id, kind: r.kind, title: r.title, prompt: r.prompt, model: r.model_used, favorite: r.favorite, created_at: r.created_at, ideaSource: ideaSourceName(r.idea_source) ?? null,
      count: ((r.outputs as OutputItem[]) ?? []).filter((o) => o.path).length, cover: firsts[i] ? urls[firsts[i]] ?? null : null,
    })),
  });
}
