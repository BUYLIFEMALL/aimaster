import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { retentionCutoff } from "@/lib/retention";
import { LoadErrorNotice } from "@/components/ui/LoadErrorNotice";
import { logLoadErrors } from "@/lib/loadErrors";
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
  { step: 1, icon: "🔍", title: "키워드 발굴 & 감시", desc: "관심 카테고리·급상승 키워드 등록", href: "/watchlist" },
  { step: 2, icon: "📊", title: "트렌드·기회점수", desc: "AI 기회점수 리포트 분석", href: "/reports" },
  { step: 3, icon: "🌏", title: "5대 마켓 소싱비교", desc: "알리·도매매·11번가 최저가 대조", href: "/sourcing" },
  { step: 4, icon: "🔔", title: "24H 자동 알림", desc: "예약 소싱·시세 변동 실시간 푸시", href: "/settings" },
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
      .gte("generated_at", retentionCutoff())
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

  const failed = logLoadErrors("dashboard", {
    "관심 키워드": watchRes, 리포트: reportsRes, "관심 상품": savedRes, "API 키": keysRes,
    이메일: smtpRes, 카카오: solapiRes, 텔레그램: telegramRes,
  });
  const watchlists = watchRes.data ?? [];
  const keywordCount = watchlists.reduce((n, w) => n + (w.keywords?.length ?? 0), 0);
  const alertOn = watchlists.filter((w) => w.sourcing_alert_enabled).length;
  const reports = reportsRes.data ?? [];

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
    { label: "AI (OpenAI·Claude)", note: "필수 · 추천 사유", ok: providers.has("openai") || providers.has("anthropic") || providers.has("gemini") },
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
      {failed.length > 0 && (
        <LoadErrorNotice what={failed.join("·")} retryHref="/dashboard" extra="아래 숫자·연결 상태가 0이나 미연결로 보일 수 있습니다." />
      )}

      {/* 4단계 소싱 파이프라인 인디케이터 배너 */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {FLOW.map((s, i) => (
          <Link
            key={s.title}
            href={s.href}
            className={`group relative flex items-center gap-3 rounded-2xl border p-3.5 transition-all ${
              i === 0
                ? "border-mx-primary/50 bg-mx-surface shadow-md shadow-mx-primary/10 ring-1 ring-mx-primary/30"
                : "border-mx-border bg-mx-surface/60 hover:border-mx-primary/40 hover:bg-mx-surface"
            }`}
          >
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg font-black transition-all ${
              i === 0
                ? "bg-mx-primary text-[#04101A] shadow-md shadow-mx-primary/30"
                : "border border-mx-border bg-mx-raised text-mx-muted group-hover:border-mx-primary/40 group-hover:text-mx-text"
            }`}>
              {s.icon}
            </div>
            <div className="min-w-0 flex-1">
              <span className="block text-[10px] font-black uppercase tracking-wider text-mx-link">STEP {s.step}</span>
              <strong className="block truncate text-xs font-bold text-mx-text">{s.title}</strong>
              <span className="block truncate text-[11px] text-mx-muted">{s.desc}</span>
            </div>
          </Link>
        ))}
      </div>

      <PageHero
        badge="⚡ QUANT RADAR INTELLIGENCE"
        title="실시간 24H 급상승 소싱 트렌드 발굴 레이더"
        description="네이버 데이터랩 + 쿠팡 실시간 연관검색어로 급상승 키워드를 감지하고, 5대 마켓(알리·도매매·11번가) 원가 대조로 순마진 35%+ 상품만 퀀트 소싱합니다."
        tip="관심 목록에 등록한 키워드는 매일 오전 9시 및 설정한 임계값에 도달할 때 자동 알림이 발송됩니다."
      >
        <Link href="/reports" className="btn-3d-cyan px-4 py-2.5 text-xs font-black">
          📊 기회점수 리포트 →
        </Link>
        <Link href="/guide" className="mx-btn-ghost text-xs font-bold">
          📖 퀀트 소싱 매뉴얼
        </Link>
      </PageHero>

      {/* 4대 KPI 그리드 */}
      <KpiGrid>
        <KpiCard icon="🎯" label="실시간 감시 키워드" value={keywordCount} hint={`카테고리 ${watchlists.length}개 연동`} tone="blue" />
        <KpiCard icon="🔥" label="고마진 기회 키워드 (60점+)" value={hotCount} hint="최신 퀀트 분석 기준" tone="amber" />
        <KpiCard icon="⭐" label="소싱 후보 등록 상품" value={savedRes.count ?? 0} hint="가격·품절 24H 추적" tone="green" />
        <KpiCard icon="🔔" label="자동 알림 활성 카테고리" value={alertOn} hint="텔레그램·카카오·SMTP" tone="muted" />
      </KpiGrid>

      {/* 2단 메인 그리드 */}
      <div className="mb-6 grid gap-6 lg:grid-cols-5">
        {/* 좌측: 실시간 급상승 키워드 TOP 5 */}
        <div className="mx-card lg:col-span-3">
          <div className="mb-3.5 flex items-center justify-between">
            <div>
              <h2 className="mx-section-title mb-0">🔥 실시간 급상승 소싱 기회 TOP 5</h2>
              <p className="mt-0.5 text-xs text-mx-muted">검색량 급증율 대비 판매자 경쟁강도 최적화 분석</p>
            </div>
            {ranked.length > 0 && (
              <Link href="/reports" className="text-xs font-bold text-mx-link hover:underline">
                전체 리포트 보기 →
              </Link>
            )}
          </div>

          {ranked.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-4xl">📡</p>
              <p className="mt-2 text-sm font-semibold text-mx-text">아직 분석된 키워드 리포트가 없습니다.</p>
              <p className="text-xs text-mx-muted">관심 키워드를 등록하면 실시간 퀀트 분석이 가동됩니다.</p>
              <Link href="/watchlist" className="btn-3d-cyan mt-4 inline-flex px-4 py-2 text-xs font-black">
                🔍 키워드 감시 등록하기
              </Link>
            </div>
          ) : (
            <div className="-mx-5 overflow-x-auto px-5">
              <table className="mx-table min-w-[500px]">
                <thead>
                  <tr>
                    <th>순위</th>
                    <th>키워드</th>
                    <th className="text-right">검색량 추이</th>
                    <th className="text-right">경쟁 상품수</th>
                    <th>기회점수</th>
                    <th className="text-right">소싱 분석</th>
                  </tr>
                </thead>
                <tbody>
                  {ranked.slice(0, 5).map((k, idx) => (
                    <tr key={k.keyword}>
                      <td className="w-10">
                        <span className={`inline-flex h-6 w-6 items-center justify-center rounded-lg text-xs font-black ${
                          idx === 0 ? "bg-mx-primary/20 text-mx-link" : "text-mx-muted"
                        }`}>
                          {idx + 1}
                        </span>
                      </td>
                      <td className="font-bold text-mx-text">{k.keyword}</td>
                      <td
                        className={`text-right font-semibold tabular-nums ${
                          k.trendChangePct == null ? "text-mx-muted" : k.trendChangePct >= 0 ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {k.trendChangePct == null ? "-" : `${k.trendChangePct >= 0 ? "▲" : "▼"} ${Math.abs(k.trendChangePct).toFixed(1)}%`}
                      </td>
                      <td className="text-right tabular-nums text-mx-muted">
                        {k.productCount == null ? "-" : k.productCount.toLocaleString("ko-KR")}
                      </td>
                      <td className="w-36">
                        <div className="flex items-center gap-2">
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-mx-raised">
                            <div
                              className={`h-full rounded-full ${
                                k.opportunityScore >= 75
                                  ? "bg-gradient-to-r from-[#06B6D4] to-[#10B981]"
                                  : k.opportunityScore >= 50
                                  ? "bg-mx-primary"
                                  : "bg-mx-borderBright"
                              }`}
                              style={{ width: `${Math.min(100, k.opportunityScore)}%` }}
                            />
                          </div>
                          <span className="w-8 text-right text-xs font-black tabular-nums text-mx-link">
                            {k.opportunityScore}점
                          </span>
                        </div>
                      </td>
                      <td className="text-right">
                        <Link
                          href={`/sourcing?keyword=${encodeURIComponent(k.keyword)}`}
                          className="btn-3d-cyan inline-flex px-2.5 py-1 text-[11px] font-black"
                        >
                          소싱 분석
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 우측: 외부 마켓 및 알림 채널 연결 상태 */}
        <div className="mx-card lg:col-span-2">
          <div className="mb-3.5 flex items-center justify-between">
            <h2 className="mx-section-title mb-0">🔌 실시간 연동 채널</h2>
            <span className="text-[11px] font-bold text-mx-muted">8개 채널 관리</span>
          </div>

          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
            {connections.map((c) => (
              <li key={c.label} className="flex items-center justify-between gap-2 rounded-xl border border-mx-border/80 bg-mx-raised/70 px-3 py-2.5 transition-colors hover:border-mx-primary/30">
                <span className="min-w-0">
                  <span className="block truncate text-xs font-bold text-mx-text">{c.label}</span>
                  <span className="block truncate text-[11px] text-mx-muted">{c.note}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${c.ok ? "bg-emerald-400 shadow-sm shadow-emerald-400/50" : "bg-mx-borderBright"}`} />
                  <span className="text-[11px] font-bold text-mx-muted">{c.ok ? "정상" : "미연결"}</span>
                </span>
              </li>
            ))}
          </ul>

          <Link href="/settings" className="mx-btn-ghost mt-4 w-full justify-center text-xs font-bold">
            🔑 API 키 & 알림 채널 설정하기 →
          </Link>
        </div>
      </div>
    </div>
  );
}
