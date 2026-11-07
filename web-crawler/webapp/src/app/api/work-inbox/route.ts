import { NextRequest, NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendToWorkInbox } from "@/lib/workInbox";
import { crawlJobInboxContent } from "@/lib/workInboxContent";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const PROGRAM_SLUG = "web-crawler-saas";
const JOBS_URL = "https://web-crawler-saas.buylife.xyz/jobs";
const INBOX_URL = "https://ai-work-workspace.buylife.xyz/inbox";

// U10 2차: 완료된 수집 작업 한 건을 로그인 회원 본인의 업무 워크스페이스 「받은 업무」로 보낸다(종류 link).
// 내용은 브라우저가 보낸 값이 아니라 회원 본인 작업(user_id 조건, 완료 상태)을 서버가 다시 읽어 만든다.
export async function POST(req: NextRequest) {
  if (req.headers.get("origin") !== req.nextUrl.origin) {
    return NextResponse.json({ error: "요청 출처를 확인할 수 없습니다." }, { status: 403 });
  }
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });

  const body = (await req.json().catch(() => null)) as { id?: unknown } | null;
  const id = typeof body?.id === "string" ? body.id : "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "수집 작업을 찾지 못했습니다." }, { status: 404 });

  const { data: job } = await createAdminClient()
    .from("web_crawler_jobs")
    .select("url, target_fields, row_count, completed_at, created_at, pii_warning, status")
    .eq("id", id)
    .eq("user_id", access.user.id)
    .maybeSingle();
  if (!job) return NextResponse.json({ error: "수집 작업을 찾지 못했습니다." }, { status: 404 });
  if (job.status !== "completed") return NextResponse.json({ error: "수집이 끝난 작업만 보낼 수 있습니다." }, { status: 409 });

  try {
    const content = crawlJobInboxContent(job, JOBS_URL);
    await sendToWorkInbox({
      userId: access.user.id,
      sourceSlug: PROGRAM_SLUG,
      kind: "link",
      title: content.title,
      bodyMd: content.bodyMd,
      data: content.data,
      sourceUrl: JOBS_URL,
    });
    return NextResponse.json({ ok: true, title: content.title, inboxUrl: INBOX_URL }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) {
    const message = e instanceof Error ? e.message : "업무 워크스페이스로 보내지 못했습니다.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
