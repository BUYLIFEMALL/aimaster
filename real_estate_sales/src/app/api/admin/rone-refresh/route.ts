import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { refreshCommercialRent } from "@/lib/realestate/commercialRentData";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

// RQ-A4 1단계(2026-11-06): 관리자가 분기마다 한 번 부른다 — R-ONE 표 8개 → rone_commercial_rent, 좌표 없는 상권을 geocode개까지 채움.
// ?geocode=60(최대 150) · ?only=geocode 는 R-ONE을 다시 받지 않고 좌표만 이어서 채운다.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loose = { from: (t: string) => any };

export async function GET(req: Request) {
  const { data: auth } = await (await createClient()).auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const db = createAdminClient() as unknown as Loose;
  const { data: profile } = await db.from("profiles").select("is_admin").eq("id", auth.user.id).maybeSingle();
  if (!profile?.is_admin) return NextResponse.json({ error: "관리자만 실행할 수 있습니다." }, { status: 403 });

  const url = new URL(req.url);
  const limit = Math.min(150, Math.max(0, Number(url.searchParams.get("geocode") ?? 60) || 0));
  try {
    return NextResponse.json(await refreshCommercialRent(limit, url.searchParams.get("only") === "geocode"));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
