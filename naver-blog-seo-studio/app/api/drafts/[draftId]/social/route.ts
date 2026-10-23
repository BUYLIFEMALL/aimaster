import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { resolveApiKey } from "@/lib/apiKeys";
import { generateContentJson } from "@/lib/ai/contentJson";
import { isContentProvider, resolveContentModel } from "@/lib/ai/contentModels";
import { reviewHash } from "@/lib/draftReview";
import { buildSocialPrompt, parseSocial } from "@/lib/socialCopy";
import { draftReport, nextDraftReport, writableDraft } from "@/lib/draftWriteGuard";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 120;

// 병합 B-8(콘텐츠 메이커 → SEO 스튜디오): 원고 기반 SNS 공유 문구. 회원 본인 키·고른 모델로 1회 호출, 결과는 seo_report.social(DB 변경 없음).
export async function POST(request: Request, context: { params: Promise<{ draftId: string }> }) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const { draftId } = await context.params;
  const input = await request.json().catch(() => null) as { provider?: unknown; model?: unknown } | null;
  const provider = isContentProvider(input?.provider) ? input.provider : "openai";
  const supabase = await createClient();

  const { data: draft } = await supabase.from("naver_blog_seo_drafts").select("title, body, seo_report")
    .eq("id", draftId).eq("user_id", access.user.id).maybeSingle();
  if (!draft) return NextResponse.json({ error: "본인 원고를 찾지 못했습니다." }, { status: 404 });
  const title = String(draft.title || "").trim(), body = String(draft.body || "").trim();
  if (!title || !body) return NextResponse.json({ error: "제목과 본문을 먼저 저장해 주세요." }, { status: 400 });

  const apiKey = await resolveApiKey(supabase, access.user.id, provider);
  if (!apiKey) {
    const label = provider === "anthropic" ? "Claude" : provider === "gemini" ? "Gemini" : "OpenAI";
    return NextResponse.json({ code: "API_KEY_REQUIRED", error: `${label} API 키를 먼저 등록해주세요.` }, { status: 400 });
  }
  const model = resolveContentModel(provider, input?.model);
  let items;
  try {
    items = parseSocial(await generateContentJson({ apiKey, provider, model, ...buildSocialPrompt({ title, body, year: new Date().getFullYear() }) }));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "공유 문구를 만들지 못했습니다." }, { status: 502 });
  }
  if (!items.length) return NextResponse.json({ error: "AI가 공유 문구를 돌려주지 않았습니다. 다시 시도해 주세요." }, { status: 502 });

  const { data: latest } = await supabase.from("naver_blog_seo_drafts").select("title, body, seo_report").eq("id", draftId).eq("user_id", access.user.id).maybeSingle();
  if (!latest) return NextResponse.json({ error: "본인 원고를 찾지 못했습니다." }, { status: 404 });
  const latestReport = draftReport(latest.seo_report);
  const social = { items, at: new Date().toISOString(), bodyHash: reviewHash(title, body), model: `${provider}:${model}` };
  const { data: saved, error } = await writableDraft(supabase.from("naver_blog_seo_drafts")
    .update({ seo_report: nextDraftReport(latestReport, { social }) })
    .eq("id", draftId).eq("user_id", access.user.id), latestReport)
    .select("id, seo_report").maybeSingle();
  // 자동 포스팅 중이라 저장을 못 해도 만든 문구는 돌려준다(복사는 가능).
  if (error || !saved) return NextResponse.json({ social, saved: false });
  return NextResponse.json({ social, seoReport: saved.seo_report, saved: true });
}
