import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { welcomeEmail, paymentEmail, expiryReminderEmail } from "@/lib/email/templates";

/**
 * 이메일 템플릿 미리보기 (관리자 전용)
 * GET /api/email/preview?type=welcome|payment|expiry
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse("로그인 필요", { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return new NextResponse("관리자 전용", { status: 403 });
  }

  const type = req.nextUrl.searchParams.get("type") || "welcome";

  let html = "";

  switch (type) {
    case "welcome": {
      const result = welcomeEmail({
        name: "홍길동",
        affiliateCode: "ABC12345",
      });
      html = result.html;
      break;
    }
    case "payment": {
      const result = paymentEmail({
        name: "홍길동",
        programName: "AI 마케팅 자동화 봇",
        planName: "프로 플랜",
        billingType: "monthly",
        amount: 49000,
        orderId: "ORD-20260213-001",
        paidAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });
      html = result.html;
      break;
    }
    case "expiry": {
      const result = expiryReminderEmail({
        name: "홍길동",
        programName: "AI 마케팅 자동화 봇",
        planName: "프로 플랜",
        expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        daysLeft: 3,
      });
      html = result.html;
      break;
    }
    default:
      html = "<h1>type 파라미터: welcome, payment, expiry</h1>";
  }

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
