import { createClient } from "@/lib/supabase/server";
import GoldGradientText from "@/components/ui/GoldGradientText";
import GlassCard from "@/components/ui/GlassCard";
import StatisticsCharts from "@/components/admin/StatisticsCharts";
import { formatKRW } from "@/lib/utils/format";
import { TrendingUp, Users, CreditCard, ShoppingBag } from "lucide-react";

export const metadata = { title: "통계" };

export default async function AdminStatisticsPage() {
  const supabase = await createClient();

  // 병렬로 데이터 조회
  const [
    { count: totalMembers },
    { count: activeSubscriptions },
    { data: payments },
    { data: profiles },
    { data: grades },
    { data: programs },
    { data: subscriptions },
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
    supabase.from("programs").select("id, name"),
    supabase
      .from("subscriptions")
      .select("program_id, pricing_plan:pricing_plans(price)")
      .eq("status", "active"),
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
    </div>
  );
}
