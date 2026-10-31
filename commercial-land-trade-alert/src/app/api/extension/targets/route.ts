import { NextResponse } from "next/server";
import { verifyExtensionToken } from "@/lib/extensionAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { kindsText, MAX_TARGETS, parseWatchUrl } from "@/lib/watchTargets";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 확장 팝업 「이 화면 감시」. 지도 주소와 이름만 받는다.
export async function POST(request: Request) {
  const user = await verifyExtensionToken(request);
  if (!user) return NextResponse.json({ error: "유효하지 않은 연결 코드이거나 이용 권한이 없습니다." }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { url?: string; name?: string } | null;
  const parsed = parseWatchUrl(String(body?.url ?? ""));
  if (!parsed) return NextResponse.json({ error: "네이버 부동산의 상가·건물·토지 지도 화면이 아니에요." }, { status: 400 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any;
  const { count } = await db.from("commercial_land_listing_targets").select("id", { count: "exact", head: true }).eq("user_id", user.userId);
  if ((count ?? 0) >= MAX_TARGETS) return NextResponse.json({ error: `감시 화면은 ${MAX_TARGETS}곳까지예요. 웹에서 하나를 지운 뒤 다시 눌러 주세요.` }, { status: 400 });
  const raw = String(body?.name ?? "").trim().slice(0, 60);
  const name = raw && !/네이버|부동산/.test(raw) ? raw : `${kindsText(parsed.kinds)} ${(count ?? 0) + 1}`;
  const { error } = await db.from("commercial_land_listing_targets").upsert({ user_id: user.userId, url: parsed.url, kinds: parsed.kinds, name }, { onConflict: "user_id,url", ignoreDuplicates: true });
  if (error) return NextResponse.json({ error: "저장하지 못했습니다." }, { status: 500 });
  return NextResponse.json({ ok: true, name, count: (count ?? 0) + 1 });
}
