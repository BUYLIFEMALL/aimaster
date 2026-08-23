import { notFound } from "next/navigation";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";

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
      .eq("seed_id", seed.id)
      .order("relevance_score", { ascending: false, nullsFirst: false }),
    supabase.from("longtail_expansions").select("id, keyword, related_id").eq("seed_id", seed.id),
  ]);

  const expansionsByRelatedId = new Map<string | null, { id: string; keyword: string }[]>();
  for (const exp of expansions ?? []) {
    const key = exp.related_id;
    const list = expansionsByRelatedId.get(key) ?? [];
    list.push(exp);
    expansionsByRelatedId.set(key, list);
  }
  const seedDirectExpansions = expansionsByRelatedId.get(null) ?? [];

  return (
    <div className="space-y-6">
      <p className="text-xs text-gray-400">
        🕒 {new Date(run.executed_at).toLocaleString("ko-KR")} · 연관 키워드 {run.related_count}개 · 롱테일 키워드{" "}
        {run.expansion_count}개
      </p>

      {run.summary_text && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-3">
          <h2 className="font-bold text-gray-900">📝 블로그 작업 지시</h2>
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{run.summary_text}</p>
        </div>
      )}

      {seedDirectExpansions.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <h2 className="font-bold text-gray-900 mb-3">🎯 "{seed.keyword}" 직속 롱테일 키워드</h2>
          <div className="flex flex-wrap gap-2">
            {seedDirectExpansions.map((exp) => (
              <span key={exp.id} className="text-xs px-3 py-1.5 rounded-full bg-purple-50 text-purple-700 font-semibold">
                {exp.keyword}
              </span>
            ))}
          </div>
        </div>
      )}

      {(related ?? []).length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <h2 className="font-bold text-gray-900 mb-3">🔗 연관 키워드</h2>
          <div className="space-y-4">
            {(related ?? []).map((r) => (
              <div key={r.id} className="border-b border-gray-50 last:border-0 pb-3 last:pb-0">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="text-sm font-semibold text-gray-900">{r.keyword}</p>
                  {r.relevance_score !== null && (
                    <span className="text-xs text-gray-400">관련도 {Math.round(r.relevance_score * 100)}%</span>
                  )}
                </div>
                {(expansionsByRelatedId.get(r.id) ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {(expansionsByRelatedId.get(r.id) ?? []).map((exp) => (
                      <span key={exp.id} className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">
                        {exp.keyword}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
