import { createServiceClient } from "@/lib/supabase/service";
import GoldGradientText from "@/components/ui/GoldGradientText";
import CouponManager from "@/components/admin/CouponManager";

export const dynamic = "force-dynamic";
export const metadata = { title: "쿠폰 관리" };

export default async function AdminCouponsPage() {
  const supabase = createServiceClient();

  const { data: coupons } = await supabase
    .from("coupons")
    .select("*, programs(name), profiles!assigned_user_id(name, email), coupon_usage(user_id, used_at, profiles(name, email))")
    .order("created_at", { ascending: false });

  const { data: programs } = await supabase
    .from("programs")
    .select("id, name")
    .eq("is_active", true)
    .order("name");

  const { data: members } = await supabase
    .from("profiles")
    .select("id, name, email")
    .order("created_at", { ascending: false });

  // 사용된 쿠폰의 구독 상태 확인을 위해 구독 정보 조회
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const usageUserIds: string[] = [];
  for (const c of coupons ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const usage = (c as any).coupon_usage as { user_id: string }[] | undefined;
    if (usage) usage.forEach((u) => { if (!usageUserIds.includes(u.user_id)) usageUserIds.push(u.user_id); });
  }

  // user_id별 + program_id별 구독 맵
  let subsByUserProgram: Record<string, { status: string; expires_at: string | null }[]> = {};
  let subsByUser: Record<string, { status: string; expires_at: string | null }[]> = {};
  if (usageUserIds.length > 0) {
    const { data: subs } = await supabase
      .from("subscriptions")
      .select("user_id, program_id, status, expires_at")
      .in("user_id", usageUserIds);
    if (subs) {
      for (const s of subs) {
        const upKey = `${s.user_id}_${s.program_id}`;
        if (!subsByUserProgram[upKey]) subsByUserProgram[upKey] = [];
        subsByUserProgram[upKey].push({ status: s.status, expires_at: s.expires_at });
        if (!subsByUser[s.user_id]) subsByUser[s.user_id] = [];
        subsByUser[s.user_id].push({ status: s.status, expires_at: s.expires_at });
      }
    }
  }

  // profiles JOIN을 assigned_user 필드로 매핑 + 구독 상태 추가
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mappedCoupons = (coupons ?? []).map((c: any) => {
    const usage = (c.coupon_usage || []).map((u: any) => {
      // program_id 매칭 우선, 없으면 user_id만으로 fallback
      const key = `${u.user_id}_${c.program_id}`;
      const subs = subsByUserProgram[key] || subsByUser[u.user_id] || [];
      const activeSub = subs.find((s) => s.status === "active");
      let subStatus: "active" | "expired" | "none" = "none";
      if (activeSub) {
        subStatus = (!activeSub.expires_at || new Date(activeSub.expires_at) > new Date()) ? "active" : "expired";
      } else if (subs.length > 0) {
        subStatus = "expired";
      }
      return { ...u, sub_status: subStatus };
    });

    return {
      ...c,
      assigned_user: c.profiles || null,
      usage,
      profiles: undefined,
      coupon_usage: undefined,
    };
  }) as any[];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">
          <GoldGradientText>쿠폰</GoldGradientText> 관리
        </h1>
        <p className="text-subtext mt-1">할인 쿠폰을 발행하고 관리하세요</p>
      </div>

      <CouponManager
        initialCoupons={mappedCoupons}
        programs={programs ?? []}
        members={members ?? []}
      />
    </div>
  );
}
