import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isScheduleDue } from "@/lib/schedule";
import { generateReportForTopic } from "@/lib/reportEngine";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

// Phase 3 — 예약(정기 자동 생성) dispatch. 주제마다 회원이 정한 주기(1시간~매주)가 다를 수
// 있어, Vercel Cron은 5분마다 깨우기만 하고(vercel.json) 실제로 생성할 차례인지는 이
// 라우트에서 last_run_at 기준으로 다시 판단한다(trending-product-finder의
// dispatch-sourcing-alerts와 동일 패턴). 카카오 발송은 이 크론이 직접 하지 않는다 —
// generateReportForTopic 안에서 텔레그램이 연동돼 있으면 검토 요청만 보내고, 발행 여부는
// 항상 사람이 텔레그램 버튼(또는 웹 화면)으로 직접 결정한다.
function isAuthorized(request: NextRequest): boolean {
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

async function dispatch() {
  const admin = createAdminClient();
  const now = new Date();

  const { data: rows, error } = await admin
    .from("kakao_topics")
    .select("id, user_id, topic_name, keywords, lookback_days, interval_minutes, last_run_at")
    .eq("is_active", true)
    .eq("schedule_enabled", true);

  if (error) throw new Error(error.message);

  const dueRows = (rows ?? []).filter(
    (r) => r.interval_minutes != null && isScheduleDue(r.last_run_at, r.interval_minutes, now),
  );

  let generated = 0;
  let failed = 0;
  const details: { topicId: string; result: string }[] = [];

  for (const row of dueRows) {
    try {
      const result = await generateReportForTopic(
        admin,
        row.user_id,
        { id: row.id, topic_name: row.topic_name, keywords: row.keywords, lookback_days: row.lookback_days },
        "scheduled",
      );
      await admin.from("kakao_topics").update({ last_run_at: now.toISOString() }).eq("id", row.id);
      generated++;
      details.push({ topicId: row.id, result: `report ${result.reportId} created` });
    } catch (err) {
      // 본인 API 키가 없거나 검색/생성 실패는 이 주제만 건너뛰고 계속 진행한다 — 다른
      // 회원의 예약 생성을 막지 않는다. last_run_at은 갱신하지 않아 다음 tick에 재시도된다.
      failed++;
      const message = err instanceof Error ? err.message : "unknown error";
      details.push({ topicId: row.id, result: `failed: ${message}` });
      console.error(`[kakao_auto_poster cron] topic ${row.id} 생성 실패:`, err);
    }
  }

  return { total: rows?.length ?? 0, due: dueRows.length, generated, failed, details };
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await dispatch();
  return NextResponse.json({ ok: true, ...result });
}
