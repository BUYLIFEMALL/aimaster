import { NextRequest, NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { sendToWorkInbox } from "@/lib/workInbox";
import { meetingInboxContent } from "@/lib/workInboxMeeting";
import { PROGRAM_SLUG } from "@/lib/version";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const INBOX_URL = "https://ai-work-workspace.buylife.xyz/inbox";
const MAX_REQUEST_BYTES = 3_000_000;

// U9-A: 음성 분석 결과를 로그인 회원 본인의 업무 워크스페이스 「받은 업무」로 보낸다.
export async function POST(req: NextRequest) {
  if (req.headers.get("origin") !== req.nextUrl.origin) {
    return NextResponse.json({ error: "요청 출처를 확인할 수 없습니다." }, { status: 403 });
  }
  const access = await checkProgramAccessApi();
  if (!access.allowed) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const raw = await req.text();
  if (Buffer.byteLength(raw, "utf8") > MAX_REQUEST_BYTES) {
    return NextResponse.json({ error: "분석 결과가 너무 커서 보낼 수 없습니다." }, { status: 413 });
  }

  try {
    const parsed = JSON.parse(raw) as { result?: unknown };
    const content = meetingInboxContent(parsed?.result);
    await sendToWorkInbox({
      userId: access.user.id,
      sourceSlug: PROGRAM_SLUG,
      kind: "meeting",
      title: content.title,
      bodyMd: content.bodyMd,
      sourceUrl: "https://audio.buylife.xyz",
    });
    return NextResponse.json({ ok: true, title: content.title, inboxUrl: INBOX_URL });
  } catch (e) {
    const message = e instanceof SyntaxError ? "입력 형식을 확인해 주세요." : e instanceof Error ? e.message : "업무 워크스페이스로 보내지 못했습니다.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
