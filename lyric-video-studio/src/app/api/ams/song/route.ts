import { NextResponse, type NextRequest } from "next/server";
import { fail, guard, json } from "@/lib/route";
import { getAmsSong } from "@/lib/ams";
import { UserError } from "@/lib/errors";

// v1.10 AI 음악 스튜디오 곡 하나(?id=<생성 번호>&i=<몇 번째 곡, 0부터>)의 음악 서명 주소·제목·가사(+Lyria 시간 가사)
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
const UUID = /^[0-9a-f-]{36}$/i;

export async function GET(request: NextRequest) {
  try {
    const g = await guard(request); if (g instanceof NextResponse) return g;
    const id = request.nextUrl.searchParams.get("id") ?? "";
    const i = Number(request.nextUrl.searchParams.get("i") ?? "0");
    if (!UUID.test(id) || !Number.isInteger(i) || i < 0 || i > 9) throw new UserError(400, "곡 번호가 올바르지 않습니다.");
    return json({ song: await getAmsSong(g.userId, id, i) });
  } catch (e) { return fail(e); }
}
