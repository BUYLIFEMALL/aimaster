import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const { code, planId } = await req.json();
  if (!code || !planId) {
    return NextResponse.json({ error: "쿠폰 코드와 플랜 ID가 필요합니다" }, { status: 400 });
  }

  // 플랜 정보 조회
  const { data: plan } = await supabase
    .from("pricing_plans")
    .select("id, price, program_id")
    .eq("id", planId)
    .single();

  if (!plan) return NextResponse.json({ error: "플랜을 찾을 수 없습니다" }, { status: 404 });

  // 쿠폰 조회
  const { data: coupon } = await supabase
    .from("coupons")
    .select("*")
    .eq("code", code.toUpperCase().trim())
    .eq("is_active", true)
    .single();

  if (!coupon) {
    return NextResponse.json({ valid: false, error: "유효하지 않은 쿠폰 코드입니다" });
  }

  // 만료 확인
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    return NextResponse.json({ valid: false, error: "만료된 쿠폰입니다" });
  }

  // 사용 횟수 확인
  if (coupon.max_uses != null && coupon.current_uses >= coupon.max_uses) {
    return NextResponse.json({ valid: false, error: "사용 횟수가 초과된 쿠폰입니다" });
  }

  // 프로그램 제한 확인
  if (coupon.program_id && coupon.program_id !== plan.program_id) {
    return NextResponse.json({ valid: false, error: "이 프로그램에는 사용할 수 없는 쿠폰입니다" });
  }

  // 유저 중복 사용 확인
  const { data: usage } = await supabase
    .from("coupon_usage")
    .select("id")
    .eq("coupon_id", coupon.id)
    .eq("user_id", user.id)
    .single();

  if (usage) {
    return NextResponse.json({ valid: false, error: "이미 사용한 쿠폰입니다" });
  }

  // 할인 금액 계산
  let discountAmount = 0;
  if (coupon.type === "free") {
    discountAmount = plan.price;
  } else if (coupon.type === "percentage") {
    discountAmount = Math.floor(plan.price * (coupon.value / 100));
  } else if (coupon.type === "fixed") {
    discountAmount = Math.min(coupon.value, plan.price);
  }

  const finalPrice = Math.max(0, plan.price - discountAmount);

  return NextResponse.json({
    valid: true,
    coupon: {
      id: coupon.id,
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
    },
    discountAmount,
    finalPrice,
    originalPrice: plan.price,
  });
}
