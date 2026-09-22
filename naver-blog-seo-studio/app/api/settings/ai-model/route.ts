import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { isOpenAIContentModel } from "@/lib/ai/openaiModels";
import { isGeminiImageModel } from "@/lib/ai/geminiModels";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const input = await request.json().catch(() => null) as { model?: unknown; geminiModel?: unknown } | null;
  if (input?.model !== undefined && !isOpenAIContentModel(input.model)) return NextResponse.json({ error: "지원하지 않는 OpenAI 생성모델입니다." }, { status: 400 });
  if (input?.geminiModel !== undefined && !isGeminiImageModel(input.geminiModel)) return NextResponse.json({ error: "지원하지 않는 Gemini 이미지 생성모델입니다." }, { status: 400 });
  if (input?.model === undefined && input?.geminiModel === undefined) return NextResponse.json({ error: "저장할 생성모델을 선택해주세요." }, { status: 400 });

  const supabase = await createClient();
  const metadata = input.model !== undefined ? { naver_blog_seo_openai_model: input.model } : { naver_blog_seo_gemini_model: input.geminiModel };
  const { error } = await supabase.auth.updateUser({ data: metadata });
  if (error) return NextResponse.json({ error: "OpenAI 생성모델 저장에 실패했습니다." }, { status: 500 });
  return NextResponse.json({ ok: true, model: input.model ?? input.geminiModel });
}
