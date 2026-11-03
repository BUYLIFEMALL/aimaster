// 운영 정리 작업(하루 1회, Vercel 예약 호출): 휴지통 30일 보관 후 삭제 등 원본 예약 작업기(scheduler.ts)의
// 때가 된 작업을 한 번 실행한다. 원본은 서버 안 타이머가 돌렸지만 서버리스에서는 타이머가 없다.
// U4: 그다음 AI 채팅 기록 30일 자동 삭제(src/server/aiRetention.ts)도 함께 실행한다.
// docs/SCHEDULER_POLICY.md: 30일 자동 삭제 같은 운영 정리 작업은 운영자 Vercel 예약 호출 사용 가능(회원 예약 기능 아님).
import { NextResponse, type NextRequest } from "next/server";
import { runDueJobs } from "@/litpage/server/scheduler.ts";
import { withRequestCache } from "@/litpage/server/db.ts";
import "@/litpage/server/retention.ts";
import "@/server/runtime";
import { runAiRetention } from "@/server/aiRetention";
import { runWorkInboxRetention } from "@/server/workInbox";
import { loadRetentionExemptIds } from "@/server/retentionExempt";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const ran = await withRequestCache(() => runDueJobs());
  // 30일 자동 삭제 예외 회원(관리자·시험 계정). 목록을 못 읽으면 두 정리를 모두 건너뛴다(다음 날 다시)
  let exempt: Set<string> | null = null;
  try {
    exempt = await loadRetentionExemptIds(createAdminClient());
  } catch (e) {
    console.error(`[cron] retention exempt list failed: ${String((e as Error)?.message ?? e).slice(0, 200)}`);
  }
  let ai: unknown = { skipped: "exempt list unavailable" };
  let inbox: unknown = { skipped: "exempt list unavailable" };
  if (exempt) {
    const keep = exempt;
    try {
      ai = withRequestCache(() => runAiRetention(Date.now(), 2_000, keep));
    } catch (e) {
      console.error(`[cron] ai retention failed: ${String((e as Error)?.message ?? e).slice(0, 200)}`);
      ai = { error: "failed" };
    }
    // U7: 업무 받은편지함 30일 자동 삭제
    try {
      inbox = await runWorkInboxRetention(Date.now(), keep);
    } catch (e) {
      console.error(`[cron] work inbox retention failed: ${String((e as Error)?.message ?? e).slice(0, 200)}`);
      inbox = { error: "failed" };
    }
  }
  return NextResponse.json({ ran, ai, inbox });
}
