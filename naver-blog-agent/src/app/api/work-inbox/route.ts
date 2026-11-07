import { NextRequest, NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendToWorkInbox } from "@/lib/workInbox";
import { nbaPostInboxContent, type NbaPostForInbox } from "@/lib/workInboxContent";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const PROGRAM_SLUG = "naver-blog-agent";
const APP_URL = "https://naver-blog-agent.buylife.xyz";
const INBOX_URL = "https://ai-work-workspace.buylife.xyz/inbox";

// U10 2차: 원고 한 건의 발행 기록을 로그인 회원 본인의 업무 워크스페이스 「받은 업무」로 보낸다.
// 본문은 브라우저가 보낸 값이 아니라 회원 본인 원고(user_id 조건)를 서버가 다시 읽어 만든다.
export async function POST(req: NextRequest) {
  if (req.headers.get("origin") !== req.nextUrl.origin) {
    return NextResponse.json({ error: "요청 출처를 확인할 수 없습니다." }, { status: 403 });
  }
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });

  const body = (await req.json().catch(() => null)) as { id?: unknown } | null;
  const id = typeof body?.id === "string" ? body.id : "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "원고를 찾지 못했습니다." }, { status: 404 });
  }

  const { data: post, error } = await createAdminClient()
    .from("nba_posts")
    .select("id, title, content, tags, category_name, status, is_reserved, scheduled_at, published_at, post_url")
    .eq("id", id)
    .eq("user_id", access.userId)
    .maybeSingle();
  if (error || !post) return NextResponse.json({ error: "원고를 찾지 못했습니다." }, { status: 404 });

  try {
    const content = nbaPostInboxContent(post as NbaPostForInbox);
    await sendToWorkInbox({
      userId: access.userId,
      sourceSlug: PROGRAM_SLUG,
      kind: "document",
      title: content.title,
      bodyMd: content.bodyMd,
      data: content.data,
      sourceUrl: `${APP_URL}/queue`,
    });
    return NextResponse.json({ ok: true, title: content.title, inboxUrl: INBOX_URL }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) {
    const message = e instanceof Error ? e.message : "업무 워크스페이스로 보내지 못했습니다.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
