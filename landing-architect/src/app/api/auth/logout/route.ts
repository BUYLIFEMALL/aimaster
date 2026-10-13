import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ error: "요청 출처를 확인할 수 없습니다." }, { status: 403, headers: { "Cache-Control": "private, no-store" } });
  try {
    const { error } = await (await createClient()).auth.signOut();
    if (error) throw error;
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
  } catch { return NextResponse.json({ error: "로그아웃에 실패했습니다. 다시 시도해 주세요." }, { status: 503, headers: { "Cache-Control": "private, no-store" } }); }
}
