import { NextResponse, type NextRequest } from "next/server";
import { fail, guard, json } from "@/lib/route";
import { getSunoVariant, listSunoTracks } from "@/lib/suno";
import { UserError } from "@/lib/errors";

// v1.05 음악(SUNO) 자동화의 내 곡 목록(?variant= 이면 그 변주의 음악·커버 서명 주소와 가사 글)
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
const UUID = /^[0-9a-f-]{36}$/i;

export async function GET(request: NextRequest) {
  try {
    const g = await guard(request); if (g instanceof NextResponse) return g;
    const variant = request.nextUrl.searchParams.get("variant");
    if (variant) {
      if (!UUID.test(variant)) throw new UserError(400, "곡 번호가 올바르지 않습니다.");
      return json({ variant: await getSunoVariant(g.userId, variant) });
    }
    return json({ tracks: await listSunoTracks(g.userId) });
  } catch (e) { return fail(e); }
}
