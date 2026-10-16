import { NextResponse, type NextRequest } from "next/server";
import { fail, guard, json } from "@/lib/route";
import { aiConfig } from "@/lib/aiConfig";
import { generateJson } from "@/lib/ai";
import { narrationBudget, scriptPrompt } from "@/lib/prompts";
import { clampCards, isFormat, isTone, normalizeScript, type ShortsScript } from "@/lib/script";
import { UserError } from "@/lib/errors";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 180;

// 대본 생성: 회원 본인 키로 1회(형식이 깨지거나 목표 길이보다 20% 넘게 길면 1회 재요청)
export async function POST(request: NextRequest) {
  try {
    const g = await guard(request); if (g instanceof NextResponse) return g;
    const topic = String(g.body.topic ?? "").trim().slice(0, 120);
    if (topic.length < 4) throw new UserError(400, "주제를 4자 이상 입력해 주세요.");
    const tone = isTone(g.body.tone) ? g.body.tone : "friendly";
    const format = isFormat(g.body.format) ? g.body.format : "list";
    const cards = clampCards(g.body.cards);
    const category = String(g.body.category ?? "").slice(0, 30);
    const reference = String(g.body.reference ?? "").trim().slice(0, 12000);
    const guideline = String(g.body.guideline ?? "").trim().slice(0, 3000);
    const seconds = [30, 45, 60].includes(Number(g.body.seconds)) ? Number(g.body.seconds) : undefined; // 목표 길이(선택)
    const cfg = await aiConfig(g.userId);
    const budget = seconds ? narrationBudget(seconds, cards).total : 0;
    const chars = (s: ShortsScript) => [s.intro.narration, ...s.cards.map((c) => c.narration), s.outro.narration].join("").length;
    let best: ShortsScript | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      const base = scriptPrompt({ topic, category, tone, format, cards, reference, guideline, seconds });
      // 목표 길이를 정했는데 직전 결과가 20% 넘게 길면, 한 번만 "더 짧게" 다시 요청한다(2026-10-16 실측: 60초 목표에 47% 초과 사례)
      const retryNote = best && budget ? `\n\n[다시 쓰기] 직전 대본의 내레이션이 모두 합쳐 ${chars(best)}자로 너무 깁니다. 같은 내용을 유지하되 내레이션 합계를 반드시 ${budget}자 이내로 줄여 다시 쓰세요.` : "";
      const raw = await generateJson(cfg, { ...base, prompt: base.prompt + retryNote, maxTokens: 5000 });
      const script = normalizeScript(raw, { topic, category, tone, format, cards, model: cfg.model });
      if (!script) continue;
      if (!best || Math.abs(chars(script) - budget) < Math.abs(chars(best) - budget)) best = script;
      if (!budget || chars(best) <= budget * 1.2) break;
    }
    if (best) return json({ script: best });
    throw new UserError(502, "AI가 대본을 완성하지 못했습니다. 카드 수를 줄이거나 다른 모델로 다시 시도해 주세요.");
  } catch (e) { return fail(e); }
}
