import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";

type RecommendedTitle = { title: string; intent?: string };

function normalizeTitles(value: unknown): RecommendedTitle[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is RecommendedTitle => Boolean(item) && typeof item === "object" && "title" in item && typeof item.title === "string" && Boolean(item.title.trim()))
    .map((item) => ({ title: item.title.trim(), ...(typeof item.intent === "string" && item.intent.trim() ? { intent: item.intent.trim() } : {}) }));
}

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function PATCH(request: Request, context: { params: Promise<{ recommendationId: string }> }) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });

  const { recommendationId } = await context.params;
  const input = await request.json().catch(() => null) as { titles?: unknown; selectedTitle?: string | null } | null;
  const titles = normalizeTitles(input?.titles);
  const selectedTitle = input?.selectedTitle?.trim() || null;
  if (titles.length > 8) return NextResponse.json({ error: "제목 추천은 최대 8개까지 저장할 수 있습니다." }, { status: 400 });
  if (titles.some((item) => item.title.length > 150)) return NextResponse.json({ error: "제목은 150자 이하로 입력해주세요." }, { status: 400 });
  if (selectedTitle && !titles.some((item) => item.title === selectedTitle)) return NextResponse.json({ error: "선택한 제목이 저장 목록에 없습니다." }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("naver_blog_seo_title_recommendations")
    .update({ titles, selected_title: selectedTitle, updated_at: new Date().toISOString() })
    .eq("id", recommendationId)
    .eq("user_id", access.user.id)
    .select("id, topic, keywords, titles, selected_title, created_at, updated_at")
    .maybeSingle();
  if (error) return NextResponse.json({ error: "제목 추천 저장에 실패했습니다." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "수정할 제목 추천을 찾지 못했습니다." }, { status: 404 });
  return NextResponse.json({ recommendation: { ...data, titles: normalizeTitles(data.titles) } });
}
