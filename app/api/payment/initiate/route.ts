import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createPayappPayment } from "@/lib/payapp/client";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    const { planId, couponCode } = await req.json();
    if (!planId) return NextResponse.json({ error: "planId 필요" }, { status: 400 });

    const supabase = await createClient();

    // 로그인 확인
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

    // 가격 플랜 조회
    const { data: plan } = await supabase
      .from("pricing_plans")
      .select("*, programs(name, slug)")
      .eq("id", planId)
      .eq("is_active", true)
      .single();

    if (!plan) return NextResponse.json({ error: "존재하지 않는 플랜입니다." }, { status: 404 });

    // 이미 활성 구독 확인
    const { data: existing } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("user_id", user.id)
      .eq("program_id", plan.program_id)
      .eq("status", "active")
      .maybeSingle();

    if (existing) return NextResponse.json({ error: "이미 구독 중인 프로그램입니다." }, { status: 409 });

    // 쿠폰 검증 (서버사이드 재검증)
    let couponId: string | null = null;
    let discountAmount = 0;
    let finalPrice = plan.price;

    if (couponCode) {
      const serviceClient = createServiceClient();
      const { data: coupon } = await serviceClient
        .from("coupons")
        .select("*")
        .eq("code", couponCode.toUpperCase().trim())
        .eq("is_active", true)
        .single();

      if (!coupon) return NextResponse.json({ error: "유효하지 않은 쿠폰입니다." }, { status: 400 });
      if (coupon.expires_at && new Date(coupon.expires_at) < new Date())
        return NextResponse.json({ error: "만료된 쿠폰입니다." }, { status: 400 });
      if (coupon.max_uses != null && coupon.current_uses >= coupon.max_uses)
        return NextResponse.json({ error: "사용 횟수가 초과된 쿠폰입니다." }, { status: 400 });
      if (coupon.program_id && coupon.program_id !== plan.program_id)
        return NextResponse.json({ error: "이 프로그램에 사용할 수 없는 쿠폰입니다." }, { status: 400 });

      const { data: usage } = await serviceClient
        .from("coupon_usage")
        .select("id")
        .eq("coupon_id", coupon.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (usage) return NextResponse.json({ error: "이미 사용한 쿠폰입니다." }, { status: 400 });

      couponId = coupon.id;
      if (coupon.type === "free") {
        discountAmount = plan.price;
      } else if (coupon.type === "percentage") {
        discountAmount = Math.floor(plan.price * (coupon.value / 100));
      } else if (coupon.type === "fixed") {
        discountAmount = Math.min(coupon.value, plan.price);
      }
      finalPrice = Math.max(0, plan.price - discountAmount);
    }

    // 어필리에이트 쿠키로 추천인 조회
    const cookieStore = await cookies();
    const refCode = cookieStore.get("affiliate_ref")?.value;
    let referrerUserId: string | null = null;
    if (refCode) {
      const serviceClient = createServiceClient();
      const { data: referrer } = await serviceClient
        .from("profiles")
        .select("id")
        .eq("affiliate_code", refCode)
        .neq("id", user.id)
        .single();
      if (referrer) referrerUserId = referrer.id;
    }

    const orderId = `ORDER_${Date.now()}_${user.id.slice(0, 8)}`;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const programName = (plan.programs as { name: string })?.name ?? "프로그램";

    const payappDataBase = {
      planId, programId: plan.program_id, billingType: plan.billing_type,
      originalAmount: plan.price, discountAmount, couponId,
      ...(referrerUserId ? { referrerUserId } : {}),
    };

    // 100% 무료 쿠폰: Payapp 호출 없이 즉시 구독 생성
    if (finalPrice === 0) {
      const serviceClient = createServiceClient();

      // payment_records 생성 (completed)
      const { data: payRecord } = await serviceClient.from("payment_records").insert({
        user_id: user.id,
        amount: 0,
        status: "completed",
        payapp_order_id: orderId,
        payapp_data: { ...payappDataBase, billId: "FREE", payId: "FREE" },
        paid_at: new Date().toISOString(),
      }).select("id").single();

      // 구독 생성
      const { calcExpiresAt } = await import("@/lib/payapp/client");
      const expiresAt = calcExpiresAt(plan.billing_type);
      await serviceClient.from("subscriptions").insert({
        user_id: user.id,
        program_id: plan.program_id,
        pricing_plan_id: planId,
        status: "active",
        started_at: new Date().toISOString(),
        expires_at: expiresAt?.toISOString() ?? null,
        payapp_order_id: orderId,
      });

      // 쿠폰 사용 기록
      if (couponId && payRecord) {
        await serviceClient.from("coupon_usage").insert({
          coupon_id: couponId,
          user_id: user.id,
          payment_record_id: payRecord.id,
          discount_amount: discountAmount,
        });
        const { data: couponData } = await serviceClient.from("coupons").select("current_uses").eq("id", couponId!).single();
        if (couponData) {
          await serviceClient.from("coupons").update({ current_uses: couponData.current_uses + 1 }).eq("id", couponId!);
        }
      }

      return NextResponse.json({ free: true, orderId });
    }

    // 유료 결제: 할인 적용된 금액으로 페이앱 결제 요청
    const { billId, paymentUrl } = await createPayappPayment({
      goodname: `${programName} - ${plan.name}`,
      price: finalPrice,
      recvphone: "01000000000",
      orderid: orderId,
      callbackurl: `${appUrl}/api/payment/webhook`,
      returnurl: `${appUrl}/dashboard`,
      memo: planId,
    });

    // payment_records pending 생성
    await supabase.from("payment_records").insert({
      user_id: user.id,
      amount: finalPrice,
      status: "pending",
      payapp_order_id: orderId,
      payapp_data: { ...payappDataBase, billId },
    });

    return NextResponse.json({ paymentUrl, orderId });
  } catch (err) {
    console.error("결제 시작 오류:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "결제 요청 실패" },
      { status: 500 }
    );
  }
}
