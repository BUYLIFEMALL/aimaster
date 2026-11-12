import { NextResponse, type NextRequest } from "next/server";
import { requireAccess } from "@/lib/routeGuard";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendToWorkInbox } from "@/lib/workInbox";
import { playlistUploadInboxContent, type PlaylistUploadRow } from "@/lib/youtubeInboxContent";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const NO_STORE = { "Cache-Control": "private, no-store" };
const PROGRAM_SLUG = "playlist-channel-studio";
const APP_URL = "https://playlist-channel-studio.buylife.xyz";
const INBOX_URL = "https://ai-work-workspace.buylife.xyz/inbox";

// U10 유튜브(2026-11-13, 업무 워크스페이스 담당): 올리기 기록 한 건을 회원 본인의 업무 워크스페이스 「받은 업무」로 보낸다.
// 본문은 브라우저 값이 아니라 회원 본인 행(playlist_youtube_uploads)을 서버가 다시 읽어 만든다. 요청: { videoId }
export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ error: "요청 출처를 확인할 수 없습니다." }, { status: 403, headers: NO_STORE });
  const g = await requireAccess(); if (g.error) return g.error;
  const b = (await request.json().catch(() => ({}))) as { videoId?: unknown };
  const videoId = String(b.videoId ?? "");
  if (!/^[A-Za-z0-9_-]{6,20}$/.test(videoId)) return NextResponse.json({ error: "영상을 찾지 못했습니다." }, { status: 404, headers: NO_STORE });
  const { data, error } = await createAdminClient().from("playlist_youtube_uploads")
    .select("video_id, url, title, privacy, publish_at, uploaded_at").eq("user_id", g.user.id).eq("video_id", videoId).maybeSingle();
  if (error || !data) return NextResponse.json({ error: "올린 기록을 찾지 못했습니다." }, { status: 404, headers: NO_STORE });
  try {
    const c = playlistUploadInboxContent(data as PlaylistUploadRow);
    await sendToWorkInbox({ userId: g.user.id, sourceSlug: PROGRAM_SLUG, kind: "document", title: c.title, bodyMd: c.bodyMd, data: c.data, sourceUrl: `${APP_URL}/studio` });
    return NextResponse.json({ ok: true, title: c.title, inboxUrl: INBOX_URL }, { headers: NO_STORE });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "업무 워크스페이스로 보내지 못했습니다." }, { status: 502, headers: NO_STORE });
  }
}
