import { type NextRequest } from "next/server";
import { fail, guardAi, json } from "@/lib/aiRoute";
import * as ai from "@/lib/gemini";
import { cleanInputs, cleanPlan, isPlanSection, missingInputs } from "@/lib/lpa/validate";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 120;

/** 기획안 전체 생성(section 없음) 또는 한 섹션만 다시 만들기(section + plan) */
export async function POST(request: NextRequest) {
  const g = await guardAi(request);
  if ("status" in g) return g;
  const inputs = cleanInputs(g.body.inputs);
  const missing = missingInputs(inputs);
  if (missing) return json({ error: missing }, 400);
  try {
    if (g.body.section !== undefined) {
      if (!isPlanSection(g.body.section)) return json({ error: "다시 만들 섹션이 올바르지 않습니다." }, 400);
      const plan = cleanPlan(g.body.plan);
      if (!plan) return json({ error: "현재 기획안이 올바르지 않습니다." }, 400);
      const value = await ai.remakeSection(g.apiKey, inputs, plan, g.body.section);
      return json({ section: g.body.section, value });
    }
    return json({ plan: await ai.makePlan(g.apiKey, inputs) });
  } catch (e) { return fail(e); }
}
