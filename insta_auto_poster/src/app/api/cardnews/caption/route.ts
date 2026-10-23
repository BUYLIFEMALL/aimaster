import { NextResponse } from "next/server";
import { authorize, parseEngine, requireOwnKey } from "@/lib/cardnews/apiGuard";
import { callLlm, LlmError } from "@/lib/cardnews/ai/llm";
import { buildCaptionPrompt, parseCaption } from "@/lib/cardnews/ai/copyPrompts";
import { TONES, type ToneId } from "@/lib/cardnews/presets";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const gate = await authorize();
    if (!gate.ok) return gate.response;

    const body = (await request.json()) as Record<string, unknown>;
    const plan = (body.plan && typeof body.plan === "object" ? body.plan : {}) as Record<string, unknown>;
    const category = typeof plan.category === "string" ? plan.category.trim().slice(0, 40) : "일반";
    const topic = typeof plan.topic === "string" ? plan.topic.trim().slice(0, 200) : "카드뉴스";
    const tone = TONES.some((t) => t.value === plan.tone) ? (plan.tone as ToneId) : "normal";

    const rawPages = Array.isArray(body.pages) ? body.pages : [];
    const pages = rawPages.map((p: any) => ({
      headline: typeof p?.headline === "string" ? p.headline.slice(0, 100) : "",
      sub: typeof p?.sub === "string" ? p.sub.slice(0, 200) : "",
    })).filter((p: { headline: string; sub: string }) => p.headline || p.sub);

    if (pages.length === 0) {
      return NextResponse.json({ error: "캡션을 생성할 카드뉴스 페이지 내용이 없습니다." }, { status: 400 });
    }

    const engine = parseEngine(body.engine);
    if (!engine.ok) return engine.response;
    const key = await requireOwnKey(gate.auth.user.id, engine.provider, engine.label);
    if (!key.ok) return key.response;

    const prompt = buildCaptionPrompt({ category, topic, tone, pages });
    const text = await callLlm({
      provider: engine.provider,
      model: engine.model,
      apiKey: key.apiKey,
      system: prompt.system,
      user: prompt.user,
      json: true,
    });

    const caption = parseCaption(text);
    if (!caption) {
      return NextResponse.json({ error: "AI 캡션 생성 형식이 맞지 않습니다. 다시 시도해주세요." }, { status: 502 });
    }

    return NextResponse.json({ caption });
  } catch (err) {
    if (err instanceof LlmError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("caption error:", String((err as Error)?.message ?? "").slice(0, 200));
    return NextResponse.json({ error: "인스타그램 캡션 생성 중 오류가 발생했습니다. 잠시 뒤 다시 시도해주세요." }, { status: 500 });
  }
}
