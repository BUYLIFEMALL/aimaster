import { NextResponse, type NextRequest } from "next/server";
import { fail, guard, json } from "@/lib/route";
import { suggestYtMeta } from "@/lib/llm";

// v1.14 유튜브 제목·설명 AI 제안(선택 기능) — 회원이 버튼을 누를 때만 회원 본인 키로 1회 호출한다.
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 60;

const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");

export async function POST(request: NextRequest) {
  try {
    const g = await guard(request, 20_000); if (g instanceof NextResponse) return g;
    const b = g.body;
    return json(await suggestYtMeta(g.userId, { title: str(b.title, 200), artist: str(b.artist, 200), lyrics: str(b.lyrics, 4000), portrait: b.portrait === true }));
  } catch (e) { return fail(e); }
}
