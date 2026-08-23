import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { RunListItem } from "@/components/runs/RunListItem";

export const dynamic = "force-dynamic";

export default async function RunsPage() {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { data: runs } = await supabase
    .from("longtail_runs")
    .select("id, seed_id, executed_at, related_count, expansion_count, summary_text")
    .eq("user_id", user.id)
    .order("executed_at", { ascending: false });

  const seedIds = Array.from(new Set((runs ?? []).map((r) => r.seed_id)));
  const { data: seeds } = await supabase
    .from("longtail_seed_keywords")
    .select("id, keyword")
    .in("id", seedIds.length > 0 ? seedIds : ["__none__"]);
  const keywordBySeedId = new Map((seeds ?? []).map((s) => [s.id, s.keyword]));

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900">실행 이력</h1>
        <p className="text-sm text-gray-500 mt-1">지금까지 실행한 모든 키워드 확장 결과를 최신순으로 모아서 보여드립니다.</p>
      </div>

      {!runs || runs.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <div className="text-5xl mb-4">📋</div>
          <p>아직 실행한 결과가 없습니다. 키워드 확장 메뉴에서 먼저 실행해주세요.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {runs.map((run) => (
            <RunListItem
              key={run.id}
              seedId={run.seed_id}
              runId={run.id}
              keyword={keywordBySeedId.get(run.seed_id) ?? "(삭제된 키워드)"}
              executedAt={run.executed_at}
              relatedCount={run.related_count}
              expansionCount={run.expansion_count}
              summaryPreview={run.summary_text}
            />
          ))}
        </div>
      )}
    </div>
  );
}
