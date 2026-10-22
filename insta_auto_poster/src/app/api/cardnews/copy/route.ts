import { NextResponse } from "next/server";
import { authorize, parseEngine, requireOwnKey } from "@/lib/cardnews/apiGuard";
import { callLlm, LlmError } from "@/lib/cardnews/ai/llm";
import { buildCopyPrompt, parseCopy } from "@/lib/cardnews/ai/copyPrompts";
import { buildRemakeCopyPrompt, parseRemakeAnalysis, parseRemakeCopy, VIRAL_ANGLES } from "@/lib/cardnews/ai/remakePrompts";
import type { AngleId } from "@/lib/cardnews/types";
import { COPY_WORDS, copiedPhrases } from "@/lib/cardnews/referenceCopy";
import { pageTexts, remakeGuardText } from "@/lib/cardnews/collect";
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
    const isRemake = !!(analysis && angleId);
    const prompt = isRemake
      ? buildRemakeCopyPrompt({ category, topic, tone, pageCount, analysis: analysis!, angleId: angleId! })
      : buildCopyPrompt({ category, topic, tone, pageCount });
    // v1.57 리메이크 원문(수집 캡션·받아쓰기·붙여 넣은 글) 베끼기 방지 — 공용 reference-copy-guard(연속 6어절 겹침)
    const sourceText = isRemake && typeof remake?.sourceText === "string" ? remake.sourceText.slice(0, 12000) : "";
    const ref = remakeGuardText(sourceText);
    const rule = ref ? `\n\n[원본 문장 사용 규칙] 원본 게시물의 사실·항목은 빠짐없이 쓰되, 문장은 완전히 새로 쓰세요. 원본과 연속 ${COPY_WORDS}어절 이상 같은 표현을 쓰지 마세요(숫자·고유명사는 그대로 써도 됩니다).` : "";
    const ask = async (extra = "") => {
      const text = await callLlm({ provider: engine.provider, model: engine.model, apiKey: key.apiKey, system: prompt.system, user: prompt.user + rule + extra, json: true });
      return isRemake ? parseRemakeCopy(text, pageCount) : parseCopy(text, pageCount);
    };
    // 장 안의 모든 글자 칸(제목·부제·항목·숫자 설명 등)을 모아 검사
    const textsOf = pageTexts;
    let pages = await ask();
    if (!pages) {
      return NextResponse.json({ error: `AI 응답 형식이 맞지 않습니다(${pageCount}장 필요). 다시 시도하거나 다른 모델을 선택해보세요.` }, { status: 502 });
    }
    let copied = ref ? copiedPhrases(textsOf(pages), ref) : [];
    if (copied.length) {
      const again = await ask(`\n\n[다시 쓰기] 직전 문구에 원본 문장을 그대로 옮긴 구절이 있습니다. 아래 구절은 쓰지 말고 같은 뜻을 다른 표현으로 쓰세요:\n${copied.map((c) => `- ${c}`).join("\n")}`);
      if (again) {
        const left = copiedPhrases(textsOf(again), ref);
        if (left.length < copied.length) { pages = again; copied = left; }
      }
    }
    return NextResponse.json({ pages, copied });
  } catch (err) {
    if (err instanceof LlmError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("copy error:", String((err as Error)?.message ?? "").slice(0, 200));
    return NextResponse.json({ error: "문구 기획 중 오류가 발생했습니다. 잠시 뒤 다시 시도해주세요." }, { status: 500 });
  }
}
