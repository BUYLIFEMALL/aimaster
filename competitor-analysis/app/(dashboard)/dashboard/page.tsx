import { retentionCutoff } from "@/lib/retention";
import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { PageHero } from "@/components/layout/PageHero";
import { KpiCard, KpiGrid } from "@/components/dashboard/KpiCard";
import { formatDate, formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const PIPELINE = [
  { icon: "🔑", title: "키 등록", desc: "SerpApi·Perplexity·OpenAI 본인 키", href: "/settings" },
  { icon: "🔍", title: "키워드 등록", desc: "구글 또는 네이버 선택", href: "/keywords" },
  { icon: "⚡", title: "지금 분석하기", desc: "상위 도메인 → 회사 리서치 → AI 리포트", href: "/keywords" },
  { icon: "🏢", title: "경쟁사 관리", desc: "중요한 도메인을 내 경쟁사로 표시", href: "/competitors" },
];

const KEY_ROWS: { id: "serpapi" | "perplexity" | "openai" | "anthropic"; label: string; optional?: boolean }[] = [
  { id: "serpapi", label: "SerpApi (검색결과)" },
  { id: "perplexity", label: "Perplexity (회사 리서치)" },
  { id: "openai", label: "OpenAI (분석 리포트)" },
  { id: "anthropic", label: "Anthropic (HTML 리포트)", optional: true },
];

export default async function DashboardPage() {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const [keywordsRes, jobsRes, trackedRes, keysRes] = await Promise.all([
    supabase.from("competitor_keywords").select("id, keyword").eq("user_id", user.id),
    supabase
      .from("competitor_serp_jobs")
      .select("id, keyword_id, executed_at, total_results").gt("created_at", retentionCutoff())
      .eq("user_id", user.id)
      .order("executed_at", { ascending: false }),
    supabase.from("user_tracked_competitors").select("domain").eq("user_id", user.id),
    supabase.from("user_api_keys").select("provider").eq("user_id", user.id),
  ]);

  const keywords = keywordsRes.data ?? [];
  const jobs = jobsRes.data ?? [];
  const keyProviders = new Set<string>((keysRes.data ?? []).map((k) => k.provider));
  const keywordById = new Map(keywords.map((k) => [k.id, k.keyword]));
  const requiredReady = KEY_ROWS.filter((k) => !k.optional).every((k) => keyProviders.has(k.id));
  const recent = jobs.slice(0, 5);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHero
        badge="🏠 대시보드"
        title="키워드 하나로 경쟁사와 콘텐츠 전략까지"
        description="키워드를 넣으면 검색 상위에 노출되는 도메인을 경쟁사로 찾아 회사 정보를 리서치하고, 경쟁사·차별점(USP)·콘텐츠 아이디어 리포트를 만들어 드립니다."
        tip="분석 1회에 SerpApi 1회 + 새로 등장한 도메인 수만큼 Perplexity·OpenAI 호출이 회원님 본인 키로 사용됩니다."
      >
        <Link href="/keywords" className="mx-btn-primary">
          🔍 키워드 분석하러 가기
        </Link>
        <Link href="/guide" className="mx-btn-ghost">
          📖 사용 매뉴얼
        </Link>
      </PageHero>

      <KpiGrid>
        <KpiCard icon="🔍" label="등록 키워드" value={keywords.length} />
        <KpiCard
          icon="⚡"
          label="분석 실행"
          value={jobs.length}
          hint={jobs[0] ? `마지막 ${formatDate(jobs[0].executed_at)}` : "아직 분석 없음"}
          tone="amber"
        />
        <KpiCard icon="🏢" label="내 경쟁사" value={(trackedRes.data ?? []).length} tone="green" />
        <KpiCard
          icon="🔑"
          label="키 연결"
          value={`${KEY_ROWS.filter((k) => keyProviders.has(k.id)).length} / ${KEY_ROWS.length}`}
          hint={requiredReady ? "필수 키 준비 완료" : "필수 키 등록 필요"}
          tone="muted"
        />
      </KpiGrid>

      <div className="mb-6 grid gap-6 lg:grid-cols-3">
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

        <div className="mx-card">
          <h2 className="mx-section-title">🔌 연결 상태</h2>
          <ul className="space-y-2 text-sm">
            {KEY_ROWS.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 rounded-lg bg-mx-raised px-3 py-2.5">
                <span className="text-mx-text">{p.label}</span>
                {keyProviders.has(p.id) ? (
                  <span className="mx-chip-green">● 등록됨</span>
                ) : p.optional ? (
                  <span className="mx-chip">선택</span>
                ) : (
                  <span className="mx-chip-amber">○ 미등록</span>
                )}
              </li>
            ))}
          </ul>
          {!requiredReady && (
            <Link href="/settings" className="mx-btn-ghost mt-3 w-full">
              🔑 본인 키 등록하기
            </Link>
          )}
        </div>
      </div>

      <div className="mx-card">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="mx-section-title mb-0">🕒 최근 분석</h2>
          {jobs.length > 0 && (
            <Link href="/analyses" className="text-xs font-semibold text-[#93c5fd] hover:underline">
              전체 보기 →
            </Link>
          )}
        </div>
        {recent.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-4xl">🔎</p>
            <p className="mt-3 text-sm text-mx-muted">아직 분석한 키워드가 없어요. 첫 키워드를 등록해 보세요!</p>
            <Link href="/keywords" className="mx-btn-primary mt-4">
              + 키워드 등록
            </Link>
          </div>
        ) : (
          <div className="-mx-5 overflow-x-auto px-5">
            <table className="mx-table min-w-[480px]">
              <thead>
                <tr>
                  <th>키워드</th>
                  <th>분석 시각</th>
                  <th className="text-right">검색결과</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((job) => (
                  <tr key={job.id}>
                    <td className="font-semibold">
                      <Link href={`/keywords/${job.keyword_id}/jobs/${job.id}`} className="hover:text-[#93c5fd]">
                        {keywordById.get(job.keyword_id) ?? "(삭제된 키워드)"}
                      </Link>
                    </td>
                    <td className="text-mx-muted">{formatDateTime(job.executed_at)}</td>
                    <td className="text-right tabular-nums">{job.total_results?.toLocaleString() ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
