import { redirect } from "next/navigation";
import { TrendingUp, DollarSign, Clock, MousePointerClick, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import GlassCard from "@/components/ui/GlassCard";
import GoldGradientText from "@/components/ui/GoldGradientText";
import AffiliateLinkCard from "@/components/affiliate/AffiliateLinkCard";
import { formatKRW, formatDate } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export const metadata = { title: "어필리에이트" };

export default async function AffiliatePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const serviceClient = createServiceClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("affiliate_code")
    .eq("id", user.id)
    .single();

  const [{ data: earnings }, clickStats, { count: referralCount }] = await Promise.all([
    supabase
      .from("affiliate_earnings")
      .select("*, program:programs(name)")
      .eq("referrer_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
    // 클릭 통계 (service client로 조회 — RLS 우회)
    (async () => {
      const { count: totalClicks } = await serviceClient
        .from("affiliate_clicks")
        .select("*", { count: "exact", head: true })
        .eq("referrer_id", user.id);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count: todayClicks } = await serviceClient
        .from("affiliate_clicks")
        .select("*", { count: "exact", head: true })
        .eq("referrer_id", user.id)
        .gte("created_at", today.toISOString());

      return { totalClicks: totalClicks ?? 0, todayClicks: todayClicks ?? 0 };
    })(),
    // 추천 가입자 수
    serviceClient
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("referred_by", user.id),
  ]);

  const totalPending = earnings?.filter(e => e.status === "pending")
    .reduce((s, e) => s + e.commission_amount, 0) ?? 0;
  const totalSettled = earnings?.filter(e => e.status === "settled")
    .reduce((s, e) => s + e.commission_amount, 0) ?? 0;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">
          <GoldGradientText>어필리에이트</GoldGradientText> 대시보드
        </h1>
        <p className="text-subtext">추천 링크를 공유하고 수익을 창출하세요</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center">
              <MousePointerClick size={18} className="text-gold" />
            </div>
            <div>
              <div className="text-xl font-bold text-white">{clickStats.totalClicks}</div>
              <div className="text-subtext text-xs">총 클릭수</div>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Users size={18} className="text-blue-400" />
            </div>
            <div>
              <div className="text-xl font-bold text-blue-400">{referralCount ?? 0}</div>
              <div className="text-subtext text-xs">추천 가입</div>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center">
              <TrendingUp size={18} className="text-gold" />
            </div>
            <div>
              <div className="text-xl font-bold text-white">{earnings?.length ?? 0}</div>
              <div className="text-subtext text-xs">결제 건수</div>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center">
              <Clock size={18} className="text-gold" />
            </div>
            <div>
              <div className="text-xl font-bold gold-text">{formatKRW(totalPending)}</div>
              <div className="text-subtext text-xs">정산 대기</div>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <DollarSign size={18} className="text-emerald-400" />
            </div>
            <div>
              <div className="text-xl font-bold text-emerald-400">{formatKRW(totalSettled)}</div>
              <div className="text-subtext text-xs">누적 정산</div>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* 오늘 클릭 */}
      {clickStats.todayClicks > 0 && (
        <div className="mb-8">
          <GlassCard className="p-4 border-gold/20">
            <p className="text-sm text-subtext">
              오늘 추천 링크 클릭: <span className="text-gold font-bold">{clickStats.todayClicks}회</span>
            </p>
          </GlassCard>
        </div>
      )}

      {/* Affiliate Link */}
      {profile?.affiliate_code && (
        <div className="mb-8">
          <h2 className="text-lg font-bold text-white mb-4">내 추천 링크</h2>
          <AffiliateLinkCard affiliateCode={profile.affiliate_code} />
        </div>
      )}

      {/* Earnings History */}
      <div>
        <h2 className="text-lg font-bold text-white mb-4">수익 내역</h2>
        {!earnings || earnings.length === 0 ? (
          <GlassCard className="text-center py-10">
            <TrendingUp size={36} className="text-subtext mx-auto mb-3" />
            <p className="text-subtext">아직 수익 내역이 없습니다</p>
            <p className="text-subtext text-sm mt-1">추천 링크를 공유해 수익을 시작하세요</p>
          </GlassCard>
        ) : (
          <GlassCard className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full min-w-[480px]">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-xs text-subtext font-medium p-4">프로그램</th>
                  <th className="text-right text-xs text-subtext font-medium p-4 hidden sm:table-cell">수수료율</th>
                  <th className="text-right text-xs text-subtext font-medium p-4">수익</th>
                  <th className="text-right text-xs text-subtext font-medium p-4">상태</th>
                  <th className="text-right text-xs text-subtext font-medium p-4 hidden sm:table-cell">날짜</th>
                </tr>
              </thead>
              <tbody>
                {earnings.map((e) => (
                  <tr key={e.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                    <td className="text-sm text-white p-4">{e.program?.name ?? "-"}</td>
                    <td className="text-sm text-subtext text-right p-4 hidden sm:table-cell">{e.commission_rate}%</td>
                    <td className="text-sm font-medium gold-text text-right p-4">
                      +{formatKRW(e.commission_amount)}
                    </td>
                    <td className="text-right p-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        e.status === "settled"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : e.status === "rejected"
                          ? "bg-red-500/20 text-red-400"
                          : "bg-gold/20 text-gold"
                      }`}>
                        {e.status === "settled" ? "정산완료" : e.status === "rejected" ? "반려" : "대기중"}
                      </span>
                    </td>
                    <td className="text-xs text-subtext text-right p-4 hidden sm:table-cell">{formatDate(e.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
