import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { splitIntoSentenceParagraphs } from "@/lib/formatProgramDescription";
import { PageHero } from "@/components/ui/PageHero";
import { KpiCard, KpiGrid } from "@/components/ui/KpiCard";
import { formatWon } from "@/lib/format";

const PIPELINE = [
  { icon: "🔑", title: "본인 키 등록", desc: "OpenAI·Perplexity + 텔레그램 봇", href: "/settings" },
  { icon: "📍", title: "관심 지역", desc: "서울 자치구 여러 개 선택", href: "/districts" },
  { icon: "⚡", title: "조회·예약", desc: "지금 조회하기 또는 주기 예약", href: "/districts" },
  { icon: "🏢", title: "실거래·AI 분석", desc: "투자 매력도·저평가지수 확인", href: "/listings" },
];

export default async function DashboardPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [districtsRes, newRes, weekRes, analysesRes, recentRes, keysRes, telegramRes, programRes] = await Promise.all([
    supabase
      .from("real_estate_watch_districts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_active", true),
    supabase
      .from("real_estate_user_matches")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "new"),
    supabase
      .from("real_estate_user_matches")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", weekAgo),
    supabase.from("real_estate_analyses").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase
      .from("real_estate_user_matches")
      .select("id, status, listing:real_estate_listings(*)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase.from("user_api_keys").select("provider").eq("user_id", user.id),
    supabase
      .from("user_telegram_links")
      .select("bot_username")
      .eq("user_id", user.id)
      .eq("program_slug", "real-estate-sales")
      .maybeSingle(),
    // 프로그램 소개(programs.description/short_desc) — AIMaster Database 타입에 없는 테이블이라 느슨한 타입으로 캐스팅
    (supabase as unknown as { from: (table: string) => any }) // eslint-disable-line @typescript-eslint/no-explicit-any
      .from("programs")
      .select("description, short_desc")
      .eq("slug", "real-estate-sales")
      .maybeSingle() as Promise<{ data: { description: string | null; short_desc: string | null } | null }>,
  ]);

  const providers = new Set<string>((keysRes.data ?? []).map((k) => k.provider));
  const connections = [
    { label: "OpenAI (투자 분석)", ok: providers.has("openai") },
    { label: "Perplexity (시장 분위기)", ok: providers.has("perplexity") },
    { label: "텔레그램 (새 실거래 알림)", ok: !!telegramRes.data },
  ];
  const recent = (recentRes.data ?? [])
    .map((m) => ({ id: m.id, status: m.status, listing: Array.isArray(m.listing) ? m.listing[0] : m.listing }))
    .filter((m): m is typeof m & { listing: NonNullable<typeof m.listing> } => Boolean(m.listing));
  const program = programRes.data;
  const intro = splitIntoSentenceParagraphs(program?.description || program?.short_desc || "");

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHero
        badge="🏠 대시보드"
        title="관심 지역 실거래를 자동으로, 투자 판단은 AI와 함께"
        description="서울 관심 자치구에 새 실거래가 신고되면 자동으로 모아 알려 드리고, 회원님 본인 AI 키로 투자 매력도·저평가지수·1년 상승예측을 분석해 드립니다."
        tip="실거래가는 현재 매물 호가가 아니라 신고까지 마친 실제 거래예요. 계약 후 최대 30일 뒤에 공개됩니다."
      >
        <Link href="/listings" className="mx-btn-primary">
          🏢 실거래 내역 보기
        </Link>
        <Link href="/guide" className="mx-btn-ghost">
          📖 사용 매뉴얼
        </Link>
      </PageHero>

      <KpiGrid>
        <KpiCard icon="📍" label="관심 지역" value={districtsRes.count ?? 0} hint="서울 자치구" />
        <KpiCard icon="🆕" label="새 실거래" value={newRes.count ?? 0} hint="아직 분석·알림 전" tone="amber" />
        <KpiCard icon="📅" label="최근 7일 수집" value={weekRes.count ?? 0} tone="green" />
        <KpiCard icon="🤖" label="AI 분석 완료" value={analysesRes.count ?? 0} tone="muted" />
      </KpiGrid>

      <div className="grid gap-6 lg:grid-cols-3">
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
            {connections.map((c) => (
              <li key={c.label} className="flex items-center justify-between gap-2 rounded-lg bg-mx-raised px-3 py-2.5">
                <span className="text-mx-text">{c.label}</span>
                {c.ok ? <span className="mx-chip-green">● 연결됨</span> : <span className="mx-chip-amber">○ 미연결</span>}
              </li>
            ))}
          </ul>
          {connections.some((c) => !c.ok) && (
            <Link href="/settings" className="mx-btn-ghost mt-3 w-full">
              🔑 본인 키·텔레그램 연결하기
            </Link>
          )}
        </div>
      </div>

      <div className="mx-card">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="mx-section-title mb-0">🕒 최근 발견된 실거래</h2>
          {recent.length > 0 && (
            <Link href="/listings" className="text-xs font-semibold text-mx-link hover:underline">
              전체 보기 →
            </Link>
          )}
        </div>
        {recent.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-4xl">🏙️</p>
            <p className="mt-3 text-sm text-mx-muted">아직 매칭된 실거래가 없어요. 먼저 관심 지역을 골라 주세요.</p>
            <Link href="/districts" className="mx-btn-primary mt-4">
              📍 관심 지역 설정하기
            </Link>
          </div>
        ) : (
          <div className="-mx-5 overflow-x-auto px-5">
            <table className="mx-table min-w-[560px]">
              <thead>
                <tr>
                  <th>단지</th>
                  <th>지역</th>
                  <th>계약일</th>
                  <th className="text-right">전용</th>
                  <th className="text-right">거래가</th>
                </tr>
              </thead>
              <tbody>
                {recent.map(({ id, listing }) => (
                  <tr key={id}>
                    <td className="font-semibold">
                      <Link href={`/listings/${listing.id}`} className="hover:text-mx-link">
                        {listing.bldg_nm ?? "(이름 없음)"}
                      </Link>
                    </td>
                    <td className="text-mx-muted">
                      {listing.sgg_nm} {listing.stdg_nm}
                    </td>
                    <td className="text-mx-muted">{listing.contract_date ?? "-"}</td>
                    <td className="text-right tabular-nums">{listing.exclusive_area ?? "-"}㎡</td>
                    <td className="text-right font-bold tabular-nums text-mx-link">{formatWon(listing.price_amount)}</td>
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
