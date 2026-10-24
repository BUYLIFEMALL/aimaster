import { NextResponse, type NextRequest } from "next/server";
import { authorizePlanner, plannerFailure, NO_STORE } from "@/lib/planner/api";
import { loadWorkspace } from "@/lib/planner/repository";
import { inboxInputSchema, taskInboxContent, dayInboxContent } from "@/lib/planner/inbox";
import { PlannerError } from "@/lib/planner/engine";
import { sendToWorkInbox } from "@/lib/workInbox";
import { PROGRAM_SLUG } from "@/lib/version";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
const INBOX_URL = "https://ai-work-workspace.buylife.xyz/inbox";
const PLANNER_URL = "https://ai-task-planner.buylife.xyz/dashboard";
// U8: 회원 본인 기록에서 내용을 만들어 업무 워크스페이스 「받은 업무」(공용 표 work_inbox)로 보낸다.
export async function POST(request: NextRequest) {
  try {
    if (request.headers.get("origin") !== request.nextUrl.origin) throw new PlannerError("요청 출처를 확인할 수 없습니다.", 403);
    const user = await authorizePlanner();
    const raw = await request.text();
    if (Buffer.byteLength(raw, "utf8") > 2000) throw new PlannerError("입력 크기를 넘었습니다.", 413);
    let parsed: unknown;
    try { parsed = JSON.parse(raw); } catch { throw new PlannerError("입력 형식을 확인해주세요."); }
    const input = inboxInputSchema.parse(parsed), record = await loadWorkspace(user.id), now = Date.now();
    const content = input.type === "task" ? taskInboxContent(record.workspace, input.taskId, now) : dayInboxContent(record.workspace, input, now);
    try {
      await sendToWorkInbox({ userId: user.id, sourceSlug: PROGRAM_SLUG, sourceUrl: PLANNER_URL, ...content });
    } catch (e) {
      throw new PlannerError(e instanceof Error ? e.message : "업무 워크스페이스로 보내지 못했습니다.", 502);
    }
    return NextResponse.json({ ok: true, title: content.title, inboxUrl: INBOX_URL }, { headers: NO_STORE });
  } catch (error) { return plannerFailure(error); }
}
