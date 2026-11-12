import { NextResponse, type NextRequest } from "next/server";
import { requireAccess } from "@/lib/routeGuard";
import { createAdminClient } from "@/lib/supabase/admin";
import { youtubeStateMessage, youtubeUploadToken } from "@/lib/youtube/account";
import { getYoutubeChannelInfo, getYoutubeVideoMeta } from "@/lib/youtube/client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const NO_STORE = { "Cache-Control": "private, no-store" };
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status, headers: NO_STORE });
const COLS = "video_id, url, title, privacy, publish_at, uploaded_at";

// v1.39 유튜브 올리기 기록(플랜 docs/PLAN_20261113_YOUTUBE_UPLOAD_RECORDS.md) — 회원 본인 기록만 읽고 쓴다.
export async function GET() {
  const g = await requireAccess(); if (g.error) return g.error;
  const { data, error } = await createAdminClient().from("playlist_youtube_uploads").select(COLS)
    .eq("user_id", g.user.id).order("uploaded_at", { ascending: false }).limit(20);
  if (error) { console.error("[playlist youtube uploads list]", error.message); return bad("올린 기록을 불러오지 못했습니다.", 500); }
  return NextResponse.json({ uploads: data ?? [] }, { headers: NO_STORE });
}

// 영상은 브라우저가 유튜브로 바로 보내므로 영상 번호만 받는다. 브라우저가 보낸 값은 믿지 않고,
// 회원 본인 유튜브 연결로 그 영상이 회원 채널에 실제로 있는지 확인한 뒤 유튜브에서 읽은 제목·공개 범위로 저장한다.
export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return bad("요청 출처를 확인할 수 없습니다.", 403);
  const g = await requireAccess(); if (g.error) return g.error;
  try {
    const b = (await request.json().catch(() => ({}))) as { videoId?: unknown; accountId?: unknown; portrait?: unknown };
    const videoId = String(b.videoId ?? "");
    if (!/^[A-Za-z0-9_-]{6,20}$/.test(videoId)) return bad("영상 번호가 올바르지 않습니다.");
    const accountId = typeof b.accountId === "string" && /^[0-9a-f-]{36}$/i.test(b.accountId) ? b.accountId : null;
    const t = await youtubeUploadToken(g.user.id, accountId);
    if ("status" in t) return bad(youtubeStateMessage(t.status.state), 409);

    const [meta, channel] = await Promise.all([getYoutubeVideoMeta(t.token, videoId), getYoutubeChannelInfo(t.token)]);
    if (!meta) return bad("유튜브에서 영상을 찾지 못했습니다. 잠시 뒤 다시 시도해 주세요.", 404);
    if (meta.channelId !== channel.channelId) return bad("이 채널에 올린 영상이 아닙니다.", 403);

    const url = b.portrait === true ? `https://youtube.com/shorts/${videoId}` : `https://youtu.be/${videoId}`;
    const { error } = await createAdminClient().from("playlist_youtube_uploads").upsert({
      user_id: g.user.id, video_id: videoId, url, title: meta.title.slice(0, 200) || "(제목 없음)", privacy: meta.privacy,
      publish_at: meta.publishAt, channel_account_id: accountId,
    }, { onConflict: "user_id,video_id" });
    if (error) { console.error("[playlist youtube uploads save]", error.message); return bad("올린 기록을 저장하지 못했습니다.", 500); }
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  } catch (e) {
    console.error("[playlist youtube uploads]", e instanceof Error ? e.message.slice(0, 300) : "unknown");
    return bad("올린 기록을 저장하지 못했습니다(유튜브 확인 실패).", 502);
  }
}
