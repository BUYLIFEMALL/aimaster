import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { PageHero } from "@/components/layout/PageHero";
import { KpiCard, KpiGrid } from "@/components/dashboard/KpiCard";
import { splitIntoSentenceParagraphs } from "@/lib/formatProgramDescription";
import { formatDate, formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const PIPELINE = [
  { icon: "🔑", title: "키 등록", desc: "본인 SerpApi·OpenAI 키", href: "/settings" },
  { icon: "🌱", title: "씨드 키워드", desc: "확장할 키워드 + 검색엔진", href: "/seeds" },
  { icon: "⚡", title: "지금 확장하기", desc: "검색결과 → 연관 → 롱테일", href: "/seeds" },
  { icon: "📝", title: "작업 지시 확인", desc: "이번 주 쓸 글 정리", href: "/runs" },
];

export default async function DashboardPage() {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const [seedsRes, runsRes, relatedRes, expansionRes, keysRes, programRes] = await Promise.all([
    supabase.from("longtail_seed_keywords").select("id, keyword, is_active").eq("user_id", user.id),
    supabase
      .from("longtail_runs")
      .select("id, seed_id, executed_at, related_count, expansion_count")
      .eq("user_id", user.id)
      .order("executed_at", { ascending: false }),
    supabase.from("longtail_related_keywords").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("longtail_expansions").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("user_api_keys").select("provider").eq("user_id", user.id).in("provider", ["serpapi", "openai"]),
    // AIMaster Database 타입에는 없는 테이블이라(access.ts와 동일한 이유) from()을 느슨한 타입으로 캐스팅한다.
    (supabase as unknown as { from: (table: string) => any }) // eslint-disable-line @typescript-eslint/no-explicit-any
      .from("programs")
      .select("description, short_desc")
      .eq("slug", "longtail-keyword-expander")
      .maybeSingle() as Promise<{ data: { description: string | null; short_desc: string | null } | null }>,
  ]);

  const seeds = seedsRes.data ?? [];
  const runs = runsRes.data ?? [];
  const keyProviders = new Set<string>((keysRes.data ?? []).map((k) => k.provider));
  const keywordBySeedId = new Map(seeds.map((s) => [s.id, s.keyword]));
  const recentRuns = runs.slice(0, 5);
  const lastRun = runs[0];
  const program = programRes.data;
  const intro = splitIntoSentenceParagraphs(program?.description || program?.short_desc || "");
  const keysReady = keyProviders.has("serpapi") && keyProviders.has("openai");

  return (
    <div className="mx-auto max-w-6xl">
      <PageHero
        badge="🏠 대시보드"
        title="키워드 하나로 이번 주 블로그 주제까지"
        description="씨드 키워드를 넣으면 네이버(또는 구글) 검색결과를 분석해 연관·롱테일 키워드를 넓히고, 블로그 담당자용 작업 지시문까지 정리해 드립니다."
        tip="한 번 확장할 때 SerpApi 검색 1회 + OpenAI 3회가 회원님 본인 키로 사용됩니다."
      >
        <Link href="/seeds" className="mx-btn-primary">
          🔍 키워드 확장하러 가기
        </Link>
        <Link href="/guide" className="mx-btn-ghost">
          📖 사용 매뉴얼
        </Link>
      </PageHero>

      <KpiGrid>
        <KpiCard
          icon="🌱"
          label="등록한 씨드 키워드"
          value={seeds.length}
          hint={`사용 중 ${seeds.filter((s) => s.is_active).length}개`}
        />
        <KpiCard
          icon="⚡"
          label="확장 실행"
          value={runs.length}
          hint={lastRun ? `마지막 ${formatDate(lastRun.executed_at)}` : "아직 실행 없음"}
          tone="amber"
        />
        <KpiCard icon="🔗" label="누적 연관 키워드" value={relatedRes.count ?? 0} tone="green" />
        <KpiCard icon="🎯" label="누적 롱테일 키워드" value={expansionRes.count ?? 0} tone="muted" />
      </KpiGrid>

      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        {/* 작업 흐름 다이어그램 */}
        <div className="mx-card lg:col-span-2">
          <h2 className="mx-section-title">🧭 작업 흐름</h2>
          <ol className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {PIPELINE.map((step, idx) => (
              <li key={step.title} className="relative">
                <Link
                  href={step.href}
                  className="flex h-full flex-col rounded-xl border border-mx-border bg-mx-raised p-3 transition-colors hover:border-mx-primary"
                >
                  <span className="text-xs font-bold text-mx-accent">STEP {idx + 1}</span>
                  <span className="mt-1 text-2xl">{step.icon}</span>
                  <span className="mt-1 text-sm font-bold text-mx-text">{step.title}</span>
                  <span className="text-xs text-mx-muted">{step.desc}</span>
                </Link>
                {idx < PIPELINE.length - 1 && (
                  <span className="absolute -right-2.5 top-1/2 hidden -translate-y-1/2 text-mx-muted md:block">›</span>
                )}
              </li>
            ))}
          </ol>
        </div>

        {/* 연결 상태 */}
        <div className="mx-card">
          <h2 className="mx-section-title">🔌 연결 상태</h2>
          <ul className="space-y-2 text-sm">
            {[
              { id: "serpapi", label: "SerpApi (검색결과)" },
              { id: "openai", label: "OpenAI (키워드·작업 지시)" },
            ].map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 rounded-lg bg-mx-raised px-3 py-2.5">
                <span className="text-mx-text">{p.label}</span>
                {keyProviders.has(p.id) ? (
                  <span className="mx-chip-green">● 등록됨</span>
                ) : (
                  <span className="mx-chip-amber">○ 미등록</span>
                )}
              </li>
            ))}
          </ul>
          {!keysReady && (
            <Link href="/settings" className="mx-btn-ghost mt-3 w-full">
              🔑 본인 키 등록하기
            </Link>
          )}
        </div>
      </div>

      {/* 최근 실행 */}
      <div className="mx-card mb-6">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="mx-section-title mb-0">🕒 최근 확장 결과</h2>
          {runs.length > 0 && (
            <Link href="/runs" className="text-xs font-semibold text-[#93c5fd] hover:underline">
              전체 보기 →
            </Link>
          )}
        </div>
        {recentRuns.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-4xl">🧩</p>
            <p className="mt-3 text-sm text-mx-muted">아직 확장한 키워드가 없어요. 첫 씨드 키워드를 등록해 보세요!</p>
            <Link href="/seeds" className="mx-btn-primary mt-4">
              + 씨드 키워드 등록
            </Link>
          </div>
        ) : (
          <div className="-mx-5 overflow-x-auto px-5">
            <table className="mx-table min-w-[520px]">
              <thead>
                <tr>
                  <th>키워드</th>
                  <th>실행 시각</th>
                  <th className="text-right">연관</th>
                  <th className="text-right">롱테일</th>
                </tr>
              </thead>
              <tbody>
                {recentRuns.map((run) => (
                  <tr key={run.id}>
                    <td className="font-semibold">
                      <Link href={`/seeds/${run.seed_id}/runs/${run.id}`} className="hover:text-[#93c5fd]">
                        {keywordBySeedId.get(run.seed_id) ?? "(삭제된 키워드)"}
                      </Link>
                    </td>
                    <td className="text-mx-muted">{formatDateTime(run.executed_at)}</td>
                    <td className="text-right tabular-nums">{run.related_count}</td>
                    <td className="text-right tabular-nums">{run.expansion_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {intro.length > 0 && (
        <details className="mx-card group">
          <summary className="cursor-pointer list-none text-sm font-bold text-mx-text">
            ℹ️ 프로그램 소개 <span className="text-xs font-normal text-mx-muted group-open:hidden">(펼치기)</span>
          </summary>
          <div className="mt-3 space-y-2">
            {intro.map((sentence, i) => (
              <p key={i} className="text-sm leading-relaxed text-mx-muted">
                {sentence}
              </p>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
