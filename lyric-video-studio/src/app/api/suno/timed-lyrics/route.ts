import { NextResponse, type NextRequest } from "next/server";
import { fail, guard, json } from "@/lib/route";
import { fetchSunoTimedLines } from "@/lib/suno";
import { UserError } from "@/lib/errors";

// v1.05 회원 본인 Suno 키로 시간 가사를 받아 줄 시간표로 돌려준다(누를 때만 1회 호출)
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 60;
const UUID = /^[0-9a-f-]{36}$/i;

export async function POST(request: NextRequest) {
  try {
    const g = await guard(request, 4_000); if (g instanceof NextResponse) return g;
    const variantId = String(g.body.variantId ?? "");
    if (!UUID.test(variantId)) throw new UserError(400, "곡 번호가 올바르지 않습니다.");
    return json({ lines: await fetchSunoTimedLines(g.userId, variantId) });
  } catch (e) { return fail(e); }
}
