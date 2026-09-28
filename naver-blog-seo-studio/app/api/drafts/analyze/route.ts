import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { resolveApiKey } from "@/lib/apiKeys";
import { getUserOpenAIContentModel } from "@/lib/ai/openaiModels";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function POST(request: Request) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const input = await request.json().catch(() => null) as { body?: string } | null;
  const body = input?.body?.trim() ?? "";
  if (body.length < 50 || body.length > 20_000) return NextResponse.json({ error: "분석할 글을 50~20,000자로 입력해주세요." }, { status: 400 });
  const supabase = await createClient();
  const apiKey = await resolveApiKey(supabase, access.user.id, "openai");
  if (!apiKey) return NextResponse.json({ code: "API_KEY_REQUIRED", error: "OpenAI API 키를 먼저 등록해주세요." }, { status: 400 });

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: getUserOpenAIContentModel(access.user.user_metadata),
        temperature: 0.35,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "네이버 블로그 SEO 분석가입니다. 입력 글에서 확인 가능한 내용만 분석하세요. 사실을 추가하거나 검색량·순위를 추측하지 마세요. JSON 형식 {\"topic\":\"...\",\"coreKeywords\":[\"...\"],\"relatedKeywords\":[\"...\"],\"searchIntent\":\"...\",\"targetReader\":\"...\",\"strengths\":[\"...\"],\"improvements\":[\"...\"],\"suggestedTitle\":\"...\",\"outline\":[\"...\"]}로만 답하세요." },
          { role: "user", content: `분석할 기존 글:\n${body}` },
        ],
      }),
    });
    if (!response.ok) return NextResponse.json({ error: `글 분석 요청에 실패했습니다. (${response.status})` }, { status: 502 });
    const data = await response.json() as { choices?: { message?: { content?: string } }[] };
    const parsed = JSON.parse(data.choices?.[0]?.message?.content ?? "{}") as Record<string, unknown>;
    if (typeof parsed.topic !== "string" || !parsed.topic.trim()) throw new Error("핵심 주제를 받지 못했습니다.");
    const list = (key: string, limit: number) => Array.isArray(parsed[key]) ? parsed[key].filter((item): item is string => typeof item === "string" && Boolean(item.trim())).map((item) => item.trim()).slice(0, limit) : [];
    return NextResponse.json({ analysis: {
      topic: parsed.topic.trim().slice(0, 300), coreKeywords: list("coreKeywords", 7), relatedKeywords: list("relatedKeywords", 10),
      searchIntent: typeof parsed.searchIntent === "string" ? parsed.searchIntent.trim().slice(0, 500) : "",
      targetReader: typeof parsed.targetReader === "string" ? parsed.targetReader.trim().slice(0, 500) : "",
      strengths: list("strengths", 5), improvements: list("improvements", 8),
      suggestedTitle: typeof parsed.suggestedTitle === "string" ? parsed.suggestedTitle.trim().slice(0, 150) : "",
      outline: list("outline", 6),
    } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "글 분석 중 오류가 발생했습니다." }, { status: 502 });
  }
}
