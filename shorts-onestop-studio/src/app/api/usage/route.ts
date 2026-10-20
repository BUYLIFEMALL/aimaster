import { NextResponse, type NextRequest } from "next/server";
import { fail, guard, json } from "@/lib/route";
import { UserError } from "@/lib/errors";
import { recordUsage } from "@/lib/usage";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// v1.22 브라우저에서 일어나는 동작(MP4 완성·유튜브 업로드)의 사용 기록. 권한·같은 출처는 guard가 확인, 허용된 이름만 받는다.
const BROWSER_ACTIONS = ["mp4_made", "youtube_uploaded"] as const;
const short = (v: unknown, n = 64) => (typeof v === "string" ? v.slice(0, n) : null);

export async function POST(request: NextRequest) {
  try {
    const g = await guard(request, 4_000); if (g instanceof NextResponse) return g;
    const action = BROWSER_ACTIONS.find((a) => a === g.body.action);
    if (!action) throw new UserError(400, "기록할 수 없는 동작입니다.");
    const seconds = Number(g.body.seconds);
    await recordUsage(g.userId, action, { projectId: short(g.body.projectId), youtubeVideoId: short(g.body.youtubeVideoId, 20), seconds: Number.isFinite(seconds) ? Math.round(seconds) : null, batch: g.body.batch === true });
    return json({ ok: true });
  } catch (e) { return fail(e); }
}
