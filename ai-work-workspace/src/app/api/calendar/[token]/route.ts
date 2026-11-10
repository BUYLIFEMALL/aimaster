// 구글 캘린더 연동 ① 간편 구독(ICS, 2026-11-11) — 회원 전용 비밀 주소 /api/calendar/<토큰>.ics.
// 구글 캘린더가 로그인 없이 몇 시간마다 읽는다. 토큰 해시로 회원을 찾고, 이용 권한이 끝난 회원은 빈 캘린더를 준다.
import { NextResponse, type NextRequest } from "next/server";
import "@/server/runtime";
import { withRequestCache } from "@/litpage/server/db.ts";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkProgramAccess } from "@/lib/programAccess";
import { THIS_PROGRAM_SLUG } from "@/lib/access";
import { feedForToken } from "@/server/calendarSync";
import { buildIcs } from "@/server/calendarData";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const feed = withRequestCache(() => feedForToken(token.replace(/\.ics$/i, "")));
  if (!feed) return new NextResponse("Not found", { status: 404 });
  const access = await checkProgramAccess(createAdminClient() as unknown as Parameters<typeof checkProgramAccess>[0], feed.userId, THIS_PROGRAM_SLUG);
  const body = access.allowed ? feed.ics : buildIcs("AI 업무 워크스페이스(이용 기간 종료)", []);
  return new NextResponse(body, {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "private, max-age=300", "Content-Disposition": 'inline; filename="ai-work-workspace.ics"' },
  });
}
