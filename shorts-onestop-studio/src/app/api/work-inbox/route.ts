import { NextResponse, type NextRequest } from "next/server";
import { fail, guard, json } from "@/lib/route";
import { UserError } from "@/lib/errors";
import { getItem } from "@/lib/store";
import { sendToWorkInbox } from "@/lib/workInbox";
import { youtubeUploadInboxContent } from "@/lib/youtubeInboxContent";
import type { ShortsScript } from "@/lib/script";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 공용 표 「보낸 프로그램」은 programs.slug
const PROGRAM_SLUG = "shorts-onestop-studio";
const APP_URL = "https://shorts-onestop-studio.buylife.xyz";
const INBOX_URL = "https://ai-work-workspace.buylife.xyz/inbox";

// U10 유튜브(2026-11-12, 업무 워크스페이스 담당): 프로젝트의 유튜브 올린 기록 한 건을 회원 본인의 「받은 업무」로 보낸다.
// 본문은 브라우저 값이 아니라 회원 본인 행(shorts_onestop_items.data.youtube)을 서버가 다시 읽어 만든다.
// 요청: { id: 프로젝트 id, videoId?: 유튜브 영상 id — 없으면 가장 최근 업로드 }
export async function POST(request: NextRequest) {
  try {
    const g = await guard(request, 4_000); if (g instanceof NextResponse) return g;
    const id = typeof g.body.id === "string" ? g.body.id : "";
    const youtubeId = typeof g.body.videoId === "string" ? g.body.videoId : "";
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new UserError(404, "프로젝트를 찾지 못했습니다.");
    const item = await getItem(g.userId, id);
    if (!item || item.kind !== "project") throw new UserError(404, "프로젝트를 찾지 못했습니다.");
    const uploads = ((item.data as ShortsScript | null)?.youtube ?? []).filter((u) => u?.videoId && u.url);
    const upload = youtubeId ? uploads.find((u) => u.videoId === youtubeId) : uploads[0];
    if (!upload) throw new UserError(404, "아직 유튜브에 올린 기록이 없습니다.");

    const content = youtubeUploadInboxContent(upload);
    try {
      await sendToWorkInbox({
        userId: g.userId,
        sourceSlug: PROGRAM_SLUG,
        kind: "document",
        title: content.title,
        bodyMd: content.bodyMd,
        data: content.data,
        sourceUrl: `${APP_URL}/design?id=${id}`,
      });
    } catch (e) {
      return json({ error: e instanceof Error ? e.message : "업무 워크스페이스로 보내지 못했습니다." }, 502);
    }
    return json({ ok: true, title: content.title, inboxUrl: INBOX_URL });
  } catch (e) {
    return fail(e);
  }
}
