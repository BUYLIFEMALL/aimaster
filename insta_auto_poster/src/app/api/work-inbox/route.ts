import { NextRequest, NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { sendToWorkInbox } from "@/lib/workInbox";
import { instaPostInboxContent } from "@/lib/posts/workInboxContent";
import { IS_STANDALONE } from "@/lib/deployment";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 공용 표 「보낸 프로그램」은 programs.slug(폴더 이름 아님)
const PROGRAM_SLUG = "auto-instagram-posting";
const APP_URL = "https://auto-instagram-posting.buylife.xyz";
const INBOX_URL = "https://ai-work-workspace.buylife.xyz/inbox";

// U10: 게시글 한 건의 발행 기록을 로그인 회원 본인의 업무 워크스페이스 「받은 업무」로 보낸다.
// 본문은 브라우저가 보낸 값이 아니라 회원 본인 행(RLS)을 서버가 다시 읽어 만든다.
export async function POST(req: NextRequest) {
  if (req.headers.get("origin") !== req.nextUrl.origin) {
    return NextResponse.json({ error: "요청 출처를 확인할 수 없습니다." }, { status: 403 });
  }
  if (IS_STANDALONE) {
    return NextResponse.json({ error: "독립 설치본에서는 업무 워크스페이스 연결을 쓸 수 없습니다." }, { status: 404 });
  }
  const access = await checkProgramAccessApi();
  if (!access.allowed) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  let id = "";
  try {
    const body = (await req.json()) as { id?: unknown };
    id = typeof body?.id === "string" ? body.id : "";
  } catch {
    return NextResponse.json({ error: "입력 형식을 확인해 주세요." }, { status: 400 });
  }
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "게시글을 찾지 못했습니다." }, { status: 404 });
  }

  const supabase = await createClient();
  const { data: post, error } = await supabase
    .from("insta_posts")
    .select("id, caption, hashtags, status, scheduled_at, published_at, ig_permalink, post_type, created_at")
    .eq("id", id)
    .eq("user_id", access.user.id)
    .maybeSingle();
  if (error || !post) {
    return NextResponse.json({ error: "게시글을 찾지 못했습니다." }, { status: 404 });
  }

  try {
    const content = instaPostInboxContent(post);
    await sendToWorkInbox({
      userId: access.user.id,
      sourceSlug: PROGRAM_SLUG,
      kind: "document",
      title: content.title,
      bodyMd: content.bodyMd,
      data: content.data,
      sourceUrl: `${APP_URL}/posts/${post.id}`,
    });
    return NextResponse.json({ ok: true, title: content.title, inboxUrl: INBOX_URL });
  } catch (e) {
    const message = e instanceof Error ? e.message : "업무 워크스페이스로 보내지 못했습니다.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
