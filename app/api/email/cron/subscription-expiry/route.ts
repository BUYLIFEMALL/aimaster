import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendExpiryReminderEmail } from "@/lib/email/sender";

/**
 * 구독 만료 알림 Cron 엔드포인트
 * GET /api/email/cron/subscription-expiry?secret=CRON_SECRET
 *
 * Vercel Cron 또는 외부 스케줄러에서 매일 1회 호출
 * 7일 이내 만료 예정인 구독에 알림 이메일 발송
 */
export async function GET(req: NextRequest) {
  // 간단한 인증 (CRON_SECRET 비교)
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  const now = new Date();
  const sevenDaysLater = new Date();
  sevenDaysLater.setDate(now.getDate() + 7);

  // 7일 이내 만료 예정 + 활성 구독 조회
  const { data: subscriptions, error } = await supabase
    .from("subscriptions")
    .select(`
      id,
      user_id,
      expires_at,
      program:programs(name),
      pricing_plan:pricing_plans(name)
    `)
    .eq("status", "active")
    .not("expires_at", "is", null)
    .gte("expires_at", now.toISOString())
    .lte("expires_at", sevenDaysLater.toISOString());

  if (error) {
    console.error("[Cron] 구독 조회 오류:", error);
    return NextResponse.json({ error: "DB 오류" }, { status: 500 });
  }

  if (!subscriptions || subscriptions.length === 0) {
    return NextResponse.json({ sent: 0, message: "만료 예정 구독 없음" });
  }

  let sentCount = 0;

  for (const sub of subscriptions) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, name")
      .eq("id", sub.user_id)
      .single();

    if (!profile?.email || !sub.expires_at) continue;

    const daysLeft = Math.ceil(
      (new Date(sub.expires_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    // D-7, D-3, D-1 에만 발송
    if (daysLeft !== 7 && daysLeft !== 3 && daysLeft !== 1) continue;

    const program = sub.program as unknown as { name: string } | null;
    const plan = sub.pricing_plan as unknown as { name: string } | null;

    const ok = await sendExpiryReminderEmail(profile.email, {
      name: profile.name || "회원",
      programName: program?.name || "프로그램",
      planName: plan?.name || "플랜",
      expiresAt: sub.expires_at,
      daysLeft,
    });

    if (ok) sentCount++;
  }

  console.log(`[Cron] 만료 알림 ${sentCount}건 발송 완료`);
  return NextResponse.json({ sent: sentCount });
}
