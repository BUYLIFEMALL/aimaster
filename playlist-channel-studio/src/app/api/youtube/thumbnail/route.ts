import { NextResponse, type NextRequest } from "next/server";
import { decodeImage, requireAccess } from "@/lib/routeGuard";
import { youtubeStateMessage, youtubeUploadToken } from "@/lib/youtube/account";
import { setYoutubeThumbnail } from "@/lib/youtube/thumbnail";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 60;

const NO_STORE = { "Cache-Control": "private, no-store" };
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status, headers: NO_STORE });

// v1.23 회원이 방금 올린 영상에 배경 그림 썸네일 지정 — 회원 공용 유튜브 연결 토큰으로만(다른 회원·운영자 값으로 대신하지 않음)
export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return bad("요청 출처를 확인할 수 없습니다.", 403);
  const g = await requireAccess(); if (g.error) return g.error;
  try {
    const b = (await request.json().catch(() => ({}))) as { videoId?: unknown; image?: unknown };
    const videoId = String(b.videoId ?? "");
    if (!/^[A-Za-z0-9_-]{6,20}$/.test(videoId)) return bad("영상 번호가 올바르지 않습니다.");
    const jpeg = decodeImage(b.image, 2 * 1024 * 1024);
    if (!jpeg) return bad("썸네일 그림이 없거나 2MB를 넘습니다.");

    const t = await youtubeUploadToken(g.user.id);
    if ("status" in t) return bad(youtubeStateMessage(t.status.state), 409);
    await setYoutubeThumbnail(t.token, videoId, jpeg);
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  } catch (e) {
    const m = e instanceof Error ? e.message : "";
    if (m.startsWith("THUMB_FORBIDDEN")) return bad("유튜브가 썸네일 지정을 거절했습니다. 채널의 「맞춤 썸네일」 사용 인증(전화 인증)이 필요하거나 이 영상의 권한이 없습니다. 썸네일을 내려받아 유튜브 스튜디오에서 직접 넣어 주세요.", 403);
    if (m === "THUMB_NOT_FOUND") return bad("유튜브에서 영상을 찾지 못했습니다. 처리 중일 수 있으니 잠시 뒤 다시 시도해 주세요.", 404);
    console.error("[playlist youtube thumbnail]", m.slice(0, 300));
    return bad("썸네일을 지정하지 못했습니다. 썸네일을 내려받아 유튜브 스튜디오에서 직접 넣어 주세요.", 502);
  }
}
