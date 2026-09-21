import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { resolveApiKey } from "@/lib/apiKeys";
import { generateSeoDraft } from "@/lib/ai/generator";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const strategies = new Set(["C-Rank 기본", "ALCON", "AEO", "홈판 스토리", "인사이트 엣지"]);

export async function POST(request: Request) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });

  const input = await request.json().catch(() => null) as { topic?: string; keywords?: string; strategy?: string; selectedTitle?: string } | null;
  const topic = input?.topic?.trim() ?? "";
  const strategy = input?.strategy?.trim() ?? "";
  const keywords = (input?.keywords ?? "").split(",").map((keyword) => keyword.trim()).filter(Boolean).slice(0, 10);
  if (!topic || topic.length > 300) return NextResponse.json({ error: "주제를 1~300자로 입력해주세요." }, { status: 400 });
  if (!strategies.has(strategy)) return NextResponse.json({ error: "지원하지 않는 글쓰기 전략입니다." }, { status: 400 });

  const supabase = await createClient();
  const apiKey = await resolveApiKey(supabase, access.user.id, "openai");
  if (!apiKey) return NextResponse.json({ code: "API_KEY_REQUIRED", error: "OpenAI API 키를 먼저 등록해주세요." }, { status: 400 });

  try {
    const draft = await generateSeoDraft({ apiKey, topic, keywords, strategy });
    if (input?.selectedTitle?.trim()) draft.title = input.selectedTitle.trim().slice(0, 150);
    const { data: saved, error } = await supabase
      .from("naver_blog_seo_drafts")
      .insert({ user_id: access.user.id, topic, keywords, strategy, title: draft.title, body: draft.body, seo_report: draft.seoReport, status: "ready" })
      .select("id, title, body, seo_report, created_at")
      .single();
    if (error) return NextResponse.json({ error: "초안 저장에 실패했습니다." }, { status: 500 });
    return NextResponse.json({ draft: saved });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI 글 생성에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
