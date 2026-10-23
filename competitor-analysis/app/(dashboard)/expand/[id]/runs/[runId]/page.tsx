import { notFound } from "next/navigation";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { retentionCutoff } from "@/lib/retention";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { CopyButton } from "@/components/ui/CopyButton";
import { CsvButton, type CsvRow } from "@/components/expand/CsvButton";
import { SendToAnalysis } from "@/components/expand/SendToAnalysis";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { id: string; runId: string };
}

export default async function RunDetailPage({ params }: PageProps) {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { data: seed } = await supabase
    .from("longtail_seed_keywords")
    .select("id, keyword")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!seed) notFound();

  const { data: run } = await supabase
    .from("longtail_runs")
    .select("id, executed_at, related_count, expansion_count, summary_text")
    .gt("executed_at", retentionCutoff())
    .eq("id", params.runId)
    .eq("user_id", user.id)
    .eq("seed_id", seed.id)
    .maybeSingle();
  if (!run) notFound();

  // 연관/롱테일 키워드는 실행 회차별 스냅샷이 아니라 Seed 기준으로 계속 누적·중복제거된다
  // (재실행할 때마다 relevance_score만 갱신) — 그래서 "지금 이 Seed가 가진 전체 키워드
  // 목록"을 보여주고, summary_text만 이 회차 실행 시점의 AI 요약을 그대로 보여준다.
  const [{ data: related }, { data: expansions }] = await Promise.all([
    supabase
      .from("longtail_related_keywords")
      .select("id, keyword, relevance_score")
      .gt("created_at", retentionCutoff())
      .eq("seed_id", seed.id)
      .order("relevance_score", { ascending: false, nullsFirst: false }),
    supabase.from("longtail_expansions").select("id, keyword, related_id").gt("created_at", retentionCutoff()).eq("seed_id", seed.id),
  ]);

  const expansionsByRelatedId = new Map<string | null, { id: string; keyword: string }[]>();
  for (const exp of expansions ?? []) {
    const key = exp.related_id;
    const list = expansionsByRelatedId.get(key) ?? [];
    list.push(exp);
    expansionsByRelatedId.set(key, list);
  }
  const seedDirectExpansions = expansionsByRelatedId.get(null) ?? [];
  const relatedList = related ?? [];
  const scored = relatedList.filter((r) => r.relevance_score !== null);
  const avgRelevance =
    scored.length > 0 ? Math.round((scored.reduce((sum, r) => sum + (r.relevance_score ?? 0), 0) / scored.length) * 100) : null;
  const allLongtail = (expansions ?? []).map((e) => e.keyword).join("\n");
  // CSV: 롱테일 하나당 한 줄(연관 키워드·관련도와 함께), 롱테일이 없는 연관 키워드도 한 줄, 씨드 직속 롱테일은 구분 "씨드 직속"
  const csvRows: CsvRow[] = [
    ...seedDirectExpansions.map((e) => ({ group: "씨드 직속", related: seed.keyword, relevance: null, longtail: e.keyword })),
    ...relatedList.flatMap((r) => {
      const pct = r.relevance_score !== null ? Math.round(r.relevance_score * 100) : null;
      const children = expansionsByRelatedId.get(r.id) ?? [];
      return children.length ? children.map((e) => ({ group: "연관", related: r.keyword, relevance: pct, longtail: e.keyword })) : [{ group: "연관", related: r.keyword, relevance: pct, longtail: "" }];
    }),
  ];
  const csvName = `${seed.keyword.replace(/[\\/:*?"<>|]/g, "").trim() || "keywords"}_롱테일키워드_${run.executed_at.slice(0, 10).replace(/-/g, "")}.csv`;

  return (
    <div className="space-y-6">
      <p className="text-xs text-mx-muted">
        🕒 {formatDateTime(run.executed_at)} 실행 · 이 회차에서 연관 {run.related_count}개 · 롱테일 {run.expansion_count}개 발견
      </p>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiCard icon="🔗" label="연관 키워드(누적)" value={relatedList.length} tone="green" />
        <KpiCard icon="🎯" label="롱테일 키워드(누적)" value={(expansions ?? []).length} tone="amber" />
        <KpiCard icon="🌱" label="씨드 직속 롱테일" value={seedDirectExpansions.length} />
        <KpiCard icon="📈" label="평균 관련도" value={avgRelevance !== null ? `${avgRelevance}%` : "—"} tone="muted" />
      </div>

      {run.summary_text && (
        <div className="mx-card border-l-4 border-l-mx-accent">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="mx-section-title mb-0">📝 블로그 작업 지시</h2>
            <CopyButton text={run.summary_text} label="지시문 복사" />
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-mx-text">{run.summary_text}</p>
        </div>
      )}

      <SendToAnalysis
        seedId={seed.id}
        keywords={Array.from(
          new Map(
            [
              { keyword: seed.keyword, kind: "씨드" },
              ...relatedList.map((r) => ({ keyword: r.keyword, kind: "연관" })),
              ...(expansions ?? []).map((e) => ({ keyword: e.keyword, kind: "롱테일" })),
            ].map((k) => [k.keyword, k] as const),
          ).values(),
        )}
      />

      {seedDirectExpansions.length > 0 && (
        <div className="mx-card">
          <h2 className="mx-section-title">🎯 &quot;{seed.keyword}&quot; 직속 롱테일 키워드</h2>
          <div className="flex flex-wrap gap-2">
            {seedDirectExpansions.map((exp) => (
              <span key={exp.id} className="mx-chip-amber">
                {exp.keyword}
              </span>
            ))}
          </div>
        </div>
      )}

      {relatedList.length > 0 && (
        <div className="mx-card">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="mx-section-title mb-0">🔗 연관 키워드 매트릭스</h2>
            <div className="flex flex-wrap items-start justify-end gap-2">
              <CsvButton rows={csvRows} fileName={csvName} />
              {allLongtail && <CopyButton text={allLongtail} label="롱테일 전체 복사" />}
            </div>
          </div>
          <div className="-mx-5 overflow-x-auto px-5">
            <table className="mx-table min-w-[560px]">
              <thead>
                <tr>
                  <th className="w-[30%]">연관 키워드</th>
                  <th className="w-[22%]">관련도</th>
                  <th>롱테일 키워드</th>
                </tr>
              </thead>
              <tbody>
                {relatedList.map((r) => {
                  const pct = r.relevance_score !== null ? Math.round(r.relevance_score * 100) : null;
                  const children = expansionsByRelatedId.get(r.id) ?? [];
                  return (
                    <tr key={r.id}>
                      <td className="font-semibold">{r.keyword}</td>
                      <td>
                        {pct !== null ? (
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-mx-raised">
                              <div className="h-full rounded-full bg-mx-primary" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="w-9 text-right text-xs tabular-nums text-mx-muted">{pct}%</span>
                          </div>
                        ) : (
                          <span className="text-xs text-mx-muted">—</span>
                        )}
                      </td>
                      <td>
                        {children.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {children.map((exp) => (
                              <span key={exp.id} className="mx-chip-blue">
                                {exp.keyword}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-mx-muted">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
