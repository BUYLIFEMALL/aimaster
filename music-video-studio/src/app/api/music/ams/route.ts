import { NextResponse } from "next/server";
import { authorize, errorJson } from "@/lib/apiGuard";
import { listAmsSongs, signAmsSong } from "@/lib/music/amsSongs";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const NO_STORE = { "Cache-Control": "private, no-store" };

/** v1.13 AI 음악 스튜디오 내 곡 — ?ref= 없으면 목록, 있으면 그 곡의 듣기 주소(1시간) */
export async function GET(request: Request) {
  try {
    const gate = await authorize();
    if (!gate.ok) return gate.response;
    const ref = new URL(request.url).searchParams.get("ref");
    if (ref) {
      const audioUrl = await signAmsSong(gate.auth.user.id, ref);
      if (!audioUrl) return errorJson("이 곡의 음악 파일을 찾지 못했습니다. AI 음악 스튜디오 보관 기간(30일)이 지나 지워졌을 수 있습니다.", 404);
      return NextResponse.json({ audioUrl }, { headers: NO_STORE });
    }
    return NextResponse.json({ songs: await listAmsSongs(gate.auth.user.id) }, { headers: NO_STORE });
  } catch (err) {
    console.error("ams songs error:", String((err as Error)?.message ?? "").slice(0, 200));
    return errorJson("AI 음악 스튜디오 곡을 불러오지 못했습니다. 잠시 뒤 다시 시도해주세요.", 500);
  }
}
