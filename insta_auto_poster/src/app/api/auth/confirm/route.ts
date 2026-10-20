import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { IS_STANDALONE } from "@/lib/deployment";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 독립 운영 모드(배포 키트) 전용: 회원가입 확인 메일의 링크를 받아 로그인을 마무리한다(2026-10-20).
// 예전에는 돌아올 주소를 지정하지 않아 메일 링크가 Supabase 기본 Site URL(localhost)로 갔다.
// 다른 브라우저에서 열어 세션 교환이 안 돼도 메일 인증 자체는 이미 끝났으므로 로그인 화면에서 안내한다.
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  if (!IS_STANDALONE) return NextResponse.redirect(new URL("/login", url.origin));

  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;

  const supabase = await createClient();
  let signedIn = false;
  if (code) {
    signedIn = !(await supabase.auth.exchangeCodeForSession(code)).error;
  } else if (tokenHash && type) {
    signedIn = !(await supabase.auth.verifyOtp({ type, token_hash: tokenHash })).error;
  }
  return NextResponse.redirect(new URL(signedIn ? "/dashboard" : "/login?confirmed=1", url.origin));
}
