import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { generatedModelRecord } from "@/lib/ai/contentModels";
import { getUserOpenAIContentModel } from "@/lib/ai/openaiModels";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function POST(request: Request) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const input = await request.json().catch(() => null) as { title?: string; body?: string; topic?: string; keywords?: string; strategy?: string; openaiModel?: unknown } | null;
  // 최적화는 OpenAI로만 하므로 /api/drafts/optimize와 같은 규칙으로 모델을 정해 기록한다(값을 안 보내는 옛 화면은 계정 기본값).
  const model = getUserOpenAIContentModel(access.user.user_metadata, input?.openaiModel);
  const title = input?.title?.trim() ?? "";
  const body = input?.body?.trim() ?? "";
  const topic = input?.topic?.trim() ?? title;
  const keywords = (input?.keywords ?? "").split(",").map((item) => item.trim()).filter(Boolean).slice(0, 10);
  if (!title || title.length > 150 || body.length < 120 || body.length > 20_000 || !topic || topic.length > 300) {
    return NextResponse.json({ error: "제목, 주제와 120~20,000자 본문을 확인해주세요." }, { status: 400 });
  }
  const supabase = await createClient();
  const { data, error } = await supabase.from("naver_blog_seo_drafts")
    .insert({ user_id: access.user.id, topic, keywords, strategy: input?.strategy?.trim() || "기존 글 최적화", title, body, seo_report: { source: "optimized", generatedModel: generatedModelRecord("openai", model) }, status: "ready" })
    .select("id, topic, keywords, strategy, title, body, seo_report, created_at")
    .single();
  if (error) return NextResponse.json({ error: "최적화한 초안을 저장하지 못했습니다." }, { status: 500 });
  return NextResponse.json({ draft: data });
}
