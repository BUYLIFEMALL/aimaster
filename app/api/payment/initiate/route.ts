import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createPayappPayment } from "@/lib/payapp/client";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    const { planId } = await req.json();
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

    // 주문번호 생성
    const orderId = `ORDER_${Date.now()}_${user.id.slice(0, 8)}`;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const programName = (plan.programs as { name: string })?.name ?? "프로그램";

    // 페이앱 결제 요청
    const { billId, paymentUrl } = await createPayappPayment({
      goodname: `${programName} - ${plan.name}`,
      price: plan.price,
      recvphone: "01000000000",
      orderid: orderId,
      callbackurl: `${appUrl}/api/payment/webhook`,
      returnurl: `${appUrl}/dashboard`,
      memo: planId,
    });

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
        .neq("id", user.id) // 자기 자신 제외
        .single();
      if (referrer) referrerUserId = referrer.id;
    }

    // payment_records pending 생성
    await supabase.from("payment_records").insert({
      user_id: user.id,
      amount: plan.price,
      status: "pending",
      payapp_order_id: orderId,
      payapp_data: {
        billId, planId, programId: plan.program_id, billingType: plan.billing_type,
        ...(referrerUserId ? { referrerUserId } : {}),
      },
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
