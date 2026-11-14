import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/**
 * 2026-11-14 주인님 「기본적으로 본인키 등록하는 룰 적용해」 — 카카오톡 공유는 로그인한 회원 본인 카카오 앱의
 * JavaScript 키(공용 user_api_keys provider `kakao_js_key`, 메인 사이트 「API 설정」에서 등록)로만 연다.
 * 운영자 키(NEXT_PUBLIC_KAKAO_JS_KEY)로 대신하지 않는다. 본인 행만 읽으므로(RLS) 다른 회원 키는 돌려주지 않는다.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ key: null }, { status: 401 });
  const { data } = await supabase
    .from("user_api_keys")
    .select("api_key")
    .eq("user_id", user.id)
    .eq("provider", "kakao_js_key")
    .maybeSingle();
  const key = (data as { api_key: string } | null)?.api_key?.trim() || null;
  return NextResponse.json({ key }, { headers: { "Cache-Control": "no-store" } });
}
