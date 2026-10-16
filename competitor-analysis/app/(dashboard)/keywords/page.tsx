import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { KeywordForm } from "@/components/keywords/KeywordForm";
import { KeywordMatrix } from "@/components/keywords/KeywordMatrix";
import type { KeywordRowData } from "@/components/keywords/KeywordRow";
import { PageHero } from "@/components/layout/PageHero";
import { KpiCard, KpiGrid } from "@/components/dashboard/KpiCard";

export const dynamic = "force-dynamic";
// SerpApi + 여러 도메인 경쟁사 리서치(Perplexity+GPT) + 최종 GPT 분석까지 한 번에 처리하는
// "지금 분석하기" 서버 액션이 기본 함수 제한 시간보다 오래 걸릴 수 있어 넉넉하게 잡아둔다.
export const maxDuration = 120;

export default async function KeywordsPage() {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const [{ data: keywords }, { data: jobs }] = await Promise.all([
    supabase
      .from("competitor_keywords")
      .select("id, keyword, location, engine, is_active")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("competitor_serp_jobs")
      .select("keyword_id, executed_at")
      .eq("user_id", user.id)
      .order("executed_at", { ascending: false }),
  ]);

  const countByKeyword = new Map<string, number>();
  const lastByKeyword = new Map<string, string>();
  for (const j of jobs ?? []) {
    countByKeyword.set(j.keyword_id, (countByKeyword.get(j.keyword_id) ?? 0) + 1);
    if (!lastByKeyword.has(j.keyword_id)) lastByKeyword.set(j.keyword_id, j.executed_at);
  }

  const keywordList: KeywordRowData[] = (keywords ?? []).map((k) => ({
    id: k.id,
    keyword: k.keyword,
    location: k.location,
    engine: k.engine,
    is_active: k.is_active,
    analysisCount: countByKeyword.get(k.id) ?? 0,
    lastAnalyzedAt: lastByKeyword.get(k.id) ?? null,
  }));
  const googleCount = keywordList.filter((k) => k.engine === "google").length;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHero
        badge="STEP 1 · 키워드 관리"
        title="키워드 등록 & 분석"
        description="키워드를 등록하고 「지금 분석하기」를 누르면 구글(또는 네이버) 검색결과의 상위 노출 도메인을 경쟁사로 찾아 리서치하고, 경쟁사·USP·콘텐츠 아이디어 리포트를 만들어 드립니다."
        tip="이미 다른 회원이 조사한 회사 정보는 다시 조사하지 않아, 새로 등장한 도메인만 AI 호출이 생깁니다."
      />

      <KpiGrid>
        <KpiCard icon="🔍" label="등록 키워드" value={keywordList.length} />
        <KpiCard icon="🔵" label="구글" value={googleCount} tone="muted" />
        <KpiCard icon="🟢" label="네이버" value={keywordList.length - googleCount} tone="green" />
        <KpiCard icon="⚡" label="총 분석 실행" value={(jobs ?? []).length} tone="amber" />
      </KpiGrid>

      <div className="mb-6">
        <KeywordForm />
      </div>

      {keywordList.length === 0 ? (
        <div className="mx-card py-16 text-center">
          <p className="text-5xl">🔎</p>
          <p className="mt-4 text-sm text-mx-muted">아직 등록한 키워드가 없습니다. 위에서 첫 키워드를 추가해 보세요!</p>
        </div>
      ) : (
        <KeywordMatrix keywords={keywordList} />
      )}
    </div>
  );
}
