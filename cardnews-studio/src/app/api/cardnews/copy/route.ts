import { NextResponse } from "next/server";
import { authorize, parseEngine, requireOwnKey } from "@/lib/cardnews/apiGuard";
import { callLlm, LlmError } from "@/lib/ai/llm";
import { buildCopyPrompt, parseCopy } from "@/lib/ai/copyPrompts";
import { buildRemakeCopyPrompt, parseRemakeAnalysis, parseRemakeCopy, VIRAL_ANGLES } from "@/lib/ai/remakePrompts";
import type { AngleId } from "@/lib/cardnews/types";
import { PAGE_COUNTS, TONES, type ToneId } from "@/lib/cardnews/presets";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const gate = await authorize();
    if (!gate.ok) return gate.response;

    const body = (await request.json()) as Record<string, unknown>;
    const plan = (body.plan && typeof body.plan === "object" ? body.plan : {}) as Record<string, unknown>;
    const category = typeof plan.category === "string" ? plan.category.trim().slice(0, 40) : "";
    const topic = typeof plan.topic === "string" ? plan.topic.trim().slice(0, 200) : "";
    const tone = TONES.some((t) => t.value === plan.tone) ? (plan.tone as ToneId) : "normal";
    const pageCount = (PAGE_COUNTS as readonly number[]).includes(plan.pageCount as number) ? (plan.pageCount as number) : 8;
    if (!category || !topic) return NextResponse.json({ error: "분야와 핵심 주제를 먼저 입력해주세요." }, { status: 400 });

    const engine = parseEngine(body.engine);
    if (!engine.ok) return engine.response;
    const key = await requireOwnKey(gate.auth.user.id, engine.provider, engine.label);
    if (!key.ok) return key.response;

    // 🔥 떡상 리메이크(v1.16): 분석 결과와 고른 관점이 있으면 리메이크 문구 프롬프트를 쓴다
    const remake = (body.remake && typeof body.remake === "object" ? body.remake : null) as Record<string, unknown> | null;
    const analysis = remake?.analysis ? parseRemakeAnalysis(JSON.stringify(remake.analysis)) : null;
    const angleId = VIRAL_ANGLES.some((a) => a.id === remake?.angleId) ? (remake!.angleId as AngleId) : null;
    const prompt = analysis && angleId
      ? buildRemakeCopyPrompt({ category, topic, tone, pageCount, analysis, angleId })
      : buildCopyPrompt({ category, topic, tone, pageCount });
    const text = await callLlm({ provider: engine.provider, model: engine.model, apiKey: key.apiKey, system: prompt.system, user: prompt.user, json: true });
    const pages = analysis && angleId ? parseRemakeCopy(text, pageCount) : parseCopy(text, pageCount);
    if (!pages) {
      return NextResponse.json({ error: `AI 응답 형식이 맞지 않습니다(${pageCount}장 필요). 다시 시도하거나 다른 모델을 선택해보세요.` }, { status: 502 });
    }
    return NextResponse.json({ pages });
  } catch (err) {
    if (err instanceof LlmError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("copy error:", String((err as Error)?.message ?? "").slice(0, 200));
    return NextResponse.json({ error: "문구 기획 중 오류가 발생했습니다. 잠시 뒤 다시 시도해주세요." }, { status: 500 });
  }
}
