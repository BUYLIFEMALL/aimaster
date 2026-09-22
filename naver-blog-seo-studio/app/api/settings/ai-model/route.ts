import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { isOpenAIContentModel } from "@/lib/ai/openaiModels";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const input = await request.json().catch(() => null) as { model?: unknown } | null;
  if (!isOpenAIContentModel(input?.model)) return NextResponse.json({ error: "지원하지 않는 OpenAI 생성모델입니다." }, { status: 400 });

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ data: { naver_blog_seo_openai_model: input.model } });
  if (error) return NextResponse.json({ error: "OpenAI 생성모델 저장에 실패했습니다." }, { status: 500 });
  return NextResponse.json({ ok: true, model: input.model });
}
