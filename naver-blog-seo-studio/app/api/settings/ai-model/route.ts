import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { CONTENT_MODEL_OPTIONS, isContentModelForProvider, isContentProvider } from "@/lib/ai/contentModels";
import { getUserOpenAIContentModel, isOpenAIContentModel } from "@/lib/ai/openaiModels";
import { isGeminiImageModel } from "@/lib/ai/geminiModels";
import { accountContentModel, ACCOUNT_MODEL_KEY } from "@/lib/savedModel";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// v1.97: 계정에 저장한 글쓰기 기본 AI와 OpenAI 전용 기능 모델 — 어느 PC에서 열어도 같게.
export async function GET() {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const meta = access.user.user_metadata;
  return NextResponse.json({ content: accountContentModel(meta, CONTENT_MODEL_OPTIONS), openaiFeature: getUserOpenAIContentModel(meta) });
}

export async function POST(request: Request) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const input = await request.json().catch(() => null) as { model?: unknown; geminiModel?: unknown; content?: { provider?: unknown; model?: unknown } } | null;
  if (input?.content !== undefined && !(isContentProvider(input.content?.provider) && isContentModelForProvider(input.content.provider, input.content.model))) return NextResponse.json({ error: "지원하지 않는 AI 모델입니다." }, { status: 400 });
  if (input?.model !== undefined && !isOpenAIContentModel(input.model)) return NextResponse.json({ error: "지원하지 않는 OpenAI 생성모델입니다." }, { status: 400 });
  if (input?.geminiModel !== undefined && !isGeminiImageModel(input.geminiModel)) return NextResponse.json({ error: "지원하지 않는 Gemini 이미지 생성모델입니다." }, { status: 400 });
  if (input?.model === undefined && input?.geminiModel === undefined && input?.content === undefined) return NextResponse.json({ error: "저장할 생성모델을 선택해주세요." }, { status: 400 });

  const supabase = await createClient();
  const metadata = input.content !== undefined
    ? { [ACCOUNT_MODEL_KEY]: { provider: input.content.provider, model: input.content.model } }
    : input.model !== undefined ? { naver_blog_seo_openai_model: input.model } : { naver_blog_seo_gemini_model: input.geminiModel };
  const { data, error } = await supabase.auth.updateUser({ data: metadata });
  if (error) return NextResponse.json({ error: "AI 모델 저장에 실패했습니다." }, { status: 500 });
  return NextResponse.json({ ok: true, model: input.model ?? input.geminiModel, content: input.content, openaiFeature: getUserOpenAIContentModel(data.user?.user_metadata) });
}
