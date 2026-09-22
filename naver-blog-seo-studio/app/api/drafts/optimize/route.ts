import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { resolveApiKey } from "@/lib/apiKeys";
import { createClient } from "@/lib/supabase/server";
import { getUserOpenAIContentModel } from "@/lib/ai/openaiModels";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function POST(request: Request) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const input = await request.json().catch(() => null) as { body?: string; keywords?: string } | null;
  const body = input?.body?.trim() ?? "";
  const keywords = input?.keywords?.trim() ?? "";
  if (!body || body.length < 50 || body.length > 20000) return NextResponse.json({ error: "기존 글을 50~20,000자로 입력해주세요." }, { status: 400 });
  const supabase = await createClient();
  const apiKey = await resolveApiKey(supabase, access.user.id, "openai");
  if (!apiKey) return NextResponse.json({ code: "API_KEY_REQUIRED", error: "OpenAI API 키를 먼저 등록해주세요." }, { status: 400 });

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: getUserOpenAIContentModel(access.user.user_metadata),
        temperature: 0.55,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "네이버 블로그 SEO 편집자입니다. 기존 글의 핵심 의미와 사실은 유지하면서 제목과 본문을 자연스럽게 개선하세요. 키워드 과다 반복, 허위 과장, 확인되지 않은 사실은 피하세요. JSON 형식 {\"title\":\"...\",\"body\":\"...\",\"improvements\":[\"...\"]}로만 답하세요." },
          { role: "user", content: `핵심 키워드: ${keywords || "없음"}\n\n기존 글:\n${body}` },
        ],
      }),
    });
    if (!response.ok) return NextResponse.json({ error: `기존 글 최적화 요청에 실패했습니다. (${response.status})` }, { status: 502 });
    const data = await response.json() as { choices?: { message?: { content?: string } }[] };
    const result = JSON.parse(data.choices?.[0]?.message?.content ?? "{}");
    if (!result.title || !result.body) return NextResponse.json({ error: "최적화 결과를 받지 못했습니다." }, { status: 502 });
    return NextResponse.json({ result: { title: result.title, body: result.body, improvements: Array.isArray(result.improvements) ? result.improvements.slice(0, 8) : [] } });
  } catch {
    return NextResponse.json({ error: "기존 글 최적화 중 오류가 발생했습니다." }, { status: 502 });
  }
}
