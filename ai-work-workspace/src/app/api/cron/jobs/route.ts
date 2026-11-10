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
import { operatorJobFilter } from "@/server/memberJobs";
import { runAutomationRetention } from "@/server/automationRetention";
import { runReceiptRetention } from "@/server/receipts";
import { runMediaRetention } from "@/server/mediaRetention";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  // U11(주인님 결정 1번): 회원 정시 작업(반복 자동화·리마인더)은 회원 본인 cron-job.org(/api/cron/member)가 처리 — 여기서는 운영 정리 작업만
  const ran = await withRequestCache(() => runDueJobs(Date.now(), 200, operatorJobFilter));
  // 30일 자동 삭제 예외 회원(관리자·시험 계정). 목록을 못 읽으면 두 정리를 모두 건너뛴다(다음 날 다시)
  let exempt: Set<string> | null = null;
  try {
    exempt = await loadRetentionExemptIds(createAdminClient());
  } catch (e) {
    console.error(`[cron] retention exempt list failed: ${String((e as Error)?.message ?? e).slice(0, 200)}`);
  }
  let ai: unknown = { skipped: "exempt list unavailable" };
  let inbox: unknown = { skipped: "exempt list unavailable" };
  let automation: unknown = { skipped: "exempt list unavailable" };
  let receipts: unknown = { skipped: "exempt list unavailable" };
  let media: unknown = { skipped: "exempt list unavailable" };
  if (exempt) {
    const keep = exempt;
    // 영수증·세금계산서(2026-11-11): 발행 문서·증빙 장부 30일 자동 삭제(보관 예외 회원 제외)
    try {
      receipts = withRequestCache(() => runReceiptRetention(Date.now(), keep));
    } catch (e) {
      console.error(`[cron] receipt retention failed: ${String((e as Error)?.message ?? e).slice(0, 200)}`);
      receipts = { error: "failed" };
    }
    // 2026-11-11 보관 예외: 음악·영상 파일은 30일, 그 밖은 1년(각 정리의 보관 일수)
    try {
      media = withRequestCache(() => runMediaRetention(Date.now(), 2_000, keep));
    } catch (e) {
      console.error(`[cron] media retention failed: ${String((e as Error)?.message ?? e).slice(0, 200)}`);
      media = { error: "failed" };
    }
    // U11(주인님 결정 4번): 자동화 실행 기록·알림 30일 자동 삭제
    try {
      automation = withRequestCache(() => runAutomationRetention(Date.now(), 5_000, keep));
    } catch (e) {
      console.error(`[cron] automation retention failed: ${String((e as Error)?.message ?? e).slice(0, 200)}`);
      automation = { error: "failed" };
    }
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
  return NextResponse.json({ ran, ai, inbox, automation, receipts, media });
}
