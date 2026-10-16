import { notFound } from "next/navigation";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { CompetitorToggle } from "@/components/keywords/CompetitorToggle";
import { ReportButton } from "@/components/keywords/ReportButton";
import type { ResultType } from "@/types/database.types";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { CopyButton } from "@/components/ui/CopyButton";
import { formatDateTime } from "@/lib/format";

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

  const trackedHere = domains.filter((d) => trackedDomains.has(d)).length;

  return (
    <div className="space-y-6">
      <p className="text-xs text-mx-muted">
        🕒 {formatDateTime(job.executed_at)} 분석 · 총 검색결과 {job.total_results?.toLocaleString() ?? "-"}건
      </p>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiCard icon="🔵" label="자연 검색결과" value={grouped.get("organic")?.length ?? 0} />
        <KpiCard icon="🟡" label="광고" value={grouped.get("ad")?.length ?? 0} tone="amber" />
        <KpiCard icon="🏢" label="등장 도메인" value={domains.length} tone="muted" />
        <KpiCard icon="⭐" label="내 경쟁사로 표시" value={trackedHere} tone="green" />
      </div>

      {analysis?.summary_text && (
        <div className="mx-card space-y-3 border-l-4 border-l-mx-accent">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="mx-section-title mb-0">🤖 AI 분석 리포트</h2>
            <CopyButton text={analysis.summary_text} label="리포트 복사" />
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-mx-text">{analysis.summary_text}</p>
          <ReportButton analysisId={analysis.id} hasReport={!!analysis.html_report} />
          {analysis.html_report && (
            <div className="overflow-hidden rounded-xl border border-mx-border bg-white">
              <iframe srcDoc={analysis.html_report} className="h-[600px] w-full" sandbox="" title="HTML 리포트" />
            </div>
          )}
        </div>
      )}

      {(["organic", "ad", "paa", "local"] as ResultType[]).map((type) => {
        const items = grouped.get(type);
        if (!items || items.length === 0) return null;
        return (
          <div key={type} className="mx-card">
            <h2 className="mx-section-title">
              {TYPE_LABEL[type]} <span className="mx-chip px-2 py-0 text-[11px]">{items.length}</span>
            </h2>
            <div className="-mx-5 overflow-x-auto px-5">
              <table className="mx-table min-w-[620px]">
                <thead>
                  <tr>
                    <th className="w-12 text-center">순위</th>
                    <th>제목 · 요약</th>
                    <th className="w-[30%]">도메인 · 회사</th>
                    <th className="w-36 text-right">경쟁사</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="text-center font-mono font-bold text-mx-muted">{item.position ?? "—"}</td>
                      <td>
                        {item.link && /^https?:\/\//i.test(item.link) ? (
                          <a href={item.link} target="_blank" rel="noopener noreferrer" className="font-semibold hover:text-[#93c5fd]">
                            {item.title ?? "(제목 없음)"}
                          </a>
                        ) : (
                          <span className="font-semibold">{item.title ?? "(제목 없음)"}</span>
                        )}
                        {item.snippet && <p className="mt-1 line-clamp-2 text-xs text-mx-muted">{item.snippet}</p>}
                      </td>
                      <td>
                        {item.domain ? (
                          <>
                            <p className="font-mono text-xs text-[#93c5fd]">{item.domain}</p>
                            {companyNameByDomain.get(item.domain) && (
                              <p className="text-xs text-mx-muted">{companyNameByDomain.get(item.domain)}</p>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-mx-muted">—</span>
                        )}
                      </td>
                      <td className="text-right">
                        {item.domain && <CompetitorToggle domain={item.domain} tracked={trackedDomains.has(item.domain)} />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
