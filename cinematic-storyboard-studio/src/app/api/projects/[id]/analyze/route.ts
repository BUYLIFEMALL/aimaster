import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAccessAndKey } from "@/lib/routeGuard";
import { downloadImage, getOwnedProject } from "@/lib/projects";
import { generateJson, imagePart } from "@/lib/gemini";
import { ANALYSIS_SCHEMA, buildAnalysisPrompt } from "@/lib/storyboard/prompts";
import { normalizeAnalysis } from "@/lib/storyboard/validate";
import { LIMITS } from "@/lib/storyboard/types";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 120;

type Ctx = { params: Promise<{ id: string }> };

/** POST — 참조 이미지를 분석해 장면·스토리·연출·키프레임 9개를 만든다(다시 호출하면 재분석) */
export async function POST(req: NextRequest, ctx: Ctx) {
  const a = await requireAccessAndKey();
  if (a.error) return a.error;
  const { id } = await ctx.params;
  const p = await getOwnedProject(a.user.id, id);
  if (!p || !p.ref_path) return NextResponse.json({ error: "프로젝트를 찾을 수 없습니다." }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const lang = body?.lang === "en" ? "en" : "ko";
  const topic = typeof body?.topic === "string" ? body.topic.trim().slice(0, LIMITS.topic) : p.topic;

  const ref = await downloadImage(p.ref_path);
  if (!ref) return NextResponse.json({ error: "저장된 이미지를 읽지 못했습니다." }, { status: 500 });

  const result = await generateJson(a.apiKey, [imagePart(ref), { text: buildAnalysisPrompt({ topic, lang }) }], ANALYSIS_SCHEMA);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  const analysis = normalizeAnalysis(result.data);
  if (!analysis) return NextResponse.json({ error: "AI가 키프레임 9개를 완성하지 못했습니다. 다시 시도해 주세요." }, { status: 502 });

  const title = (analysis.story.logline || topic || p.title).slice(0, LIMITS.title);
  const { error } = await createAdminClient()
    .from("storyboard_projects")
    .update({ analysis, topic, lang, title, status: "analyzed", master_path: null, video_prompts: null, video_settings: null, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", a.user.id);
  if (error) return NextResponse.json({ error: "분석 결과를 저장하지 못했습니다." }, { status: 500 });
  return NextResponse.json({ analysis, title, ms: result.ms });
}
