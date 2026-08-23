"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess, logProgramUsage } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { resolveApiKey } from "@/lib/apiKeys";
import { searchSerp, extractDomain } from "@/lib/serp/client";
import { researchCompanyByDomain, extractCompanyName } from "@/lib/ai/research";
import { analyzeKeywordCompetitors } from "@/lib/ai/analysis";
import { generateHtmlReport } from "@/lib/ai/report";

export interface RunAnalysisState {
  error?: string;
  needsApiKey?: string; // "serpapi" | "perplexity" | "openai"
  jobId?: string;
}

/**
 * 원본 Make.com 시나리오의 2~5단계 전체(SerpApi 호출 → organic/ad/PAA 분류 저장 →
 * 신규 도메인만 Perplexity+GPT로 회사정보 리서치(전역 캐시 dedup) → GPT-4o 키워드
 * 분석)를 서버 액션 하나로 처리한다. Google Docs 중간 저장은 쓰지 않고 DB에서 바로
 * 조회한 데이터를 GPT에 전달한다.
 */
export async function runKeywordAnalysisAction(keywordId: string): Promise<RunAnalysisState> {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { data: keyword } = await supabase
    .from("competitor_keywords")
    .select("*")
    .eq("id", keywordId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!keyword) return { error: "키워드를 찾을 수 없습니다." };

  const serpApiKey = await resolveApiKey(supabase, user.id, "serpapi");
  if (!serpApiKey) return { needsApiKey: "serpapi" };
  const perplexityKey = await resolveApiKey(supabase, user.id, "perplexity");
  if (!perplexityKey) return { needsApiKey: "perplexity" };
  const openaiKey = await resolveApiKey(supabase, user.id, "openai");
  if (!openaiKey) return { needsApiKey: "openai" };

  try {
    const serpResult = await searchSerp(
      keyword.engine,
      {
        keyword: keyword.keyword,
        location: keyword.location,
        googleDomain: keyword.google_domain,
        lang: keyword.lang,
      },
      serpApiKey,
    );

    const { data: job, error: jobError } = await supabase
      .from("competitor_serp_jobs")
      .insert({
        user_id: user.id,
        keyword_id: keyword.id,
        total_results: serpResult.totalResults,
        location: keyword.location,
        google_domain: keyword.google_domain,
        lang: keyword.lang,
        engine: keyword.engine,
        serp_search_id: serpResult.searchId,
      })
      .select("id")
      .single();
    if (jobError || !job) return { error: jobError?.message ?? "검색 작업 저장에 실패했습니다." };

    const itemsWithDomain = serpResult.items.map((item) => ({
      ...item,
      domain: extractDomain(item.link),
    }));

    if (itemsWithDomain.length > 0) {
      const { error: resultsError } = await supabase.from("competitor_serp_results").insert(
        itemsWithDomain.map((item) => ({
          user_id: user.id,
          job_id: job.id,
          position: item.position,
          result_type: item.resultType,
          title: item.title,
          link: item.link,
          snippet: item.snippet,
          domain: item.domain,
        })),
      );
      if (resultsError) return { error: resultsError.message };
    }

    // 이번 검색에 등장한 고유 도메인 중, 아직 전역 캐시에 없는 것만 리서치한다.
    const uniqueDomains = Array.from(new Set(itemsWithDomain.map((i) => i.domain).filter((d): d is string => !!d)));

    if (uniqueDomains.length > 0) {
      const { data: existingProfiles } = await supabase
        .from("competitor_profiles")
        .select("domain")
        .in("domain", uniqueDomains);
      const existingDomains = new Set((existingProfiles ?? []).map((p) => p.domain));
      const newDomains = uniqueDomains.filter((d) => !existingDomains.has(d));

      // 서로 무관한 도메인 리서치라 병렬로 처리한다 — 순차로 하면 도메인이 많을 때
      // Vercel 함수 제한 시간을 넘길 위험이 크다. 개별 실패가 전체 분석을 막지 않도록
      // 도메인별로 독립적으로 catch한다.
      await Promise.all(
        newDomains.map(async (domain) => {
          try {
            const researchText = await researchCompanyByDomain(domain, perplexityKey);
            const companyName = await extractCompanyName(researchText, openaiKey);
            await supabase.from("competitor_profiles").upsert(
              { domain, company_name: companyName, summary: researchText, researched_at: new Date().toISOString() },
              { onConflict: "domain" },
            );
          } catch (err) {
            console.error(`경쟁사 리서치 실패 (${domain}):`, err);
          }
        }),
      );
    }

    const { data: profiles } = await supabase
      .from("competitor_profiles")
      .select("domain, company_name")
      .in("domain", uniqueDomains.length > 0 ? uniqueDomains : [""]);
    const competitorNames = new Map((profiles ?? []).map((p) => [p.domain, p.company_name]));

    const summaryText = await analyzeKeywordCompetitors(
      { keyword: keyword.keyword, items: itemsWithDomain, competitorNames },
      openaiKey,
    );

    const { error: analysisError } = await supabase.from("competitor_analyses").insert({
      user_id: user.id,
      keyword_id: keyword.id,
      job_id: job.id,
      summary_text: summaryText,
    });
    if (analysisError) return { error: analysisError.message };

    await logProgramUsage({
      userId: user.id,
      action: "run_keyword_analysis",
      metadata: { keyword: keyword.keyword, resultCount: itemsWithDomain.length, newDomains: uniqueDomains.length },
    });

    revalidatePath("/keywords");
    revalidatePath(`/keywords/${keyword.id}`);
    return { jobId: job.id };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "분석 중 오류가 발생했습니다." };
  }
}

export interface GenerateReportState {
  error?: string;
  needsApiKey?: string;
}

/** 선택 기능: 분석 텍스트를 Claude로 HTML 리포트로 변환한다(버튼을 눌렀을 때만 호출). */
export async function generateReportAction(analysisId: string): Promise<GenerateReportState> {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { data: analysis } = await supabase
    .from("competitor_analyses")
    .select("id, summary_text, keyword_id")
    .eq("id", analysisId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!analysis || !analysis.summary_text) return { error: "분석 결과를 찾을 수 없습니다." };

  const anthropicKey = await resolveApiKey(supabase, user.id, "anthropic");
  if (!anthropicKey) return { needsApiKey: "anthropic" };

  try {
    const html = await generateHtmlReport(analysis.summary_text, anthropicKey);
    const { error } = await supabase.from("competitor_analyses").update({ html_report: html }).eq("id", analysisId);
    if (error) return { error: error.message };

    await logProgramUsage({ userId: user.id, action: "generate_html_report", metadata: { analysisId } });

    revalidatePath(`/keywords/${analysis.keyword_id}`);
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "리포트 생성 중 오류가 발생했습니다." };
  }
}
