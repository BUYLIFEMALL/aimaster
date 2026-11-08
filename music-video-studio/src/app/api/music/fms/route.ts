import { NextResponse } from "next/server";
import { authorize, errorJson } from "@/lib/apiGuard";
import { getFmsSong } from "@/lib/music/fmsSong";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const NO_STORE = { "Cache-Control": "private, no-store" };
const UUID = /^[0-9a-f-]{36}$/i;

/** v1.28 AI 무료음악 자동화 곡 하나(?id=<곡 번호>)의 제목·스타일·가사·가사 시간(음원은 회원 PC에만 있어 주지 않음) */
export async function GET(request: Request) {
  try {
    const gate = await authorize();
    if (!gate.ok) return gate.response;
    const id = new URL(request.url).searchParams.get("id") ?? "";
    if (!UUID.test(id)) return errorJson("곡 번호가 올바르지 않습니다.", 400);
    const song = await getFmsSong(gate.auth.user.id, id);
    if (!song) return errorJson("곡을 찾지 못했습니다. AI 무료음악 자동화에서 내가 만든 곡만 가져올 수 있습니다.", 404);
    return NextResponse.json({ song }, { headers: NO_STORE });
  } catch (err) {
    console.error("fms song error:", String((err as Error)?.message ?? "").slice(0, 200));
    return errorJson("AI 무료음악 자동화 곡을 불러오지 못했습니다. 잠시 뒤 다시 시도해주세요.", 500);
  }
}
