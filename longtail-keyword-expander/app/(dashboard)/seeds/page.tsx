import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { SeedForm } from "@/components/seeds/SeedForm";
import { SeedMatrix } from "@/components/seeds/SeedMatrix";
import type { SeedRowData } from "@/components/seeds/SeedRow";
import { PageHero } from "@/components/layout/PageHero";
import { KpiCard, KpiGrid } from "@/components/dashboard/KpiCard";

export const dynamic = "force-dynamic";
// SerpApi + GPT 3단계(연관 키워드 → 롱테일 확장 → 작업 지시 메시지)를 한 번에 처리하는
// "지금 확장하기" 서버 액션이 기본 함수 제한 시간보다 오래 걸릴 수 있어 넉넉하게 잡아둔다.
export const maxDuration = 120;

export default async function SeedsPage() {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  // 프로그램 소개 박스는 v1.06부터 대시보드(/dashboard)로 옮겼다.
  const [{ data: seeds }, { data: runs }] = await Promise.all([
    supabase
      .from("longtail_seed_keywords")
      .select("id, keyword, engine, is_active")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("longtail_runs")
      .select("seed_id, executed_at")
      .eq("user_id", user.id)
      .order("executed_at", { ascending: false }),
  ]);

  const countBySeed = new Map<string, number>();
  const lastRunBySeed = new Map<string, string>();
  for (const r of runs ?? []) {
    countBySeed.set(r.seed_id, (countBySeed.get(r.seed_id) ?? 0) + 1);
    if (!lastRunBySeed.has(r.seed_id)) lastRunBySeed.set(r.seed_id, r.executed_at);
  }

  const seedList: SeedRowData[] = (seeds ?? []).map((s) => ({
    id: s.id,
    keyword: s.keyword,
    engine: s.engine,
    is_active: s.is_active,
    runCount: countBySeed.get(s.id) ?? 0,
    lastRunAt: lastRunBySeed.get(s.id) ?? null,
  }));
  const naverCount = seedList.filter((s) => s.engine === "naver").length;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHero
        badge="STEP 1 · 롱테일 키워드 확장"
        title="씨드 키워드 등록 & 확장"
        description="키워드를 등록하고 「지금 확장하기」를 누르면 네이버(또는 구글) 검색결과를 바탕으로 연관·롱테일 키워드와 블로그 작업 지시를 만들어 드립니다."
        tip="한 번 확장에 30초~1분 정도 걸리고, 결과는 같은 키워드에 계속 쌓입니다(중복은 자동 제거)."
      />

      <KpiGrid>
        <KpiCard icon="🌱" label="씨드 키워드" value={seedList.length} />
        <KpiCard icon="🟢" label="네이버" value={naverCount} tone="green" />
        <KpiCard icon="🔵" label="구글" value={seedList.length - naverCount} tone="muted" />
        <KpiCard icon="⚡" label="총 확장 실행" value={(runs ?? []).length} tone="amber" />
      </KpiGrid>

      <div className="mb-6">
        <SeedForm />
      </div>

      {seedList.length === 0 ? (
        <div className="mx-card py-16 text-center">
          <p className="text-5xl">🧩</p>
          <p className="mt-4 text-sm text-mx-muted">아직 등록한 키워드가 없습니다. 위에서 첫 키워드를 추가해 보세요!</p>
        </div>
      ) : (
        <SeedMatrix seeds={seedList} />
      )}
    </div>
  );
}
