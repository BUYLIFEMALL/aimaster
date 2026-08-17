import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { dispatchCampaign } from "@/lib/dispatch";
import { isCampaignDue } from "@/lib/schedule";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// real_estate_sales/threads의 CRON_SECRET Bearer 인증 패턴을 그대로 재사용.
// vercel.json에 매시 정각(0 * * * *) 스케줄로 등록한다.
function isAuthorized(request: NextRequest): boolean {
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

async function dispatch() {
  const admin = createAdminClient();
  const now = new Date();

  const { data: campaigns, error } = await admin
    .from("stepmail_campaigns")
    .select("id, user_id, draft_id, target_send_count, quantity_per_run, send_hour, recurrence, weekly_day, last_run_at, is_active")
    .eq("is_active", true);

  if (error) throw new Error(error.message);

  // 정지된 계정은 자동 발송 대상에서 제외한다. profiles는 AIMaster 공용 테이블이라 이
  // 서브프로젝트의 Database 타입에는 없다(music/lib/access.ts와 동일하게 느슨한 타입으로 조회).
  const candidateUserIds = Array.from(new Set((campaigns ?? []).map((c) => c.user_id)));
  const adminLoose = admin as unknown as { from: (table: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any
  const { data: suspendedProfiles } = await adminLoose
    .from("profiles")
    .select("id")
    .in("id", candidateUserIds.length > 0 ? candidateUserIds : [""])
    .eq("is_suspended", true);
  const suspendedUserIds = new Set((suspendedProfiles ?? []).map((p: { id: string }) => p.id));

  const dueCampaigns = (campaigns ?? []).filter((c) => !suspendedUserIds.has(c.user_id) && isCampaignDue(c, now));

  const summary: { campaignId: string; sentCount: number; failedCount: number }[] = [];

  for (const campaign of dueCampaigns) {
    const result = await dispatchCampaign(admin, campaign);
    await admin.from("stepmail_campaigns").update({ last_run_at: now.toISOString() }).eq("id", campaign.id);
    summary.push({ campaignId: campaign.id, sentCount: result.sentCount, failedCount: result.failedCount });
  }

  return { processed: dueCampaigns.length, summary };
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await dispatch();
  return NextResponse.json({ ok: true, ...result });
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await dispatch();
  return NextResponse.json({ ok: true, ...result });
}
