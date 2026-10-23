import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { resolveApiKey } from "@/lib/apiKeys";
import { isContentProvider, resolveContentModel } from "@/lib/ai/contentModels";
import { requestDraftJson } from "@/lib/ai/generator";
import { stylePrompt } from "@/lib/ai/stylePrompt";
import { normalizeStyle, withStyleApproval, type StylePost } from "@/lib/style";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// BLC-08b (2026-10-22): 본인 문체 2단계 — 문체 분석(회원 본인 AI 키 1회, 자동 재시도 없음). 다시 분석하면 이전 승인은 풀린다.
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const { id } = await context.params;
  const input = await request.json().catch(() => null) as { provider?: unknown; model?: unknown } | null;
  const provider = isContentProvider(input?.provider) ? input.provider : "openai";
  const supabase = await createClient();
  const { data: style } = await supabase.from("naver_blog_seo_styles").select("id, name, samples, posts")
    .eq("id", id).eq("user_id", access.user.id).maybeSingle();
  if (!style) return NextResponse.json({ error: "내 문체 자료를 찾지 못했습니다." }, { status: 404 });
  const posts = (Array.isArray(style.posts) ? style.posts : []) as StylePost[];
  const samples = (Array.isArray(style.samples) ? style.samples : []) as string[];
  if (!posts.length && !samples.length) return NextResponse.json({ error: "먼저 블로그 글을 가져오거나 글 표본을 넣어주세요." }, { status: 400 });

  const apiKey = await resolveApiKey(supabase, access.user.id, provider);
  if (!apiKey) {
    const label = provider === "anthropic" ? "Claude" : provider === "gemini" ? "Gemini" : "OpenAI";
    return NextResponse.json({ code: "API_KEY_REQUIRED", error: `${label} API 키를 먼저 등록해주세요.` }, { status: 400 });
  }
  let profile;
  try {
    const prompt = stylePrompt(style.name, posts, samples);
    profile = normalizeStyle(await requestDraftJson(apiKey, provider, resolveContentModel(provider, input?.model), [
      { role: "system", content: prompt.system },
      { role: "user", content: prompt.user },
    ]));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "문체 분석에 실패했습니다." }, { status: 502 });
  }
  if (!profile) return NextResponse.json({ error: "문체 분석 결과가 비어 있습니다. 다시 시도해주세요." }, { status: 502 });
  const { data, error } = await supabase.from("naver_blog_seo_styles")
    .update({ profile, approved_at: null, approval_hash: null, updated_at: new Date().toISOString() })
    .eq("id", id).eq("user_id", access.user.id)
    .select("id, name, blog_id, samples, posts, profile, approved_at, approval_hash, created_at, updated_at").single();
  if (error) return NextResponse.json({ error: "분석한 문체를 저장하지 못했습니다." }, { status: 500 });
  return NextResponse.json({ style: withStyleApproval(data) });
}
