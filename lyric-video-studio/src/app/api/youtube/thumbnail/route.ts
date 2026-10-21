import { NextResponse, type NextRequest } from "next/server";
import { fail, guard, json } from "@/lib/route";
import { UserError } from "@/lib/errors";
import { youtubeStateMessage, youtubeUploadToken } from "@/lib/youtube/account";
import { setYoutubeThumbnail } from "@/lib/youtube/thumbnail";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 60;

const MAX_JPEG = 2 * 1024 * 1024; // 유튜브 썸네일 한도

// v1.07 회원이 방금 올린 영상에 배경 그림 썸네일 지정(플레이리스트 v1.23에서 옮김) — 회원 공용 유튜브 연결 토큰으로만(다른 회원·운영자 값으로 대신하지 않음)
export async function POST(request: NextRequest) {
  try {
    const g = await guard(request, 3_000_000); if (g instanceof NextResponse) return g; // base64라 JPG 2MB ≈ 2.7MB
    const videoId = String(g.body.videoId ?? "");
    if (!/^[A-Za-z0-9_-]{6,20}$/.test(videoId)) throw new UserError(400, "영상 번호가 올바르지 않습니다.");
    const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(String(g.body.image ?? ""));
    const jpeg = m ? Buffer.from(m[1], "base64") : null;
    if (!jpeg || !jpeg.length || jpeg.length > MAX_JPEG) throw new UserError(400, "썸네일 그림이 없거나 2MB를 넘습니다.");

    const t = await youtubeUploadToken(g.userId);
    if ("status" in t) throw new UserError(409, youtubeStateMessage(t.status.state));
    await setYoutubeThumbnail(t.token, videoId, jpeg);
    return json({ ok: true });
  } catch (e) {
    const m = e instanceof Error ? e.message : "";
    if (m.startsWith("THUMB_FORBIDDEN")) return json({ error: "유튜브가 썸네일 지정을 거절했습니다. 채널의 「맞춤 썸네일」 사용 인증(전화 인증)이 필요하거나 이 영상의 권한이 없습니다. 썸네일을 내려받아 유튜브 스튜디오에서 직접 넣어 주세요." }, 403);
    if (m === "THUMB_NOT_FOUND") return json({ error: "유튜브에서 영상을 찾지 못했습니다. 처리 중일 수 있으니 잠시 뒤 다시 시도해 주세요." }, 404);
    if (m.startsWith("THUMB_FAILED")) { console.error("[lyric-video-studio] youtube thumbnail", m.slice(0, 300)); return json({ error: "썸네일을 지정하지 못했습니다. 썸네일을 내려받아 유튜브 스튜디오에서 직접 넣어 주세요." }, 502); }
    return fail(e);
  }
}
