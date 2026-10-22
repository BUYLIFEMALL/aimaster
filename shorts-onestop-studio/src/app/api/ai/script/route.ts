import { NextResponse, type NextRequest } from "next/server";
import { fail, guard, json } from "@/lib/route";
import { aiConfig } from "@/lib/aiConfig";
import { generateJson } from "@/lib/ai";
import { narrationBudget, scriptPrompt } from "@/lib/prompts";
import { clampCards, isFormat, isTone, normalizeScript, type ShortsScript } from "@/lib/script";
import { UserError } from "@/lib/errors";
import { recordUsage } from "@/lib/usage";
import { copiedPhrases, guardText } from "@/lib/reference";

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
      const base = scriptPrompt({ topic, category, tone, format, cards, reference, guideline, seconds, guardAll: g.body.guardAll === true });
      // 목표 길이를 정했는데 직전 결과가 20% 넘게 길면, 한 번만 "더 짧게" 다시 요청한다(2026-10-16 실측: 60초 목표에 47% 초과 사례)
      const retryNote = best && budget ? `\n\n[다시 쓰기] 직전 대본의 내레이션이 모두 합쳐 ${chars(best)}자로 너무 깁니다. 같은 내용을 유지하되 내레이션 합계를 반드시 ${budget}자 이내로 줄여 다시 쓰세요.` : "";
      const raw = await generateJson(cfg, { ...base, prompt: base.prompt + retryNote, maxTokens: 5000 });
      const script = normalizeScript(raw, { topic, category, tone, format, cards, model: cfg.model });
      if (!script) continue;
      if (!best || Math.abs(chars(script) - budget) < Math.abs(chars(best) - budget)) best = script;
      if (!budget || chars(best) <= budget * 1.2) break;
    }
    // v1.30 레퍼런스 쇼츠(v1.29 받아쓰기)와 연속 6어절 이상 같은 구절이 있으면 「이 구절은 쓰지 말 것」으로 1회만 다시 요청하고 덜 겹치는 쪽을 쓴다
    const guardAll = g.body.guardAll === true; // v1.31 참고 자료 전체도 베끼기 검사(회원 선택)
    const refText = guardText(reference, guardAll);
    let copied: string[] = [];
    if (best && refText) {
      const narrations = (s: ShortsScript) => [s.intro.title, s.intro.narration, ...s.cards.flatMap((c) => [c.title, c.narration]), s.outro.narration];
      copied = copiedPhrases(narrations(best), refText);
      if (copied.length) {
        const base = scriptPrompt({ topic, category, tone, format, cards, reference, guideline, seconds, guardAll: g.body.guardAll === true });
        const note = `\n\n[다시 쓰기] 직전 대본에 레퍼런스·참고 자료 문장을 그대로 옮긴 구절이 있습니다. 아래 구절은 쓰지 말고 같은 뜻을 완전히 다른 표현·다른 상황으로 다시 쓰세요:\n${copied.map((p) => `- ${p}`).join("\n")}`;
        const raw = await generateJson(cfg, { ...base, prompt: base.prompt + note, maxTokens: 5000 });
        const again = normalizeScript(raw, { topic, category, tone, format, cards, model: cfg.model });
        if (again) {
          const left = copiedPhrases(narrations(again), refText);
          if (left.length < copied.length) { best = again; copied = left; }
        }
      }
    }
    if (best) { await recordUsage(g.userId, "script_created", { cards: best.cards.length }); return json({ script: best, copied }); }
    throw new UserError(502, "AI가 대본을 완성하지 못했습니다. 카드 수를 줄이거나 다른 모델로 다시 시도해 주세요.");
  } catch (e) { return fail(e); }
}
