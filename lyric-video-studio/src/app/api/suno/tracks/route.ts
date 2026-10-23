import { NextResponse, type NextRequest } from "next/server";
import { fail, guard, json } from "@/lib/route";
import { getSunoVariant, listSunoTracks } from "@/lib/suno";
import { UserError } from "@/lib/errors";
import { listItems } from "@/lib/store";

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
    // v1.06 이미 보관함에 저장한 변주는 그 작업을 함께 알려 준다(다시 열면 Suno 재조회 없이 저장된 가사 시간표 사용)
    const [tracks, items] = await Promise.all([listSunoTracks(g.userId), listItems(g.userId, "project")]);
    const saved = new Map<string, { id: string; title: string }>();
    for (const it of items) {
      const sid = (it.data as { sunoVariantId?: unknown } | null)?.sunoVariantId;
      if (typeof sid === "string" && !saved.has(sid)) saved.set(sid, { id: it.id as string, title: it.title as string }); // 최근 수정 순이라 처음 것이 최신
    }
    return json({ tracks: tracks.map((t) => ({ ...t, variants: t.variants.map((v) => ({ ...v, saved: saved.get(v.id) ?? null })) })) });
  } catch (e) { return fail(e); }
}
