import { NextResponse, type NextRequest } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { json } from "@/lib/aiRoute";
import { isUuid, loadReport } from "@/lib/reports";
import { sendToWorkInbox } from "@/lib/workInbox";
import { reportInboxContent } from "@/lib/workInboxContent";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const PROGRAM_SLUG = "blog-keyword";
const APP_URL = "https://blog-keyword.buylife.xyz";
const INBOX_URL = "https://ai-work-workspace.buylife.xyz/inbox";

// U10 2차: 분석 기록 한 건을 로그인 회원 본인의 업무 워크스페이스 「받은 업무」로 보낸다(AI 호출 없음).
// 내용은 브라우저가 보낸 값이 아니라 회원 본인 기록(loadReport: user_id 조건·30일 보관 규칙)을 서버가 다시 읽어 만든다.
export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return json({ error: "요청 출처를 확인할 수 없습니다." }, 403);
  const access = await checkProgramAccessApi();
  if (!access.allowed) return json({ error: access.error }, access.status);

  const body = (await request.json().catch(() => null)) as { id?: unknown } | null;
  if (!isUuid(body?.id)) return json({ error: "분석 기록을 찾지 못했습니다." }, 404);
  const report = await loadReport(access.user.id, body.id);
  if (!report) return json({ error: "분석 기록을 찾지 못했습니다." }, 404);

  try {
    const content = reportInboxContent(report);
    await sendToWorkInbox({
      userId: access.user.id,
      sourceSlug: PROGRAM_SLUG,
      kind: "document",
      title: content.title,
      bodyMd: content.bodyMd,
      data: content.data,
      sourceUrl: `${APP_URL}/dashboard?report=${report.id}`,
    });
    return json({ ok: true, title: content.title, inboxUrl: INBOX_URL });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "업무 워크스페이스로 보내지 못했습니다." }, { status: 502, headers: { "Cache-Control": "private, no-store" } });
  }
}
