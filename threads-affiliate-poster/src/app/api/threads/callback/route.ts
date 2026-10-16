import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkProgramAccessApi } from "@/lib/access";
import { resolveApiKey } from "@/lib/apiKeys";
import {
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  getThreadsUserProfile,
} from "@/lib/threads/client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// Threads OAuth 리다이렉트 콜백. Access Token은 여기서만 처리되어 DB에 저장되고
// 브라우저로는 절대 전달되지 않습니다.
export async function GET(request: NextRequest) {
  // 2026-10-16 도메인 통일(SSO) 콜백: 회원 앱에 등록된 콜백(환경변수, 옛 *.vercel.app 주소)으로 돌아오면 로그인 쿠키가 없으므로
  // 같은 경로·쿼리 그대로 새 주소(https://threads-affiliate-poster.buylife.xyz)로 넘겨 거기서 토큰을 교환한다. 교환 시 redirect_uri는 옛 주소 문자열 그대로라 일치 검사 통과.
  if ((request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "").endsWith(".vercel.app")) {
    return NextResponse.redirect(`https://threads-affiliate-poster.buylife.xyz${request.nextUrl.pathname}${request.nextUrl.search}`, 307);
  }
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const oauthError = request.nextUrl.searchParams.get("error");

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin;

  if (oauthError || !code || !state) {
    return NextResponse.redirect(`${siteUrl}/settings?error=connect_failed`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== state) {
    return NextResponse.redirect(`${siteUrl}/login`);
  }

  const access = await checkProgramAccessApi();
  if (!access.allowed) {
    return NextResponse.redirect(`${siteUrl}/settings?error=no_access`);
  }

  try {
    // 본인 계정의 Meta App ID/Secret으로만 토큰을 교환한다 (앱 공용 키 폴백 없음).
    const appId = await resolveApiKey(supabase, user.id, "threads_app_id");
    const appSecret = await resolveApiKey(supabase, user.id, "threads_app_secret");
    if (!appId || !appSecret) {
      return NextResponse.redirect(`${siteUrl}/settings?error=meta_app_missing`);
    }

    const shortLived = await exchangeCodeForToken(code, appId, appSecret);
    const longLived = await exchangeForLongLivedToken(shortLived.access_token, appSecret);
    const profile = await getThreadsUserProfile(longLived.access_token);

    const tokenExpiresAt = new Date(Date.now() + longLived.expires_in * 1000).toISOString();

    const { error } = await supabase.from("tap_accounts").upsert(
      {
        user_id: user.id,
        threads_user_id: profile.id,
        username: profile.username,
        access_token: longLived.access_token,
        token_expires_at: tokenExpiresAt,
      },
      { onConflict: "user_id" },
    );

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.redirect(`${siteUrl}/settings?connected=1`);
  } catch {
    return NextResponse.redirect(`${siteUrl}/settings?error=connect_failed`);
  }
}
