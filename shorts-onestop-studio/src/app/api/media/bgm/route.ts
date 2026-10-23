import { NextResponse, type NextRequest } from "next/server";
import { fail, guard, json } from "@/lib/route";
import { bgmUploadUrl } from "@/lib/tts";
import { UserError } from "@/lib/errors";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 배경음악 업로드용 일회용 주소(본인 폴더 <user_id>/bgm/, 10MB·오디오 형식은 버킷 설정이 제한)
export async function POST(request: NextRequest) {
  try {
    const g = await guard(request); if (g instanceof NextResponse) return g;
    const name = String(g.body.name ?? "");
    const size = Number(g.body.size ?? 0);
    if (!/\.(mp3|m4a|wav|ogg|aac)$/i.test(name)) throw new UserError(400, "mp3·m4a·wav·ogg·aac 음악 파일만 올릴 수 있습니다.");
    if (!(size > 0 && size <= 10 * 1024 * 1024)) throw new UserError(400, "음악 파일은 10MB 이하만 올릴 수 있습니다.");
    return json(await bgmUploadUrl(g.userId, name));
  } catch (e) { return fail(e); }
}
