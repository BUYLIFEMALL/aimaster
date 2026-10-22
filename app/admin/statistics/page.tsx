import { createClient, createServiceClient } from "@/lib/supabase/server";
import GoldGradientText from "@/components/ui/GoldGradientText";
import GlassCard from "@/components/ui/GlassCard";
import StatisticsCharts from "@/components/admin/StatisticsCharts";
import { formatKRW } from "@/lib/utils/format";
import { TrendingUp, Users, CreditCard, ShoppingBag, Link2 } from "lucide-react";

export const metadata = { title: "통계" };

// 다른 프로그램에서 이어진 작업 수(최근 7일/30일, 보낸 프로그램별) — 바나나 결과 표·사용 기록은 회원 본인만 읽을 수 있어(RLS)
// 관리자임을 다시 확인한 뒤 서버 키로 숫자만 센다(회원 내용은 읽지 않음). 보낸 곳 값은 프로그램 slug와 같다
// 바나나: `banana_canvas_results.options.ideaSource`·`downloadedAt`·`handoffs`(v1.25~v1.28) / 이미지 스튜디오: `usage_logs.metadata.ideaSource`(v1.26)
async function linkStats(userId: string | undefined, days: 7 | 30) {
  if (!userId) return null;
  const supabase = await createClient();
  const { data: me } = await supabase.from("profiles").select("is_admin").eq("id", userId).maybeSingle();
  if (!me?.is_admin) return null;
  const admin = createServiceClient();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data: studio } = await admin.from("programs").select("id").eq("slug", "ai-image-studio").maybeSingle();
  const [{ data: rows }, { count: total }, { count: totalDownloaded }, imgRows, imgTotal] = await Promise.all([
    admin.from("banana_canvas_results").select("src:options->>ideaSource, dl:options->>downloadedAt, ho:options->handoffs").gte("created_at", since).not("options->>ideaSource", "is", null).limit(10000),
    admin.from("banana_canvas_results").select("*", { count: "exact", head: true }).gte("created_at", since),
    admin.from("banana_canvas_results").select("*", { count: "exact", head: true }).gte("created_at", since).not("options->>downloadedAt", "is", null),
    studio
      ? admin.from("usage_logs").select("src:metadata->>ideaSource, dl:metadata->>downloadedAt, ho:metadata->handoffs").eq("program_id", studio.id).eq("action", "image_generation").gte("created_at", since).not("metadata->>ideaSource", "is", null).limit(10000)
      : Promise.resolve({ data: [] as { src: string | null; dl: string | null; ho: Record<string, string> | null }[] }),
    studio
      ? admin.from("usage_logs").select("*", { count: "exact", head: true }).eq("program_id", studio.id).eq("action", "image_generation").gte("created_at", since)
      : Promise.resolve({ count: 0 }),
  ]);
  const banana: Record<string, { count: number; downloaded: number; handedOff: number }> = {};
  for (const r of (rows ?? []) as { src: string | null; dl: string | null; ho: Record<string, string> | null }[]) {
    if (!r.src) continue;
    const b = (banana[r.src] ??= { count: 0, downloaded: 0, handedOff: 0 });
    b.count += 1;
    if (r.dl) b.downloaded += 1;
    if (r.ho && Object.keys(r.ho).length) b.handedOff += 1;
  }
  const image: Record<string, { count: number; downloaded: number; handedOff: number }> = {};
  for (const r of ((imgRows as { data: { src: string | null; dl: string | null; ho: Record<string, string> | null }[] | null }).data ?? [])) {
    if (!r.src) continue;
    const m = (image[r.src] ??= { count: 0, downloaded: 0, handedOff: 0 });
    m.count += 1;
    if (r.dl) m.downloaded += 1;
    if (r.ho && Object.keys(r.ho).length) m.handedOff += 1;
  }
  return { days, banana, total: total ?? 0, totalDownloaded: totalDownloaded ?? 0, image, imageTotal: (imgTotal as { count: number | null }).count ?? 0 };
}

