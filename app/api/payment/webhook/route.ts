import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { calcExpiresAt } from "@/lib/payapp/client";
import { sendPaymentEmail } from "@/lib/email/sender";

/**
 * 페이앱 결제 완료 웹훅
 * 페이앱 서버 → POST /api/payment/webhook
 * 응답: "00" (성공) or 기타 (실패)
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const billId    = formData.get("bill_id") as string;
    const payId     = formData.get("pay_id") as string;
    const orderId   = formData.get("orderid") as string;
    const price     = parseInt(formData.get("price") as string || "0");
    const feedback  = formData.get("feedback") as string; // "0" = 성공
    const goodname  = formData.get("goodname") as string;

    console.log("[Webhook]", { billId, orderId, price, feedback });

    // feedback "0" = 결제 성공
    if (feedback !== "0") {
      console.warn("[Webhook] 결제 실패:", feedback);
      return new NextResponse("fail", { status: 200 });
    }

    const supabase = createServiceClient();

    // payment_records 조회
    const { data: record } = await supabase
      .from("payment_records")
      .select("*")
      .eq("payapp_order_id", orderId)
      .single();

    if (!record) {
      console.error("[Webhook] payment_record 없음:", orderId);
      return new NextResponse("00", { status: 200 }); // 페이앱엔 성공 응답
    }

    // 중복 처리 방지
    if (record.status === "completed") {
      return new NextResponse("00", { status: 200 });
    }

    const payData = record.payapp_data as {
      planId: string;
      programId: string;
      billingType: string;
      billId: string;
    };

    // 금액 검증
    if (record.amount !== price) {
      console.error("[Webhook] 금액 불일치:", record.amount, "!=", price);
      await supabase.from("payment_records").update({ status: "failed" }).eq("id", record.id);
      return new NextResponse("fail", { status: 200 });
    }

    // payment_records → completed
    await supabase.from("payment_records").update({
      status: "completed",
      payapp_order_id: orderId,
      payapp_data: { ...payData, billId, payId, goodname },
      paid_at: new Date().toISOString(),
    }).eq("id", record.id);

    // 구독 생성
    const expiresAt = calcExpiresAt(payData.billingType);
    const { data: subscription } = await supabase.from("subscriptions").insert({
      user_id: record.user_id,
      program_id: payData.programId,
      pricing_plan_id: payData.planId,
      status: "active",
      started_at: new Date().toISOString(),
      expires_at: expiresAt?.toISOString() ?? null,
      payapp_order_id: orderId,
    }).select("id").single();

    // payment_records에 subscription_id 연결
    if (subscription) {
      await supabase.from("payment_records")
        .update({ subscription_id: subscription.id })
        .eq("id", record.id);
    }

    // 어필리에이트 처리 (ref 쿠키 확인)
    // 웹훅은 서버 요청이라 쿠키 직접 접근 불가 → payapp_data에 referrer 저장된 경우 처리
    if (payData && (payData as { referrerUserId?: string }).referrerUserId) {
      const referrerId = (payData as { referrerUserId?: string }).referrerUserId!;

      // 수수료율 조회
      const { data: rateData } = await supabase
        .from("affiliate_rates")
        .select("rate")
        .eq("program_id", payData.programId)
        .single();

      const rate = rateData?.rate ?? 10;
      const commission = Math.floor(price * (rate / 100));

      await supabase.from("affiliate_earnings").insert({
        referrer_id: referrerId,
        payment_record_id: record.id,
        program_id: payData.programId,
        commission_rate: rate,
        commission_amount: commission,
        status: "pending",
      });
    }

    // 결제 완료 이메일 발송 (비동기, 실패해도 웹훅 응답에 영향 없음)
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("email, name")
        .eq("id", record.user_id)
        .single();

      const { data: program } = await supabase
        .from("programs")
        .select("name")
        .eq("id", payData.programId)
        .single();

      const { data: plan } = await supabase
        .from("pricing_plans")
        .select("name")
        .eq("id", payData.planId)
        .single();

      if (profile?.email) {
        sendPaymentEmail(profile.email, {
          name: profile.name || "회원",
          programName: program?.name || goodname || "프로그램",
          planName: plan?.name || "플랜",
          billingType: payData.billingType,
          amount: price,
          orderId,
          paidAt: new Date().toISOString(),
          expiresAt: expiresAt?.toISOString() ?? null,
        });
      }
    } catch (emailErr) {
      console.error("[Webhook] 이메일 발송 오류 (무시):", emailErr);
    }

    console.log("[Webhook] 처리 완료:", orderId);
    return new NextResponse("00", { status: 200 });

  } catch (err) {
    console.error("[Webhook] 오류:", err);
    // 페이앱은 "00" 이외 응답 시 재시도
    return new NextResponse("error", { status: 200 });
  }
}
