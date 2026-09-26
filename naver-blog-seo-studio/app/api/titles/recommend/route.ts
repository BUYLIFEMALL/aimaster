import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { resolveApiKey } from "@/lib/apiKeys";
import { createClient } from "@/lib/supabase/server";
import { getUserOpenAIContentModel } from "@/lib/ai/openaiModels";
import { getExplicitYears, getKoreaToday, hasUnrequestedYear } from "@/lib/ai/freshness";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function POST(request: Request) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const input = await request.json().catch(() => null) as { topic?: string; keywords?: string } | null;
  const topic = input?.topic?.trim() ?? "";
  const keywords = input?.keywords?.trim() ?? "";
  const today = getKoreaToday();
  const explicitYears = getExplicitYears(topic, keywords);
  if (!topic || topic.length > 300) return NextResponse.json({ error: "주제를 1~300자로 입력해주세요." }, { status: 400 });
  const supabase = await createClient();
  const apiKey = await resolveApiKey(supabase, access.user.id, "openai");
  if (!apiKey) return NextResponse.json({ code: "API_KEY_REQUIRED", error: "OpenAI API 키를 먼저 등록해주세요." }, { status: 400 });

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: getUserOpenAIContentModel(access.user.user_metadata),
        temperature: 0.8,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: `네이버 블로그 SEO 편집자입니다. 오늘은 한국 기준 ${today}입니다. 검색 의도와 클릭 가능성을 고려한 한국어 제목 후보 8개를 JSON으로 반환하세요. 형식은 {"titles":[{"title":"제목","intent":"검색 의도"}]} 입니다.

최신성 규칙:
1. 실시간 검색·뉴스·공식 자료가 제공되지 않았으므로 최신 수치, 정책, 순위, 연도별 사실을 지어내지 마세요.
2. 사용자가 주제나 키워드에 직접 쓴 연도 외에는 제목에 연도를 넣지 마세요. 특히 2024년 등 과거 연도를 임의로 붙이지 마세요.
3. "최신"이라는 표현은 시간 검증이 필요한 사실을 단정하지 않는 범위에서만 사용하고, 과장·허위 표현은 금지합니다.` },
          { role: "user", content: `주제: ${topic}\n핵심 키워드: ${keywords || "없음"}` },
        ],
      }),
    });
    if (!response.ok) return NextResponse.json({ error: `제목 추천 요청에 실패했습니다. (${response.status})` }, { status: 502 });
    const data = await response.json() as { choices?: { message?: { content?: string } }[] };
    const parsed = JSON.parse(data.choices?.[0]?.message?.content ?? "{}") as { titles?: unknown };
    const candidates = Array.isArray(parsed.titles) ? parsed.titles : [];
    const titles = candidates
      .filter((item): item is { title: string; intent?: string } => Boolean(item) && typeof item === "object" && "title" in item && typeof item.title === "string" && Boolean(item.title.trim()) && !hasUnrequestedYear(item.title, explicitYears))
      .slice(0, 5);
    if (titles.length < 5) return NextResponse.json({ error: "최신성 규칙을 만족하는 제목 5개를 받지 못했습니다. 다시 시도해주세요." }, { status: 502 });
    return NextResponse.json({ titles });
  } catch {
    return NextResponse.json({ error: "제목 추천 중 오류가 발생했습니다." }, { status: 502 });
  }
}
