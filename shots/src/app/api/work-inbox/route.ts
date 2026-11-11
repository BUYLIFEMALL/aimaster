import { NextRequest, NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { sendToWorkInbox } from "@/lib/workInbox";
import { youtubeUploadInboxContent, type YoutubeUploadRecord } from "@/lib/youtubeInboxContent";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 공용 표 「보낸 프로그램」은 programs.slug(폴더 이름 아님)
const PROGRAM_SLUG = "auto-shorts-posting";
const APP_URL = "https://shots.buylife.xyz";
const INBOX_URL = "https://ai-work-workspace.buylife.xyz/inbox";

// U10 유튜브(2026-11-12, 업무 워크스페이스 담당): 대본 한 개의 유튜브 올린 기록 한 건을 회원 본인의 「받은 업무」로 보낸다.
// 본문은 브라우저 값이 아니라 회원 본인 행(shorts_videos.youtube_uploads)을 서버가 다시 읽어 만든다.
// 요청: { id: 대본(shorts_videos) id, videoId?: 유튜브 영상 id — 없으면 가장 최근 업로드 }
export async function POST(req: NextRequest) {
  if (req.headers.get("origin") !== req.nextUrl.origin) {
    return NextResponse.json({ error: "요청 출처를 확인할 수 없습니다." }, { status: 403 });
  }
  const access = await checkProgramAccessApi();
  if (!access.allowed) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  let id = "";
  let youtubeId = "";
  try {
    const body = (await req.json()) as { id?: unknown; videoId?: unknown };
    id = typeof body?.id === "string" ? body.id : "";
    youtubeId = typeof body?.videoId === "string" ? body.videoId : "";
  } catch {
    return NextResponse.json({ error: "입력 형식을 확인해 주세요." }, { status: 400 });
  }
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "영상을 찾지 못했습니다." }, { status: 404 });
  }

  const supabase = await createClient();
  const { data: video, error } = await supabase
    .from("shorts_videos")
    .select("id, title, youtube_uploads")
    .eq("id", id)
    .eq("user_id", access.user.id)
    .maybeSingle();
  if (error || !video) {
    return NextResponse.json({ error: "영상을 찾지 못했습니다." }, { status: 404 });
  }
  const uploads = (Array.isArray(video.youtube_uploads) ? video.youtube_uploads : []) as unknown as YoutubeUploadRecord[];
  const upload = youtubeId ? uploads.find((u) => u?.videoId === youtubeId) : uploads[0];
  if (!upload?.videoId || !upload.url) {
    return NextResponse.json({ error: "아직 유튜브에 올린 기록이 없습니다." }, { status: 404 });
  }

  try {
    const content = youtubeUploadInboxContent(video.title, upload);
    await sendToWorkInbox({
      userId: access.user.id,
      sourceSlug: PROGRAM_SLUG,
      kind: "document",
      title: content.title,
      bodyMd: content.bodyMd,
      data: content.data,
      sourceUrl: `${APP_URL}/scripts/${video.id}`,
    });
    return NextResponse.json({ ok: true, title: content.title, inboxUrl: INBOX_URL });
  } catch (e) {
    const message = e instanceof Error ? e.message : "업무 워크스페이스로 보내지 못했습니다.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