export default async function AdminStatisticsPage({ searchParams }: { searchParams?: { linkRange?: string } }) {
  const linkDays: 7 | 30 = searchParams?.linkRange === "7" ? 7 : 30;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 병렬로 데이터 조회
  const [
    { count: totalMembers },
    { count: activeSubscriptions },
    { data: payments },
    { data: profiles },
    { data: grades },
    { data: programs },
    { data: subscriptions },
    bananaStats,
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase
      .from("subscriptions")
      .select("*", { count: "exact", head: true })
      .eq("status", "active"),
    supabase
      .from("payment_records")
      .select("amount, paid_at, created_at, status")
      .eq("status", "completed")
      .order("paid_at", { ascending: true }),
    supabase.from("profiles").select("created_at, grade_id"),
    supabase.from("member_grades").select("id, name, color").order("sort_order"),
    supabase.from("programs").select("id, name, slug"),
    supabase
      .from("subscriptions")
      .select("program_id, pricing_plan:pricing_plans(price)")
      .eq("status", "active"),
    linkStats(user?.id, linkDays),
  ]);

  // 총 매출
  const totalRevenue = payments?.reduce((sum, p) => sum + p.amount, 0) ?? 0;

  // 이번 달 매출
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const thisMonthRevenue =
    payments
      ?.filter((p) => p.paid_at && p.paid_at >= thisMonthStart)
      .reduce((sum, p) => sum + p.amount, 0) ?? 0;

  // 월별 매출 데이터 (최근 12개월)
  const monthlyRevenueMap: Record<string, { revenue: number; count: number }> = {};
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthlyRevenueMap[key] = { revenue: 0, count: 0 };
  }
  payments?.forEach((p) => {
    if (!p.paid_at) return;
    const d = new Date(p.paid_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (monthlyRevenueMap[key]) {
      monthlyRevenueMap[key].revenue += p.amount;
      monthlyRevenueMap[key].count += 1;
    }
  });
  const monthlyRevenue = Object.entries(monthlyRevenueMap).map(([month, data]) => ({
    month: month.slice(5) + "월",
    ...data,
  }));

  // 월별 신규 회원 (최근 12개월)
  const monthlyMembersMap: Record<string, number> = {};
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthlyMembersMap[key] = 0;
  }
  profiles?.forEach((p) => {
    const d = new Date(p.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (monthlyMembersMap[key] !== undefined) {
      monthlyMembersMap[key] += 1;
    }
  });
  const monthlyMembers = Object.entries(monthlyMembersMap).map(([month, count]) => ({
    month: month.slice(5) + "월",
    count,
  }));

  // 등급별 회원 분포
  const gradeCountMap: Record<string, number> = {};
  profiles?.forEach((p) => {
    const gid = p.grade_id || "none";
    gradeCountMap[gid] = (gradeCountMap[gid] || 0) + 1;
  });
  const gradeDistribution = [
    ...(grades ?? []).map((g) => ({
      name: g.name,
      count: gradeCountMap[g.id] || 0,
      color: g.color || "#666",
    })),
    { name: "미배정", count: gradeCountMap["none"] || 0, color: "#555" },
  ];

  // 프로그램별 매출 (구독 기반)
  const programRevenueMap: Record<string, { revenue: number; subscriptions: number }> = {};
  subscriptions?.forEach((s) => {
    if (!s.program_id) return;
    if (!programRevenueMap[s.program_id]) {
      programRevenueMap[s.program_id] = { revenue: 0, subscriptions: 0 };
    }
    const plan = s.pricing_plan as unknown as { price: number } | { price: number }[] | null;
    const price = Array.isArray(plan) ? (plan[0]?.price ?? 0) : (plan?.price ?? 0);
    programRevenueMap[s.program_id].revenue += price;
    programRevenueMap[s.program_id].subscriptions += 1;
  });
  const topPrograms = Object.entries(programRevenueMap)
    .map(([programId, data]) => ({
      name: programs?.find((p) => p.id === programId)?.name ?? "알 수 없음",
      ...data,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  const nameOf = (slug: string) => programs?.find((p) => p.slug === slug)?.name ?? slug;
  // 연계 링크가 있는 보내는 프로그램(공용 기준 코드 `banana-idea-link`의 BANANA_SOURCES와 같게 유지) — 0건이어도 늘 표시
  const LINK_SENDERS = ["style-dna-analyzer", "emotion-writer", "reverse-prompt"];
  const toRows = (m: Record<string, { count: number; downloaded: number; handedOff: number }> | undefined) =>
    [...new Set([...LINK_SENDERS, ...Object.keys(m ?? {})])]
      .map((slug) => ({ slug, name: nameOf(slug), ...(m?.[slug] ?? { count: 0, downloaded: 0, handedOff: 0 }) }))
      .sort((a, b) => b.count - a.count);
  const bananaRows = toRows(bananaStats?.banana);
  const bananaLinked = bananaRows.reduce((sum, r) => sum + r.count, 0);
  const imageRows = toRows(bananaStats?.image);
  const imageLinked = imageRows.reduce((sum, r) => sum + r.count, 0);
  const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : "—");

  const SUMMARY_STATS = [
    {
      icon: TrendingUp,
      label: "총 매출",
      value: formatKRW(totalRevenue),
      color: "text-gold",
      bg: "bg-gold/10",
    },
    {
      icon: CreditCard,
      label: "이번 달 매출",
      value: formatKRW(thisMonthRevenue),
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    {
      icon: Users,
      label: "총 회원",
      value: `${totalMembers ?? 0}명`,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
    },
    {
      icon: ShoppingBag,
      label: "활성 구독",
      value: `${activeSubscriptions ?? 0}건`,
      color: "text-purple-400",
      bg: "bg-purple-500/10",
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">
          <GoldGradientText>통계</GoldGradientText>
        </h1>
        <p className="text-subtext mt-1">매출, 회원, 구독 현황을 한눈에 확인하세요</p>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {SUMMARY_STATS.map(({ icon: Icon, label, value, color, bg }) => (
          <GlassCard key={label} className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
                <Icon size={18} className={color} />
              </div>
            </div>
            <div className={`text-xl font-black ${color}`}>{value}</div>
            <div className="text-subtext text-sm mt-0.5">{label}</div>
          </GlassCard>
        ))}
      </div>

      {/* 차트 */}
      <StatisticsCharts
        monthlyRevenue={monthlyRevenue}
        gradeDistribution={gradeDistribution}
        topPrograms={topPrograms}
        monthlyMembers={monthlyMembers}
      />

      {/* 다른 프로그램에서 이어진 작업(최근 7일/30일) */}
      {bananaStats && (
        <GlassCard className="p-5 mt-8" data-banana-link-stats>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <Link2 size={16} className="text-gold" />
            <h2 className="text-lg font-bold text-white">다른 프로그램에서 이어진 작업</h2>
            <div className="ml-auto flex gap-1" role="tablist" aria-label="기간">
              {([7, 30] as const).map((d) => (
                <a key={d} href={`?linkRange=${d}`} role="tab" aria-selected={linkDays === d} data-link-range={d}
                  className={`px-3 py-1 rounded-lg text-sm border ${linkDays === d ? "border-gold text-gold bg-gold/10 font-bold" : "border-white/10 text-subtext"}`}>
                  최근 {d}일
                </a>
              ))}
            </div>
          </div>
          {[
            { key: "banana", title: "바나나 캔버스", unit: "작업", handoffLabel: "다음 단계로 넘김", rows: bananaRows, linked: bananaLinked, total: bananaStats.total, extra: ` · 바나나 전체 다운로드 비율 ${pct(bananaStats.totalDownloaded, bananaStats.total)}` },
            { key: "image", title: "AI 이미지 스튜디오", unit: "생성", handoffLabel: "바나나로 넘김", rows: imageRows, linked: imageLinked, total: bananaStats.imageTotal, extra: "" },
          ].map((t) => (
            <div key={t.key} className="mb-6" data-link-table={t.key}>
              <p className="text-subtext text-sm mb-2">
                {t.title} · 다른 프로그램에서 보낸 것으로 시작한 {t.unit} {t.linked}건 / 전체 {t.total}건{t.extra}
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-subtext text-left border-b border-white/10">
                      <th className="py-2 font-medium">보낸 프로그램</th>
                      <th className="py-2 font-medium text-right">{t.unit} 수</th>
                      <th className="py-2 font-medium text-right">비율</th>
                      <th className="py-2 font-medium text-right">다운로드까지</th>
                      <th className="py-2 font-medium text-right">{t.handoffLabel}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {t.rows.map((r) => (
                      <tr key={r.slug} className={`border-b border-white/5 ${r.count ? "text-white" : "text-subtext"}`} data-link-row={r.count ? "used" : "unused"}>
                        <td className="py-2">{r.name}</td>
                        {r.count ? (
                          <>
                            <td className="py-2 text-right">{r.count}건</td>
                            <td className="py-2 text-right">{pct(r.count, t.linked)}</td>
                            <td className="py-2 text-right">{r.downloaded}건 ({pct(r.downloaded, r.count)})</td>
                            <td className="py-2 text-right">{r.handedOff}건 ({pct(r.handedOff, r.count)})</td>
                          </>
                        ) : (
                          <td className="py-2 text-right" colSpan={4}>아직 없음</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          <p className="text-subtext text-xs mt-2">연계 링크: 스타일 분석기·감성 글귀·리버스 프롬프트 → 바나나 캔버스·AI 이미지 스튜디오. 바나나 다운로드는 2026-10-22부터, 다음 단계로 넘김(형식 바꾸기·스토리보드)은 바나나 v1.28부터, 이미지 스튜디오 연계는 v1.26·다운로드/바나나로 넘김은 v1.27부터 쌓입니다. 바나나 결과는 30일 뒤 자동 삭제됩니다.</p>
        </GlassCard>
      )}
    </div>
  );
}
