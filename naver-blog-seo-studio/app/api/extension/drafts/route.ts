import { NextResponse } from "next/server";
import { verifyExtensionToken } from "@/lib/extensionAuth";
import { resolveApiKey } from "@/lib/apiKeys";
import { generateSeoDraft } from "@/lib/ai/generator";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function POST(request: Request) {
  const user = await verifyExtensionToken(request);
  if (!user) return NextResponse.json({ error: "유효하지 않은 연동 토큰이거나 이용 권한이 없습니다." }, { status: 401 });

  const input = await request.json().catch(() => null) as { topic?: string; keywords?: string; strategy?: string } | null;
  const topic = input?.topic?.trim() ?? "";
  const strategy = input?.strategy?.trim() ?? "C-Rank 기본";
  const keywords = (input?.keywords ?? "").split(",").map((item) => item.trim()).filter(Boolean).slice(0, 10);
  if (!topic || topic.length > 300) return NextResponse.json({ error: "주제를 1~300자로 입력해주세요." }, { status: 400 });

  const supabase = createServiceClient();
  const apiKey = await resolveApiKey(supabase, user.userId, "openai");
  if (!apiKey) return NextResponse.json({ code: "API_KEY_REQUIRED", error: "OpenAI API 키를 먼저 등록해주세요." }, { status: 400 });

  try {
    const draft = await generateSeoDraft({ apiKey, topic, keywords, strategy });
    const { data: saved, error } = await supabase.from("naver_blog_seo_drafts").insert({
      user_id: user.userId, topic, keywords, strategy, title: draft.title, body: draft.body, seo_report: draft.seoReport, status: "ready",
    }).select("id, title, body, seo_report, created_at").single();
    if (error) return NextResponse.json({ error: "초안 저장에 실패했습니다." }, { status: 500 });
    return NextResponse.json({ ...saved, draft: saved, user: { email: user.email, name: user.name } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "AI 초안 생성에 실패했습니다." }, { status: 502 });
  }
}
