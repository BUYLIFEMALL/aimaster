import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAccessAndKey } from "@/lib/routeGuard";
import { downloadImage, getOwnedProject } from "@/lib/projects";
import { generateJson, imagePart } from "@/lib/gemini";
import { VIDEO_PROMPT_SCHEMA, buildVideoPrompt } from "@/lib/storyboard/prompts";
import { normalizeVideoPrompts } from "@/lib/storyboard/validate";
import { DURATION_OPTIONS, type DialogueMode } from "@/lib/storyboard/types";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 120;

type Ctx = { params: Promise<{ id: string }> };

/** POST — 마스터 시트를 영상 생성 AI용 프롬프트(마스터 프롬프트 + 장면별 + JSON)로 바꾼다 */
export async function POST(req: NextRequest, ctx: Ctx) {
  const a = await requireAccessAndKey();
  if (a.error) return a.error;
  const { id } = await ctx.params;
  const p = await getOwnedProject(a.user.id, id);
  if (!p || !p.master_path) return NextResponse.json({ error: "먼저 마스터 이미지를 만들어 주세요." }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const seconds = Number(body?.duration);
  if (!DURATION_OPTIONS.some((d) => d.seconds === seconds)) return NextResponse.json({ error: "영상 길이를 선택해 주세요." }, { status: 400 });
  const dialogue: DialogueMode = body?.dialogue === "ko" || body?.dialogue === "en" ? body.dialogue : "none";
  const lang = p.lang === "en" ? "en" : "ko";

  const master = await downloadImage(p.master_path);
  if (!master) return NextResponse.json({ error: "저장된 이미지를 읽지 못했습니다." }, { status: 500 });

  const result = await generateJson(a.apiKey, [imagePart(master), { text: buildVideoPrompt({ totalSeconds: seconds, dialogue, lang }) }], VIDEO_PROMPT_SCHEMA);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  const prompts = normalizeVideoPrompts(result.data, seconds, dialogue);
  if (!prompts) return NextResponse.json({ error: "AI가 장면 9개의 프롬프트를 완성하지 못했습니다. 다시 시도해 주세요." }, { status: 502 });

  const { error } = await createAdminClient()
    .from("storyboard_projects")
    .update({ video_prompts: prompts, video_settings: { duration: seconds, dialogue }, status: "prompts", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", a.user.id);
  if (error) return NextResponse.json({ error: "결과를 저장하지 못했습니다." }, { status: 500 });
  return NextResponse.json({ videoPrompts: prompts, ms: result.ms });
}
