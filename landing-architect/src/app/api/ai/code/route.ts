import { type NextRequest } from "next/server";
import { fail, guardAi, json } from "@/lib/aiRoute";
import * as ai from "@/lib/gemini";
import { cleanInputs, cleanPlan } from "@/lib/lpa/validate";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

/** 기획안으로 단일 HTML 프로토타입을 만든다(무상태: 기획안을 요청에 담아 보낸다) */
export async function POST(request: NextRequest) {
  const g = await guardAi(request);
  if ("status" in g) return g;
  const plan = cleanPlan(g.body.plan);
  if (!plan) return json({ error: "기획안이 올바르지 않습니다. 기획안을 먼저 만들어 주세요." }, 400);
  const { model } = cleanInputs(g.body.inputs);
  try {
    return json({ html: await ai.makeHtml(g.apiKey, model, plan) });
  } catch (e) { return fail(e); }
}
