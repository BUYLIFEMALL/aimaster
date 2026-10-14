import { NextResponse, type NextRequest } from "next/server";
import { fail, guardAi, json } from "@/lib/aiRoute";
import { generateJson } from "@/lib/gemini";
import { getResult, saveAnalysis } from "@/lib/results";
import { analysisPrompt, analysisSchema, normalizeAnalysis } from "@/lib/tests/ai";
import { describeForAi } from "@/lib/tests/report";
import { getTest } from "@/lib/tests/registry";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 60;

/** 저장된 검사 결과 1건을 회원 본인 Gemini 키로 심층 분석한다(결과 id만 받는다 — 점수는 서버 저장값을 쓴다). */
export async function POST(request: NextRequest) {
  const g = await guardAi(request);
  if (g instanceof NextResponse) return g;
  const id = typeof g.body.id === "string" ? g.body.id : "";
  const row = await getResult(g.userId, id);
  if (!row) return json({ error: "결과를 찾을 수 없습니다." }, 404);
  const test = getTest(row.test_id);
  if (!test) return json({ error: "지원하지 않는 검사입니다." }, 400);
  try {
    const { system, user } = analysisPrompt(describeForAi(test, row.result));
    const { data } = await generateJson({ apiKey: g.apiKey, system, user, schema: analysisSchema, temperature: 0.6, maxOutputTokens: 8192 });
    const analysis = normalizeAnalysis(data);
    if (!analysis) return json({ error: "AI가 올바른 형식으로 응답하지 못했습니다. 한 번 더 눌러 주세요.", code: "parse" }, 502);
    await saveAnalysis(g.userId, id, analysis);
    return json({ analysis });
  } catch (e) {
    return fail(e);
  }
}
