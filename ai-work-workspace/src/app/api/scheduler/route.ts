// U11 자동화(2026-11-10) — 정시 실행 상태 줄(자동화 목록 위)용. 회원 본인 상태만 읽고, 일시정지·재개만 한다(주기·방식 고르기 칸 없음, 지침 26번).
// GET: 상태(cron-job.org를 부르지 않고 DB만 봄) / POST {action: "pause" | "resume"}
import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import "@/server/runtime";
import { checkProgramAccessApi } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { withRequestCache } from "@/litpage/server/db.ts";
import { memberSchedulerState, pauseMemberScheduler, resumeMemberScheduler } from "@/lib/schedulerMember/memberScheduler";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "private, no-store" };

async function state(userId: string) {
  const service = createAdminClient() as unknown as SupabaseClient;
  const s = await withRequestCache(() => memberSchedulerState(service, userId));
  // 화면에 필요한 것만: 상태·남은 정시 작업 수·키 등록 여부
  return { state: s.state, scheduled: s.scheduled, hasKey: s.hasKey };
}

export async function GET() {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status, headers: NO_STORE });
  return NextResponse.json(await state(access.user.id), { headers: NO_STORE });
}

export async function POST(request: NextRequest) {
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") return NextResponse.json({ error: "Cross-site request blocked" }, { status: 403 });
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status, headers: NO_STORE });
  const { action } = (await request.json().catch(() => ({}))) as { action?: string };
  const service = createAdminClient() as unknown as SupabaseClient;
  const userId = access.user.id;
  try {
    let notice: string | undefined;
    if (action === "pause") {
      const r = await withRequestCache(() => pauseMemberScheduler(service, userId));
      if (!r.jobStopped) notice = "일시정지했습니다. cron-job.org 작업 끄기는 다음 호출 때 다시 시도합니다.";
    } else if (action === "resume") {
      await withRequestCache(() => resumeMemberScheduler(service, userId));
    } else {
      return NextResponse.json({ error: "알 수 없는 요청입니다." }, { status: 400, headers: NO_STORE });
    }
    return NextResponse.json({ ...(await state(userId)), notice }, { headers: NO_STORE });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "처리하지 못했습니다." }, { status: 400, headers: NO_STORE });
  }
}
