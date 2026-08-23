import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { AnalysisListItem } from "@/components/analyses/AnalysisListItem";

export const dynamic = "force-dynamic";

export default async function AnalysesPage() {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { data: jobs } = await supabase
    .from("competitor_serp_jobs")
    .select("id, keyword_id, executed_at, total_results")
    .eq("user_id", user.id)
    .order("executed_at", { ascending: false });

  const keywordIds = Array.from(new Set((jobs ?? []).map((j) => j.keyword_id)));
  const { data: keywords } = await supabase
    .from("competitor_keywords")
    .select("id, keyword")
    .in("id", keywordIds.length > 0 ? keywordIds : ["__none__"]);
  const keywordTextById = new Map((keywords ?? []).map((k) => [k.id, k.keyword]));

  const jobIds = (jobs ?? []).map((j) => j.id);
  const { data: analyses } = await supabase
    .from("competitor_analyses")
    .select("job_id, summary_text")
    .in("job_id", jobIds.length > 0 ? jobIds : ["__none__"]);
  const summaryByJobId = new Map((analyses ?? []).map((a) => [a.job_id, a.summary_text]));

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900">경쟁사 키워드 분석 목록</h1>
        <p className="text-sm text-gray-500 mt-1">
          지금까지 실행한 모든 분석 결과를 최신순으로 모아서 보여드립니다.
        </p>
      </div>

      {!jobs || jobs.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <div className="text-5xl mb-4">📋</div>
          <p>아직 분석한 결과가 없습니다. 키워드 분석 메뉴에서 먼저 분석을 실행해주세요.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <AnalysisListItem
              key={job.id}
              keywordId={job.keyword_id}
              jobId={job.id}
              keywordText={keywordTextById.get(job.keyword_id) ?? "(삭제된 키워드)"}
              executedAt={job.executed_at}
              totalResults={job.total_results}
              summaryPreview={summaryByJobId.get(job.id) ?? null}
            />
          ))}
        </div>
      )}
    </div>
  );
}
