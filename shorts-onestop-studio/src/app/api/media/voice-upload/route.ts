import { NextResponse, type NextRequest } from "next/server";
import { fail, guard, json } from "@/lib/route";
import { voiceUploadUrl } from "@/lib/tts";
import { UserError } from "@/lib/errors";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// v1.42 무료 음성 업로드용 일회용 주소(본인 폴더 <user_id>/voice/, WAV 10MB 이하)
export async function POST(request: NextRequest) {
  try {
    const g = await guard(request); if (g instanceof NextResponse) return g;
    const size = Number(g.body.size ?? 0);
    if (!(size > 0 && size <= 10 * 1024 * 1024)) throw new UserError(400, "음성이 너무 깁니다. 장면 내레이션을 나눠 주세요(장면 하나 10MB 이하).");
    return json(await voiceUploadUrl(g.userId));
  } catch (e) { return fail(e); }
}
