import { NextResponse } from "next/server";
import { authorize, parseEngine, requireOwnKey } from "@/lib/cardnews/apiGuard";
import { callLlm, LlmError } from "@/lib/ai/llm";
import { buildTopicsPrompt, parseTopics } from "@/lib/ai/copyPrompts";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const gate = await authorize();
    if (!gate.ok) return gate.response;

    const body = (await request.json()) as Record<string, unknown>;
    const category = typeof body.category === "string" ? body.category.trim().slice(0, 40) : "";
    if (!category) return NextResponse.json({ error: "분야를 먼저 선택해주세요." }, { status: 400 });

    const engine = parseEngine(body.engine);
    if (!engine.ok) return engine.response;
    const key = await requireOwnKey(gate.auth.user.id, engine.provider, engine.label);
    if (!key.ok) return key.response;

    const prompt = buildTopicsPrompt(category);
    const text = await callLlm({ provider: engine.provider, model: engine.model, apiKey: key.apiKey, system: prompt.system, user: prompt.user, json: true });
    const topics = parseTopics(text);
    if (!topics) return NextResponse.json({ error: "AI 응답을 읽지 못했습니다. 다시 시도해주세요." }, { status: 502 });
    return NextResponse.json({ topics });
  } catch (err) {
    if (err instanceof LlmError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("topics error:", String((err as Error)?.message ?? "").slice(0, 200));
    return NextResponse.json({ error: "주제 추천 중 오류가 발생했습니다. 잠시 뒤 다시 시도해주세요." }, { status: 500 });
  }
}
