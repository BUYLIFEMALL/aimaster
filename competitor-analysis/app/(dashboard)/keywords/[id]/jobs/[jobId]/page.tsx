import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { CompetitorToggle } from "@/components/keywords/CompetitorToggle";
import { ReportButton } from "@/components/keywords/ReportButton";
import type { ResultType } from "@/types/database.types";

export const dynamic = "force-dynamic";
export const maxDuration = 120; // ReportButton의 Claude 리포트 생성 액션이 오래 걸릴 수 있음

interface PageProps {
  params: { id: string; jobId: string };
}

const TYPE_LABEL: Record<ResultType, string> = {
  organic: "🔵 자연 검색결과",
  ad: "🟡 광고",
  paa: "❓ 사람들이 함께 묻는 질문(PAA)",
  local: "📍 지역 결과",
};

export default async function JobDetailPage({ params }: PageProps) {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { data: keyword } = await supabase
    .from("competitor_keywords")
    .select("id, keyword")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!keyword) notFound();

  const { data: job } = await supabase
    .from("competitor_serp_jobs")
    .select("id, executed_at, total_results")
    .eq("id", params.jobId)
    .eq("user_id", user.id)
    .eq("keyword_id", keyword.id)
    .maybeSingle();
  if (!job) notFound();

  const [{ data: results }, { data: analysis }, { data: tracked }] = await Promise.all([
    supabase
      .from("competitor_serp_results")
      .select("id, position, result_type, title, link, snippet, domain")
      .eq("job_id", job.id)
      .order("position", { ascending: true, nullsFirst: false }),
    supabase
      .from("competitor_analyses")
      .select("id, summary_text, html_report")
      .eq("job_id", job.id)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase.from("user_tracked_competitors").select("domain").eq("user_id", user.id),
  ]);

  const trackedDomains = new Set((tracked ?? []).map((t) => t.domain));
  const domains = Array.from(new Set((results ?? []).map((r) => r.domain).filter((d): d is string => !!d)));
  const { data: profiles } =
    domains.length > 0
      ? await supabase.from("competitor_profiles").select("domain, company_name").in("domain", domains)
      : { data: [] };
  const companyNameByDomain = new Map((profiles ?? []).map((p) => [p.domain, p.company_name]));

  const grouped = new Map<ResultType, typeof results>();
  for (const r of results ?? []) {
    const list = grouped.get(r.result_type) ?? [];
    list.push(r);
    grouped.set(r.result_type, list);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
      <Link href={`/keywords/${keyword.id}`} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
        ← {keyword.keyword} 분석 이력으로
      </Link>

      <div>
        <h1 className="text-2xl font-black text-gray-900">{keyword.keyword}</h1>
        <p className="text-xs text-gray-400 mt-1">
          {new Date(job.executed_at).toLocaleString("ko-KR")} · 총 검색결과 {job.total_results?.toLocaleString() ?? "-"}건
        </p>
      </div>

      {analysis?.summary_text && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-3">
          <h2 className="font-bold text-gray-900">🤖 AI 분석 리포트</h2>
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{analysis.summary_text}</p>
          <ReportButton analysisId={analysis.id} hasReport={!!analysis.html_report} />
          {analysis.html_report && (
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <iframe srcDoc={analysis.html_report} className="w-full h-[600px]" sandbox="" title="HTML 리포트" />
            </div>
          )}
        </div>
      )}

      {(["organic", "ad", "paa", "local"] as ResultType[]).map((type) => {
        const items = grouped.get(type);
        if (!items || items.length === 0) return null;
        return (
          <div key={type} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <h2 className="font-bold text-gray-900 mb-3">{TYPE_LABEL[type]}</h2>
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="border-b border-gray-50 last:border-0 pb-3 last:pb-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {item.position ? `${item.position}. ` : ""}
                        {item.title ?? "(제목 없음)"}
                      </p>
                      {item.domain && (
                        <p className="text-xs text-blue-600 mt-0.5">
                          {item.domain}
                          {companyNameByDomain.get(item.domain) && ` · ${companyNameByDomain.get(item.domain)}`}
                        </p>
                      )}
                      {item.snippet && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.snippet}</p>}
                    </div>
                    {item.domain && (
                      <CompetitorToggle domain={item.domain} tracked={trackedDomains.has(item.domain)} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
