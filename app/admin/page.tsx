import { redirect } from "next/navigation";
import { Users, Package, CreditCard, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import GlassCard from "@/components/ui/GlassCard";
import GoldGradientText from "@/components/ui/GoldGradientText";
import { formatKRW } from "@/lib/utils/format";

export default async function AdminDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.is_admin) redirect("/dashboard");

  const [
    { count: memberCount },
    { count: programCount },
    { count: activeSubCount },
    { data: recentPayments },
    { count: pendingSettlements },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("programs").select("*", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("subscriptions").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase
      .from("payment_records")
      .select("amount, paid_at, user:profiles(name, email)")
      .eq("status", "completed")
      .order("paid_at", { ascending: false })
      .limit(5),
    supabase.from("settlement_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
  ]);

  const totalRevenue = recentPayments?.reduce((s, p) => s + p.amount, 0) ?? 0;

  const STATS = [
    { icon: Users, label: "총 회원", value: memberCount ?? 0, suffix: "명", color: "text-blue-400", bg: "bg-blue-500/10" },
    { icon: Package, label: "활성 프로그램", value: programCount ?? 0, suffix: "개", color: "text-gold", bg: "bg-gold/10" },
    { icon: TrendingUp, label: "활성 구독", value: activeSubCount ?? 0, suffix: "건", color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { icon: CreditCard, label: "정산 대기", value: pendingSettlements ?? 0, suffix: "건", color: "text-orange-400", bg: "bg-orange-500/10" },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">
          <GoldGradientText>관리자</GoldGradientText> 대시보드
        </h1>
        <p className="text-subtext mt-1">AI Master 운영 현황</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {STATS.map(({ icon: Icon, label, value, suffix, color, bg }) => (
          <GlassCard key={label} className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
                <Icon size={18} className={color} />
              </div>
            </div>
            <div className={`text-2xl font-black ${color}`}>
              {value.toLocaleString()}{suffix}
            </div>
            <div className="text-subtext text-sm mt-0.5">{label}</div>
          </GlassCard>
        ))}
      </div>

      {/* Recent Payments */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div>
          <h2 className="text-lg font-bold text-white mb-4">최근 결제</h2>
          <GlassCard className="p-0 overflow-hidden">
            {!recentPayments || recentPayments.length === 0 ? (
              <p className="text-subtext text-sm p-6 text-center">결제 내역 없음</p>
            ) : (
              <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left text-xs text-subtext p-4">회원</th>
                    <th className="text-right text-xs text-subtext p-4">금액</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPayments.map((p, i) => (
                    <tr key={i} className="border-b border-white/5">
                      <td className="p-4">
                        <p className="text-sm text-white">{(p.user as unknown as { name?: string; email: string })?.name ?? "-"}</p>
                        <p className="text-xs text-subtext">{(p.user as unknown as { name?: string; email: string })?.email}</p>
                      </td>
                      <td className="text-right p-4">
                        <span className="gold-text font-medium text-sm">{formatKRW(p.amount)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </GlassCard>
        </div>

        <div>
          <h2 className="text-lg font-bold text-white mb-4">빠른 메뉴</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { href: "/admin/programs/new", label: "새 프로그램 등록", icon: Package },
              { href: "/admin/members", label: "회원 관리", icon: Users },
              { href: "/admin/grades", label: "등급 관리", icon: TrendingUp },
              { href: "/admin/settlements", label: "정산 승인", icon: CreditCard },
            ].map(({ href, label, icon: Icon }) => (
              <a
                key={href}
                href={href}
                className="glass-card rounded-xl p-4 hover:border-gold/30 transition-colors cursor-pointer"
              >
                <Icon size={20} className="text-gold mb-2" />
                <p className="text-sm text-white font-medium">{label}</p>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
