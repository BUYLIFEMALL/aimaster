import { NextResponse, type NextRequest } from "next/server";
import { fail, guard, json } from "@/lib/route";
import { getFmsSong } from "@/lib/fms";
import { UserError } from "@/lib/errors";

// v1.13 AI 무료음악 자동화 곡 하나(?id=<곡 번호>)의 제목·가사·가사 시간(음원은 회원 PC에만 있어 주지 않음)
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
const UUID = /^[0-9a-f-]{36}$/i;

export async function GET(request: NextRequest) {
  try {
    const g = await guard(request); if (g instanceof NextResponse) return g;
    const id = request.nextUrl.searchParams.get("id") ?? "";
    if (!UUID.test(id)) throw new UserError(400, "곡 번호가 올바르지 않습니다.");
    return json({ song: await getFmsSong(g.userId, id) });
  } catch (e) { return fail(e); }
}
