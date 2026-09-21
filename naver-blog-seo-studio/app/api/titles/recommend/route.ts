import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { resolveApiKey } from "@/lib/apiKeys";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function POST(request: Request) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const input = await request.json().catch(() => null) as { topic?: string; keywords?: string } | null;
  const topic = input?.topic?.trim() ?? "";
  const keywords = input?.keywords?.trim() ?? "";
  if (!topic || topic.length > 300) return NextResponse.json({ error: "주제를 1~300자로 입력해주세요." }, { status: 400 });
  const supabase = await createClient();
  const apiKey = await resolveApiKey(supabase, access.user.id, "openai");
  if (!apiKey) return NextResponse.json({ code: "API_KEY_REQUIRED", error: "OpenAI API 키를 먼저 등록해주세요." }, { status: 400 });

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.8,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "네이버 블로그 SEO 편집자입니다. 검색 의도와 클릭 가능성을 고려한 한국어 제목 5개를 JSON으로 반환하세요. 형식은 {\"titles\":[{\"title\":\"제목\",\"intent\":\"검색 의도\"}]} 입니다. 과장·허위 표현은 사용하지 마세요." },
          { role: "user", content: `주제: ${topic}\n핵심 키워드: ${keywords || "없음"}` },
        ],
      }),
    });
    if (!response.ok) return NextResponse.json({ error: `제목 추천 요청에 실패했습니다. (${response.status})` }, { status: 502 });
    const data = await response.json() as { choices?: { message?: { content?: string } }[] };
    const parsed = JSON.parse(data.choices?.[0]?.message?.content ?? "{}");
    const titles = Array.isArray(parsed.titles) ? parsed.titles.slice(0, 5) : [];
    if (!titles.length) return NextResponse.json({ error: "추천 제목을 받지 못했습니다." }, { status: 502 });
    return NextResponse.json({ titles });
  } catch {
    return NextResponse.json({ error: "제목 추천 중 오류가 발생했습니다." }, { status: 502 });
  }
}
