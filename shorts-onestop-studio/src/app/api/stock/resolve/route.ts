import { NextResponse, type NextRequest } from "next/server";
import { fail, guard, json } from "@/lib/route";
import { getUserApiKeys } from "@/lib/apiKeys";
import { resolvePixabay } from "@/lib/stock";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 저장된 Pixabay 배경의 새 주소(임시 주소 24시간 만료 대응) — 회원 본인 Pixabay 키
export async function POST(request: NextRequest) {
  try {
    const g = await guard(request); if (g instanceof NextResponse) return g;
    const items = (Array.isArray(g.body.items) ? g.body.items : []).map((x) => (x && typeof x === "object" ? (x as Record<string, unknown>) : {}))
      .map((x) => ({ id: String(x.id ?? ""), type: x.type === "video" ? ("video" as const) : ("image" as const) }));
    const key = (await getUserApiKeys(g.userId, ["pixabay"])).pixabay;
    if (!key || !items.length) return json({ urls: {} });
    return json({ urls: await resolvePixabay(key, items) });
  } catch (e) { return fail(e); }
}
