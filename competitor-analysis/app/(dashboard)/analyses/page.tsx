import { retentionCutoff } from "@/lib/retention";
import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { AnalysisMatrix } from "@/components/analyses/AnalysisMatrix";
import { PageHero } from "@/components/layout/PageHero";
import { KpiCard, KpiGrid } from "@/components/dashboard/KpiCard";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AnalysesPage() {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { data: jobs } = await supabase
    .from("competitor_serp_jobs")
    .select("id, keyword_id, executed_at, total_results").gt("created_at", retentionCutoff())
    .eq("user_id", user.id)
    .order("executed_at", { ascending: false });

  // 빈 목록이면 UUID 컬럼에 임의 문자열로 조회하지 않는다(조회 오류가 빈 목록으로 숨는 문제, 롱테일 v1.06에서 발견).
  const keywordIds = Array.from(new Set((jobs ?? []).map((j) => j.keyword_id)));
  const keywords =
    keywordIds.length > 0
      ? (await supabase.from("competitor_keywords").select("id, keyword").eq("user_id", user.id).in("id", keywordIds)).data
      : [];
  const keywordTextById = new Map((keywords ?? []).map((k) => [k.id, k.keyword]));

  const jobIds = (jobs ?? []).map((j) => j.id);
  const analyses =
    jobIds.length > 0
      ? (await supabase.from("competitor_analyses").select("job_id, summary_text").eq("user_id", user.id).gt("created_at", retentionCutoff()).in("job_id", jobIds)).data
      : [];
  const summaryByJobId = new Map((analyses ?? []).map((a) => [a.job_id, a.summary_text]));

  const items = (jobs ?? []).map((job) => ({
    keywordId: job.keyword_id,
    jobId: job.id,
    keywordText: keywordTextById.get(job.keyword_id) ?? "(삭제된 키워드)",
    executedAt: job.executed_at,
    totalResults: job.total_results,
    summaryPreview: summaryByJobId.get(job.id) ?? null,
  }));
  const withReport = items.filter((i) => i.summaryPreview).length;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHero
        badge="STEP 3 · 분석 결과"
        title="경쟁사 분석 결과 모아 보기"
        description="지금까지 실행한 모든 분석을 최신순으로 보여 드립니다. 행을 누르면 상위 노출 도메인·AI 리포트 전체를 볼 수 있어요."
      />

      <KpiGrid>
        <KpiCard icon="📋" label="분석 결과" value={items.length} tone="amber" />
        <KpiCard icon="🤖" label="AI 리포트 있음" value={withReport} tone="green" />
        <KpiCard icon="🔍" label="분석한 키워드" value={keywordIds.length} />
        <KpiCard icon="🕒" label="마지막 분석" value={items[0] ? formatDate(items[0].executedAt) : "—"} tone="muted" />
      </KpiGrid>

      {items.length === 0 ? (
        <div className="mx-card py-16 text-center">
          <p className="text-5xl">📋</p>
          <p className="mt-4 text-sm text-mx-muted">아직 분석한 결과가 없습니다. 키워드 관리에서 먼저 분석을 실행해 주세요.</p>
          <Link href="/keywords" className="mx-btn-primary mt-4">
            🔍 키워드 분석하러 가기
          </Link>
        </div>
      ) : (
        <AnalysisMatrix items={items} />
      )}
    </div>
  );
}
