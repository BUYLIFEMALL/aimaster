import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { resolveApiKey } from "@/lib/apiKeys";
import { generateContentJson } from "@/lib/ai/contentJson";
import { isContentProvider, resolveContentModel } from "@/lib/ai/contentModels";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// v1.74: 회원이 본인 실제 경험을 떠올리도록 돕는 질문만 만듭니다. 경험 문장 자체는 AI가 만들지 않습니다.
export async function POST(request: Request) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const input = await request.json().catch(() => null) as { topic?: unknown; title?: unknown; keywords?: unknown; provider?: unknown; model?: unknown } | null;
  const topic = typeof input?.topic === "string" ? input.topic.trim().slice(0, 300) : "";
  const title = typeof input?.title === "string" ? input.title.trim().slice(0, 150) : "";
  const keywords = typeof input?.keywords === "string" ? input.keywords.trim().slice(0, 300) : "";
  if (!topic && !title) return NextResponse.json({ error: "주제나 제목을 먼저 입력해주세요." }, { status: 400 });
  const provider = isContentProvider(input?.provider) ? input.provider : "openai";

  const supabase = await createClient();
  const apiKey = await resolveApiKey(supabase, access.user.id, provider);
  if (!apiKey) {
    const label = provider === "anthropic" ? "Claude" : provider === "gemini" ? "Gemini" : "OpenAI";
    return NextResponse.json({ code: "API_KEY_REQUIRED", error: `${label} API 키를 먼저 등록해주세요.` }, { status: 400 });
  }

  try {
    const parsed = await generateContentJson({
      apiKey,
      provider,
      model: resolveContentModel(provider, input?.model),
      system: "당신은 블로거가 자신의 실제 경험을 떠올리도록 돕는 인터뷰어입니다. 블로거에게 물어볼 짧은 질문만 만드세요. 경험이나 답변 예시를 지어내지 마세요. 질문은 한 문장, 40자 안팎으로 구체적인 장면·수치·불편했던 점·비교·추천 대상을 묻습니다. JSON 형식 {\"questions\":[\"...\"]}로 질문 5개만 답하세요.",
      user: `주제: ${topic || "없음"}\n제목: ${title || "없음"}\n핵심 키워드: ${keywords || "없음"}`,
    });
    const questions = Array.isArray(parsed.questions)
      ? parsed.questions.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).map((item) => item.trim().slice(0, 120)).slice(0, 5)
      : [];
    if (!questions.length) throw new Error("AI가 질문을 반환하지 않았습니다. 다시 시도해주세요.");
    return NextResponse.json({ questions });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "경험 질문을 만들지 못했습니다." }, { status: 502 });
  }
}
