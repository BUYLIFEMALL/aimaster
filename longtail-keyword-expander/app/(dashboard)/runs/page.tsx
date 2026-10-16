import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { RunMatrix } from "@/components/runs/RunMatrix";
import { PageHero } from "@/components/layout/PageHero";
import { KpiCard, KpiGrid } from "@/components/dashboard/KpiCard";
import { formatDate } from "@/lib/format";

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

  const list = (runs ?? []).map((run) => ({
    seedId: run.seed_id,
    runId: run.id,
    keyword: keywordBySeedId.get(run.seed_id) ?? "(삭제된 키워드)",
    executedAt: run.executed_at,
    relatedCount: run.related_count,
    expansionCount: run.expansion_count,
    summaryPreview: run.summary_text,
  }));
  const totalRelated = list.reduce((sum, r) => sum + r.relatedCount, 0);
  const totalExpansion = list.reduce((sum, r) => sum + r.expansionCount, 0);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHero
        badge="STEP 2 · 롱테일 키워드 분석"
        title="확장 결과 모아 보기"
        description="지금까지 실행한 모든 키워드 확장 결과를 최신순으로 보여 드립니다. 행을 누르면 연관·롱테일 키워드와 작업 지시 전체를 볼 수 있어요."
      />

      <KpiGrid>
        <KpiCard icon="⚡" label="실행 결과" value={list.length} tone="amber" />
        <KpiCard icon="🔗" label="연관 키워드 합계" value={totalRelated} tone="green" hint="실행별 발견 수의 합" />
        <KpiCard icon="🎯" label="롱테일 키워드 합계" value={totalExpansion} hint="실행별 발견 수의 합" />
        <KpiCard icon="🕒" label="마지막 실행" value={list[0] ? formatDate(list[0].executedAt) : "—"} tone="muted" />
      </KpiGrid>

      {list.length === 0 ? (
        <div className="mx-card py-16 text-center">
          <p className="text-5xl">📋</p>
          <p className="mt-4 text-sm text-mx-muted">아직 실행한 결과가 없습니다. 키워드 확장 메뉴에서 먼저 실행해 주세요.</p>
          <Link href="/seeds" className="mx-btn-primary mt-4">
            🔍 키워드 확장하러 가기
          </Link>
        </div>
      ) : (
        <RunMatrix runs={list} />
      )}
    </div>
  );
}
