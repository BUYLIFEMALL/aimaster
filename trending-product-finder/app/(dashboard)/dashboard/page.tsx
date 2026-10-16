import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { PageHero } from "@/components/ui/PageHero";
import { KpiCard, KpiGrid } from "@/components/ui/KpiCard";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

interface ReportItem {
  keyword: string;
  trendChangePct: number | null;
  productCount: number | null;
  opportunityScore: number;
}

const FLOW = [
  { icon: "🔍", title: "키워드 발굴", desc: "관심 카테고리·키워드 등록", href: "/watchlist" },
  { icon: "📊", title: "트렌드 분석", desc: "기회점수 리포트 확인", href: "/reports" },
  { icon: "🌏", title: "소싱·마진계산", desc: "알리·도매매·11번가 원가 비교", href: "/sourcing" },
  { icon: "🔔", title: "자동 알림", desc: "예약 소싱·가격 변동 알림", href: "/settings" },
];

export default async function DashboardPage() {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const [watchRes, reportsRes, savedRes, keysRes, smtpRes, solapiRes, telegramRes] = await Promise.all([
    supabase.from("trend_watchlist").select("keywords, is_active, sourcing_alert_enabled").eq("user_id", user.id),
    supabase
      .from("recommendation_reports")
      .select("generated_at, items")
      .eq("user_id", user.id)
      .order("generated_at", { ascending: false })
      .limit(20),
    supabase.from("sourcing_saved_products").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("user_api_keys").select("provider").eq("user_id", user.id),
    supabase.from("user_smtp_accounts").select("id").eq("user_id", user.id).limit(1),
    supabase.from("user_solapi_accounts").select("api_key").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("user_telegram_links")
      .select("bot_username")
      .eq("user_id", user.id)
      .eq("program_slug", "trending-product-finder")
      .maybeSingle(),
  ]);

  const watchlists = watchRes.data ?? [];
  const keywordCount = watchlists.reduce((n, w) => n + (w.keywords?.length ?? 0), 0);
  const alertOn = watchlists.filter((w) => w.sourcing_alert_enabled).length;
  const reports = reportsRes.data ?? [];

  // 키워드마다 가장 최근 리포트 값만 남긴다(리포트는 최신순).
  const latestByKeyword = new Map<string, ReportItem & { generatedAt: string }>();
  for (const r of reports) {
    for (const item of (r.items as unknown as ReportItem[]) ?? []) {
      if (!latestByKeyword.has(item.keyword)) latestByKeyword.set(item.keyword, { ...item, generatedAt: r.generated_at });
    }
  }
  const ranked = Array.from(latestByKeyword.values()).sort((a, b) => b.opportunityScore - a.opportunityScore);
  const hotCount = ranked.filter((k) => k.opportunityScore >= 60).length;

  const providers = new Set<string>((keysRes.data ?? []).map((k) => k.provider));
  const has = (...p: string[]) => p.every((x) => providers.has(x));
  const connections = [
    { label: "네이버 쇼핑인사이트", note: "필수 · 관심도", ok: has("naver_client_id", "naver_client_secret") },
    { label: "AI (OpenAI·Gemini)", note: "필수 · 추천 사유", ok: providers.has("openai") || providers.has("gemini") },
    { label: "네이버 검색광고", note: "후보 찾기", ok: has("naver_ads_api_key", "naver_ads_secret_key", "naver_ads_customer_id") },
    { label: "11번가", note: "경쟁 수·소싱", ok: providers.has("elevenst_api_key") },
    { label: "YouTube", note: "영상 신호", ok: providers.has("youtube_api_key") },
    { label: "알리익스프레스", note: "해외 소싱", ok: has("aliexpress_app_key", "aliexpress_app_secret") },
    { label: "도매매", note: "국내 소싱", ok: providers.has("domeggook_api_key") },
    {
      label: "알림 채널",
      note: "이메일·카카오·텔레그램",
      ok: (smtpRes.data ?? []).length > 0 || !!solapiRes.data || !!telegramRes.data,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHero
        badge="🏠 대시보드"
        title="지금 뜨는 상품을 찾고, 남는 상품만 소싱하세요"
        description="관심 키워드의 검색 관심도·경쟁 상품 수·유튜브 반응을 점수로 비교하고, 알리·도매매·11번가 원가로 마진까지 계산합니다."
        tip="관심 목록에 등록한 키워드는 매일 오전 9시에 자동으로 리포트가 만들어져요."
      >
        <Link href="/reports" className="mx-btn-primary">
          📊 트렌드 리포트
        </Link>
        <Link href="/guide" className="mx-btn-ghost">
          📖 사용 매뉴얼
        </Link>
      </PageHero>

      <KpiGrid>
        <KpiCard icon="🔍" label="관심 키워드" value={keywordCount} hint={`카테고리 ${watchlists.length}개`} />
        <KpiCard icon="🔥" label="기회 키워드(60점+)" value={hotCount} hint="최근 리포트 기준" tone="amber" />
        <KpiCard icon="⭐" label="관심 상품" value={savedRes.count ?? 0} hint="가격·품절 추적" tone="green" />
        <KpiCard icon="🔔" label="예약 소싱 알림" value={alertOn} hint="켜 둔 카테고리" tone="muted" />
      </KpiGrid>

      <div className="mb-6 grid gap-6 lg:grid-cols-5">
        <div className="mx-card lg:col-span-3">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="mx-section-title mb-0">🔥 기회 키워드 TOP 5</h2>
            {ranked.length > 0 && (
              <Link href="/reports" className="text-xs font-semibold text-mx-link hover:underline">
                전체 리포트 →
              </Link>
            )}
          </div>
          {ranked.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-4xl">📈</p>
              <p className="mt-2 text-sm text-mx-muted">아직 리포트가 없어요. 관심 키워드를 등록하고 리포트를 만들어 보세요.</p>
              <Link href="/watchlist" className="mx-btn-primary mt-4">
                🔍 키워드 등록하기
              </Link>
            </div>
          ) : (
            <div className="-mx-5 overflow-x-auto px-5">
              <table className="mx-table min-w-[480px]">
                <thead>
                  <tr>
                    <th>키워드</th>
                    <th className="text-right">변화율</th>
                    <th className="text-right">11번가 경쟁</th>
                    <th>기회점수</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {ranked.slice(0, 5).map((k) => (
                    <tr key={k.keyword}>
                      <td className="font-semibold">{k.keyword}</td>
                      <td
                        className={`text-right tabular-nums ${
                          k.trendChangePct == null ? "text-mx-muted" : k.trendChangePct >= 0 ? "text-mx-success" : "text-mx-danger"
                        }`}
                      >
                        {k.trendChangePct == null ? "-" : `${k.trendChangePct >= 0 ? "▲" : "▼"} ${Math.abs(k.trendChangePct).toFixed(1)}%`}
                      </td>
                      <td className="text-right tabular-nums text-mx-muted">
                        {k.productCount == null ? "-" : k.productCount.toLocaleString("ko-KR")}
                      </td>
                      <td className="w-36">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-mx-raised">
                            <div
                              className={`h-full rounded-full ${k.opportunityScore >= 60 ? "bg-mx-accent" : k.opportunityScore >= 35 ? "bg-mx-primary" : "bg-mx-border"}`}
                              style={{ width: `${Math.min(100, k.opportunityScore)}%` }}
                            />
                          </div>
                          <span className="w-7 text-right text-xs font-bold tabular-nums">{k.opportunityScore}</span>
                        </div>
                      </td>
                      <td className="text-right">
                        <Link
                          href={`/sourcing?keyword=${encodeURIComponent(k.keyword)}`}
                          className="text-xs font-semibold text-mx-link hover:underline"
                        >
                          🌏 소싱
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mx-card lg:col-span-2">
          <h2 className="mx-section-title">🔌 연결 상태</h2>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {connections.map((c) => (
              <li key={c.label} className="flex items-center justify-between gap-2 rounded-lg bg-mx-raised px-3 py-2">
                <span className="min-w-0">
                  <span className="block truncate text-xs font-semibold text-mx-text">{c.label}</span>
                  <span className="block truncate text-[11px] text-mx-muted">{c.note}</span>
                </span>
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${c.ok ? "bg-mx-success" : "bg-mx-border"}`} />
              </li>
            ))}
          </ul>
          <Link href="/settings" className="mx-btn-ghost mt-3 w-full">
            🔑 키·알림 연결
          </Link>
        </div>
      </div>

      <div className="mx-card">
        <h2 className="mx-section-title">🧭 작업 흐름</h2>
        <ol className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {FLOW.map((s, i) => (
            <li key={s.title} className="relative">
              <Link
                href={s.href}
                className="flex h-full flex-col rounded-xl border border-mx-border bg-mx-raised p-3 transition-colors hover:border-mx-primary"
              >
                <span className="text-[11px] font-bold text-mx-accent">STEP {i + 1}</span>
                <span className="mt-1 text-2xl">{s.icon}</span>
                <span className="mt-1 text-sm font-bold text-mx-text">{s.title}</span>
                <span className="text-xs text-mx-muted">{s.desc}</span>
              </Link>
              {i < FLOW.length - 1 && (
                <span className="absolute -right-2.5 top-1/2 hidden -translate-y-1/2 text-mx-muted md:block">›</span>
              )}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
