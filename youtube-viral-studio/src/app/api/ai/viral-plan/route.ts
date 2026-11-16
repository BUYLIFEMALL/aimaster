import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { getUserApiKey } from "@/lib/apiKeys";
import { callLlm, LlmError } from "@/lib/ai/llm";
import { isKnownModel } from "@/lib/ai/models";
import type { FinderFormat } from "@/lib/youtube/boks/core";
import { PLAN_SYSTEM_PROMPT, buildPlanPrompt, extractJsonObject, normalizeReport, type PlanTrends, type PlanVideo } from "@/lib/youtube/boks/plan";

// 근거 수치 기반 AI 기획안(boks-youtube-finder 이식, v1.30) — 회원 본인 Claude 키로 1회 호출(재시도 없음 = 이중 과금 없음).
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const numOrNull = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const rec = (v: unknown): Record<string, unknown> => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});

// 화면이 보낸 값은 길이·형식을 제한해서 프롬프트에 넣는다
function digestVideo(raw: unknown): PlanVideo {
  const v = rec(raw);
  const basis = v.scoreBasis === "baseline" || v.scoreBasis === "subs" ? v.scoreBasis : null;
  return {
    title: str(v.title, 200),
    channelTitle: str(v.channelTitle, 100),
    isShorts: v.isShorts === true,
    durationFormatted: str(v.durationFormatted, 12),
    subscriberCountFormatted: str(v.subscriberCountFormatted, 20),
    viewCount: num(v.viewCount),
    viewCountFormatted: str(v.viewCountFormatted, 20),
    publishedAtRelative: str(v.publishedAtRelative, 20),
    score: numOrNull(v.score),
    scoreFormatted: str(v.scoreFormatted, 20),
    scoreBasis: basis,
    channelBaselineFormatted: str(v.channelBaselineFormatted, 20),
    subsRatio: numOrNull(v.subsRatio),
    subsRatioFormatted: str(v.subsRatioFormatted, 20),
    viewsPerDayFormatted: str(v.viewsPerDayFormatted, 20),
    likeRate: numOrNull(v.likeRate),
    qualifies: v.qualifies === true,
    tags: Array.isArray(v.tags) ? v.tags.slice(0, 8).map((t) => str(t, 40)) : [],
  };
}

function digestTrends(raw: unknown): PlanTrends | null {
  const t = rec(raw);
  const tt = rec(t.totals);
  if (!num(tt.count)) return null;
  const fs = rec(t.formatSplit);
  const side = (x: unknown) => { const r = rec(x); return { count: num(r.count), outlierRate: num(r.outlierRate), medianScore: numOrNull(r.medianScore) }; };
  return {
    totals: { count: num(tt.count), outlierCount: num(tt.outlierCount), outlierRate: num(tt.outlierRate), medianViews: num(tt.medianViews), recent30Share: num(tt.recent30Share) },
    formatSplit: { shorts: side(fs.shorts), long: side(fs.long) },
    findings: (Array.isArray(t.findings) ? t.findings.slice(0, 10) : []).map((f) => ({ text: str(rec(f).text, 200) })),
    topTags: (Array.isArray(t.topTags) ? t.topTags.slice(0, 10) : []).map((x) => ({ tag: str(rec(x).tag, 40) })),
  };
}

export async function POST(request: Request) {
  try {
    const access = await checkProgramAccessApi();
    if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });

    const body = rec(await request.json().catch(() => ({})));
    const model = str(body.model, 80);
    if (!isKnownModel("anthropic", model)) return NextResponse.json({ error: "지원하지 않는 Claude 모델입니다." }, { status: 400 });

    // 최상위 규칙: 회원 본인 Claude 키만(폴백 없음)
    const apiKey = await getUserApiKey(access.user.id, "anthropic");
    if (!apiKey) {
      return NextResponse.json({ error: "Anthropic Claude API 키가 없습니다. [API키등록·플랫폼연동]에서 본인 키를 먼저 등록해주세요.", needApiKey: true, provider: "anthropic" }, { status: 400 });
    }

    const keyword = str(body.keyword, 100).trim() || "인기 차트";
    const format: FinderFormat = body.format === "shorts" || body.format === "long" ? body.format : "all";
    const videos = Array.isArray(body.videos) ? body.videos.slice(0, 100).map(digestVideo) : [];
    if (videos.length === 0) return NextResponse.json({ error: "기획안을 만들 검색 결과가 없습니다. 먼저 떡상 탐색을 실행해 주세요." }, { status: 400 });

    const text = await callLlm({ provider: "anthropic", model, apiKey, system: PLAN_SYSTEM_PROMPT, user: buildPlanPrompt(keyword, videos, format, digestTrends(body.trends)) });
    const report = normalizeReport(extractJsonObject(text), format);
    if (!report) {
      return NextResponse.json({ error: "AI 답변이 기획안 형식(JSON)과 맞지 않았습니다. 다시 시도하거나 다른 모델을 골라 주세요." }, { status: 502 });
    }
    return NextResponse.json({ report, model, generatedAt: new Date().toISOString() });
  } catch (err) {
    if (err instanceof LlmError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("viral-plan error:", String((err as Error)?.message ?? "").slice(0, 200));
    return NextResponse.json({ error: "AI 기획안 생성 중 오류가 발생했습니다. 잠시 뒤 다시 시도해주세요." }, { status: 500 });
  }
}
