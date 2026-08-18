import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runFollowupRule } from "@/lib/crm/followupDispatch";

export const dynamic = "force-dynamic";
// dynamic = "force-dynamic"만으로는 supabase-js 내부 fetch가 Next.js Data Cache에 걸려
// 오래된(첫 호출 시점) 결과를 계속 반환하는 문제가 실제로 재현됨(2026-08-18, 로컬 개발 서버에서
// 확인) — cron은 매번 최신 데이터를 읽어야 하므로 명시적으로 캐시를 완전히 끈다.
export const fetchCache = "force-no-store";
export const maxDuration = 300;

// stepmail/real_estate_sales/threads의 CRON_SECRET Bearer 인증 패턴을 그대로 재사용.
// vercel.json에 매일 09:00(KST, UTC 00:00) 스케줄로 등록한다.
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
    .from("crm_followup_rules")
    .select(
      "id, user_id, form_source_id, name, days_after, channel_email, channel_sms, channel_alimtalk, channel_friendtalk, message_subject, message_text, kakao_template_id, kakao_variables",
    )
    .eq("is_active", true);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const summary: { ruleId: string; ruleName: string; sent: number; failed: number }[] = [];

  for (const rule of rules ?? []) {
    try {
      const result = await runFollowupRule({
        ...rule,
        kakao_variables: rule.kakao_variables as Record<string, string>,
      });
      summary.push({ ruleId: rule.id, ruleName: rule.name, ...result });
    } catch (err) {
      summary.push({ ruleId: rule.id, ruleName: rule.name, sent: 0, failed: -1 });
      console.error(`팔로우업 규칙 실행 실패 (${rule.id}):`, err);
    }
  }

  return NextResponse.json({ ok: true, ruleCount: (rules ?? []).length, summary });
}
