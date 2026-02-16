import { redirect } from "next/navigation";
import Link from "next/link";
import { Calendar, Clock, Package, Ticket } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import GlassCard from "@/components/ui/GlassCard";

export const metadata = { title: "내 구독" };
import GoldGradientText from "@/components/ui/GoldGradientText";
import GoldButton from "@/components/ui/GoldButton";
import Badge from "@/components/ui/Badge";
import { formatKRW, formatDate, daysRemaining } from "@/lib/utils/format";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*, grade:member_grades(*)")
    .eq("id", user.id)
    .single();

  const { data: subscriptions } = await supabase
    .from("subscriptions")
    .select("*, program:programs(name, slug, thumbnail_url), pricing_plan:pricing_plans(name, billing_type, price)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  // 내 쿠폰 조회 (assigned_user_id가 나인 미사용 쿠폰)
  const { data: myCoupons } = await supabase
    .from("coupons")
    .select("*, programs(name)")
    .eq("assigned_user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-bold text-white">
            안녕하세요, <GoldGradientText>{profile?.name ?? "회원"}님</GoldGradientText>
          </h1>
          {profile?.grade && (
            <Badge
              variant="custom"
              label={profile.grade.name}
              style={{ backgroundColor: `${profile.grade.color}20`, color: profile.grade.color, borderColor: `${profile.grade.color}40` }}
              className="border"
            />
          )}
        </div>
        <p className="text-subtext">구독 중인 프로그램을 확인하세요</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center">
              <Package size={18} className="text-gold" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{subscriptions?.length ?? 0}</div>
              <div className="text-subtext text-xs">활성 구독</div>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center">
              <Calendar size={18} className="text-gold" />
            </div>
            <div>
              <div className="text-sm font-medium text-white">{formatDate(profile?.created_at ?? "")}</div>
              <div className="text-subtext text-xs">가입일</div>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-4 col-span-2 md:col-span-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center">
              <Clock size={18} className="text-gold" />
            </div>
            <div>
              <div className="text-sm font-medium text-white truncate">{profile?.affiliate_code ?? "-"}</div>
              <div className="text-subtext text-xs">내 추천 코드</div>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* My Coupons */}
      {myCoupons && myCoupons.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Ticket size={18} className="text-gold" />
            내 쿠폰
          </h2>
          <div className="grid md:grid-cols-2 gap-3">
            {myCoupons.map((coupon) => {
              const isExpired = coupon.expires_at && new Date(coupon.expires_at) < new Date();
              const isUsedUp = coupon.max_uses != null && coupon.current_uses >= coupon.max_uses;
              const isUsable = !isExpired && !isUsedUp;
              const programName = coupon.programs
                ? (Array.isArray(coupon.programs) ? coupon.programs[0]?.name : coupon.programs.name)
                : null;

              return (
                <GlassCard key={coupon.id} className={`p-4 ${!isUsable ? "opacity-60" : ""}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-lg font-bold text-gold">{coupon.code}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      isUsable ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                    }`}>
                      {isExpired ? "만료" : isUsedUp ? "사용완료" : "사용 가능"}
                    </span>
                  </div>
                  <div className="text-sm text-subtext space-y-1">
                    <p>
                      {coupon.type === "free" ? "100% 무료" :
                       coupon.type === "percentage" ? `${coupon.value}% 할인` :
                       `${coupon.value.toLocaleString()}원 할인`}
                      {programName ? ` · ${programName}` : " · 전체 프로그램"}
                    </p>
                    {coupon.expires_at && (
                      <p className={isExpired ? "text-red-400" : ""}>
                        만료: {new Date(coupon.expires_at).toLocaleDateString("ko-KR")}
                      </p>
                    )}
                    {!coupon.expires_at && <p>기한 없음</p>}
                  </div>
                  {isUsable && programName && (
                    <div className="mt-3 pt-2 border-t border-white/10">
                      <Link href="/programs">
                        <GoldButton variant="outline" size="sm" fullWidth>
                          프로그램에서 사용하기
                        </GoldButton>
                      </Link>
                    </div>
                  )}
                </GlassCard>
              );
            })}
          </div>
        </div>
      )}

      {/* Subscriptions */}
      <div>
        <h2 className="text-lg font-bold text-white mb-4">구독 중인 프로그램</h2>

        {!subscriptions || subscriptions.length === 0 ? (
          <GlassCard className="text-center py-12">
            <Package size={40} className="text-subtext mx-auto mb-4" />
            <p className="text-subtext mb-4">구독 중인 프로그램이 없습니다</p>
            <Link href="/programs">
              <GoldButton>프로그램 둘러보기</GoldButton>
            </Link>
          </GlassCard>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {subscriptions.map((sub) => {
              const remaining = daysRemaining(sub.expires_at);
              const isExpiringSoon = sub.expires_at &&
                Math.ceil((new Date(sub.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) <= 7;

              return (
                <GlassCard key={sub.id} className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-semibold truncate">
                        {sub.program?.name ?? "프로그램"}
                      </h3>
                      <p className="text-subtext text-sm">
                        {sub.pricing_plan?.name} · {formatKRW(sub.pricing_plan?.price ?? 0)}
                      </p>
                    </div>
                    <span className={`ml-3 text-xs font-bold px-2.5 py-1 rounded-full ${
                      isExpiringSoon
                        ? "bg-orange-500/20 text-orange-400"
                        : "bg-emerald-500/20 text-emerald-400"
                    }`}>
                      {remaining}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-subtext">
                    <span>시작: {formatDate(sub.started_at)}</span>
                    {sub.expires_at && <span>만료: {formatDate(sub.expires_at)}</span>}
                    {!sub.expires_at && <span className="text-gold">평생 이용</span>}
                  </div>
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <Link href={`/programs/${sub.program?.slug}`}>
                      <GoldButton variant="outline" size="sm" fullWidth>
                        프로그램 보기
                      </GoldButton>
                    </Link>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
