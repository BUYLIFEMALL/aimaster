import { NextResponse, type NextRequest } from "next/server";
import { fail, guard, json } from "@/lib/route";
import { aiConfig } from "@/lib/aiConfig";
import { generateJson } from "@/lib/ai";
import { planPrompt } from "@/lib/prompts";
import { CATEGORIES } from "@/lib/script";
import { MAX_PLAN_TOPICS, STAGES, buildSchedule, cleanTopics, isStage, type PlanData } from "@/lib/plan";
import { UserError } from "@/lib/errors";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 180;

// 발행 계획: 회원 본인 키로 1회(전략 + 주제 N개) → 날짜·분야별 추천 시각은 서버가 배치(저장은 화면에서 /api/items)
export async function POST(request: NextRequest) {
  try {
    const g = await guard(request); if (g instanceof NextResponse) return g;
    const stage = isStage(g.body.stage) ? g.body.stage : "start";
    const categories = (Array.isArray(g.body.categories) ? g.body.categories : []).map(String).filter((c) => (CATEGORIES as readonly string[]).includes(c)).slice(0, 3);
    if (!categories.length) throw new UserError(400, "분야를 1~3개 골라 주세요.");
    const perDay = Math.min(3, Math.max(1, Math.round(Number(g.body.perDay) || 1)));
    const days = Math.min(30, Math.max(3, Math.round(Number(g.body.days) || 7)));
    const count = perDay * days;
    if (count > MAX_PLAN_TOPICS) throw new UserError(400, `한 번에 만들 수 있는 주제는 ${MAX_PLAN_TOPICS}개까지입니다. 기간이나 하루 편수를 줄여 주세요(지금 ${count}개).`);
    const start = /^\d{4}-\d{2}-\d{2}$/.test(String(g.body.start ?? "")) ? String(g.body.start) : new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
    const seed = String(g.body.seed ?? "").trim().slice(0, 200);
    const guideline = String(g.body.guideline ?? "").trim().slice(0, 3000);
    const cfg = await aiConfig(g.userId);
    for (let attempt = 0; attempt < 2; attempt++) {
      const raw = await generateJson(cfg, { ...planPrompt({ stageLabel: STAGES[stage].label, stageGuide: STAGES[stage].guide, categories, count, days, perDay, seed, guideline }), maxTokens: Math.min(8000, 1200 + count * 120) });
      const topics = cleanTopics(raw.topics);
      if (topics.length < Math.ceil(count * 0.8)) continue;
      const st = (raw.strategy ?? {}) as Record<string, unknown>;
      const list = (v: unknown) => (Array.isArray(v) ? v : []).map((x) => String(x ?? "").trim().slice(0, 120)).filter(Boolean).slice(0, 5);
      const plan: PlanData = {
        stage, perDay, days, start, categories, seed,
        strategy: { summary: String(st.summary ?? "").trim().slice(0, 400), focus: list(st.focus), tips: list(st.tips) },
        entries: buildSchedule(topics, { start, days, perDay, categories }), model: cfg.model,
      };
      return json({ plan });
    }
    throw new UserError(502, "AI가 계획을 완성하지 못했습니다. 기간을 줄이거나 다른 모델로 다시 시도해 주세요.");
  } catch (e) { return fail(e); }
}
