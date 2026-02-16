import { createServiceClient } from "@/lib/supabase/service";
import GoldGradientText from "@/components/ui/GoldGradientText";
import CouponManager from "@/components/admin/CouponManager";

export const dynamic = "force-dynamic";
export const metadata = { title: "쿠폰 관리" };

export default async function AdminCouponsPage() {
  const supabase = createServiceClient();

  const { data: coupons } = await supabase
    .from("coupons")
    .select("*, programs(name), profiles!assigned_user_id(name, email)")
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

  // profiles JOIN을 assigned_user 필드로 매핑
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mappedCoupons = (coupons ?? []).map((c: any) => ({
    ...c,
    assigned_user: c.profiles || null,
    profiles: undefined,
  })) as any[];

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
