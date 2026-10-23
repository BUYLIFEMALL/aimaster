import { NextResponse, type NextRequest } from "next/server";
import { fail, guard, json } from "@/lib/route";
import { getUserApiKeys } from "@/lib/apiKeys";
import { searchStock } from "@/lib/stock";
import { UserError } from "@/lib/errors";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 스톡 검색: 회원 본인 Pexels·Pixabay 키(무료, 계정당 한도) — 운영자 키 없음
export async function POST(request: NextRequest) {
  try {
    const g = await guard(request); if (g instanceof NextResponse) return g;
    const provider = g.body.provider === "pexels" ? "pexels" : "pixabay";
    const type = g.body.type === "video" ? "video" : "image";
    const query = String(g.body.query ?? "").trim();
    if (query.length < 2) throw new UserError(400, "검색어를 2자 이상 입력해 주세요(영어 권장).");
    const key = (await getUserApiKeys(g.userId, [provider]))[provider];
    if (!key) throw new UserError(400, `${provider === "pexels" ? "Pexels" : "Pixabay"} API 키가 없습니다. API키등록·플랫폼연동에서 본인 키를 등록해 주세요(무료).`, { needKey: true });
    return json({ items: await searchStock(provider, key, type, query) });
  } catch (e) { return fail(e); }
}
