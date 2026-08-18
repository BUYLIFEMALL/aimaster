import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runReminderRule } from "@/lib/booking/reminderDispatch";

export const dynamic = "force-dynamic";
// dynamic="force-dynamic"만으로는 supabase-js 내부 fetch가 Next.js Data Cache에 걸려 오래된
// 결과를 계속 반환하는 문제가 crm-google-form에서 실제로 재현됨 — cron은 매번 최신 데이터를
// 읽어야 하므로 명시적으로 캐시를 완전히 끈다 (docs/PLATFORM_PATTERNS.md §10).
export const fetchCache = "force-no-store";
export const maxDuration = 300;

// crm-google-form/stepmail/real_estate_sales/threads의 CRON_SECRET Bearer 인증 패턴을 그대로
// 재사용. vercel.json에 15분마다(*/15 * * * *) 스케줄로 등록한다 — 예약 리마인드는 시간 단위
// 정밀도가 필요해서 crm-google-form의 팔로우업(하루 1번)보다 훨씬 짧은 주기로 돈다.
function isAuthorized(request: NextRequest): boolean {
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: rules, error } = await admin
    .from("booking_reminder_rules")
    .select(
      "id, user_id, name, offset_minutes, channel_email, channel_sms, channel_alimtalk, channel_friendtalk, message_subject, message_text, kakao_template_id, kakao_variables",
    )
    .eq("is_active", true);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const summary: { ruleId: string; ruleName: string; sent: number; failed: number }[] = [];

  for (const rule of rules ?? []) {
    try {
      const result = await runReminderRule({
        ...rule,
        kakao_variables: rule.kakao_variables as Record<string, string>,
      });
      summary.push({ ruleId: rule.id, ruleName: rule.name, ...result });
    } catch (err) {
      summary.push({ ruleId: rule.id, ruleName: rule.name, sent: 0, failed: -1 });
      console.error(`리마인드 규칙 실행 실패 (${rule.id}):`, err);
    }
  }

  return NextResponse.json({ ok: true, ruleCount: (rules ?? []).length, summary });
}
