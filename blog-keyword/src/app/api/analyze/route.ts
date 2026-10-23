import { NextResponse, type NextRequest } from "next/server";
import { fail, guardRoute, json, needGeminiResponse } from "@/lib/aiRoute";
import {
  runAutocomplete, runBlogs, runCompetition, runNews, runPrompt, runRecommend, runRelated, runTopics,
  runSustainable, runTrend,
} from "@/lib/kw/features";
import { FEATURE_INFO, isFeature, type AnalysisResult, type Feature } from "@/lib/kw/types";
import { cleanKeyword } from "@/lib/kw/util";
import { isUuid, loadReport, saveReport, updateResult } from "@/lib/reports";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 120;

/** 분석 1건 실행 → 결과를 기록에 저장하고 {id, result}를 돌려준다. */
export async function POST(request: NextRequest) {
  const g = await guardRoute(request);
  if (g instanceof NextResponse) return g;
  const { userId, ctx, body } = g;

  if (!isFeature(body.feature)) return json({ error: "분석 종류가 올바르지 않습니다." }, 400);
  const feature: Feature = body.feature;
  const info = FEATURE_INFO.find((f) => f.id === feature)!;
  const keyword = cleanKeyword(body.keyword);
  if (info.needsKeyword && !keyword) return json({ error: "키워드를 입력해 주세요." }, 400);
  const params = (body.params && typeof body.params === "object" && !Array.isArray(body.params) ? body.params : {}) as Record<string, unknown>;

  // 자동완성 목록 조회만 Gemini 키 없이 쓸 수 있다(AI 호출이 없다).
  const needsGemini = !(feature === "autocomplete" && params.action !== "topics");
  if (needsGemini && !ctx.gemini) return needGeminiResponse();

  try {
    // 자동완성 결과에서 "주제 만들기"를 누른 경우: 기존 기록에 주제를 덧붙인다.
    if (feature === "autocomplete" && params.action === "topics") {
      const reportId = params.reportId;
      const mode = params.mode === "all" ? "all" : "main";
      if (!isUuid(reportId)) return json({ error: "기록을 찾을 수 없습니다. 자동완성을 다시 실행해 주세요." }, 400);
      const row = await loadReport(userId, reportId);
      if (!row || row.result.kind !== "autocomplete") return json({ error: "기록을 찾을 수 없습니다." }, 404);
      const items = await runTopics(ctx, row.result.keyword, row.result.keywords.map((k) => k.text), mode);
      const result: AnalysisResult = { ...row.result, topics: { mode, items } };
      await updateResult(userId, reportId, result);
      return json({ id: reportId, result });
    }

    let result: AnalysisResult;
    switch (feature) {
      case "autocomplete": result = await runAutocomplete(ctx, keyword, params.engine === "google" ? "google" : "naver"); break;
      case "related": result = await runRelated(ctx, keyword); break;
      case "blogs": result = await runBlogs(ctx, keyword); break;
      case "competition": result = await runCompetition(ctx, keyword); break;
      case "recommend": result = await runRecommend(ctx); break;
      case "sustainable": result = await runSustainable(ctx, keyword); break;
      case "news": result = await runNews(ctx, keyword); break;
      case "trend": result = await runTrend(ctx, keyword); break;
      case "prompt": result = await runPrompt(ctx, keyword, String(params.promptId ?? "")); break;
    }
    const id = await saveReport(userId, feature, keyword || "오늘의 전략 키워드", params, result);
    return json({ id, result });
  } catch (e) {
    return fail(e);
  }
}
