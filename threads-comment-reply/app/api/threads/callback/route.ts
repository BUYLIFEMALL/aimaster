import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkProgramAccessApi } from "@/lib/access";
import { resolveApiKey } from "@/lib/apiKeys";
import { parseOAuthState } from "@/lib/oauthState";
import { exchangeThreadsCode, exchangeForLongLivedToken, getThreadsAccountInfo } from "@/lib/threads/client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 쓰레드 OAuth 리다이렉트 콜백. Access Token은 여기서만 처리되어 DB에 저장되고
// 브라우저로는 절대 전달되지 않습니다. (youtube-auto-reply/app/api/youtube/callback/route.ts와 동일 패턴)
export async function GET(request: NextRequest) {
  // 2026-10-16 도메인 통일(SSO) 콜백: 회원 앱에 등록된 콜백(환경변수, 옛 *.vercel.app 주소)으로 돌아오면 로그인 쿠키가 없으므로
  // 같은 경로·쿼리 그대로 새 주소(https://threads-comment-reply.buylife.xyz)로 넘겨 거기서 토큰을 교환한다. 교환 시 redirect_uri는 옛 주소 문자열 그대로라 일치 검사 통과.
  if ((request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "").endsWith(".vercel.app")) {
    return NextResponse.redirect(`https://threads-comment-reply.buylife.xyz${request.nextUrl.pathname}${request.nextUrl.search}`, 307);
  }
  const code = request.nextUrl.searchParams.get("code");
  const stateParam = request.nextUrl.searchParams.get("state");
  const oauthError = request.nextUrl.searchParams.get("error");

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin;

  if (oauthError || !code || !stateParam) {
    return NextResponse.redirect(`${siteUrl}/settings?error=threads_connect_failed`);
  }

  const { userId: stateUserId, returnTo } = parseOAuthState(stateParam);
  const redirectTarget = returnTo ?? "/settings";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== stateUserId) {
    return NextResponse.redirect(`${siteUrl}/login`);
  }

  const access = await checkProgramAccessApi();
  if (!access.allowed) {
    return NextResponse.redirect(`${siteUrl}${redirectTarget}?error=no_access`);
  }

  try {
    const appId = await resolveApiKey(supabase, user.id, "threads_app_id");
    const appSecret = await resolveApiKey(supabase, user.id, "threads_app_secret");
    if (!appId || !appSecret) {
      throw new Error("Meta App ID/Secret이 등록되어 있지 않습니다.");
    }

    const shortLived = await exchangeThreadsCode(code, appId, appSecret);
    const longLived = await exchangeForLongLivedToken(shortLived.access_token, appSecret);
    const accountInfo = await getThreadsAccountInfo(longLived.access_token);

    const tokenExpiresAt = new Date(Date.now() + longLived.expires_in * 1000).toISOString();

    const { error } = await supabase.from("th_accounts").upsert(
      {
        user_id: user.id,
        threads_user_id: accountInfo.threadsUserId,
        username: accountInfo.username,
        access_token: longLived.access_token,
        token_expires_at: tokenExpiresAt,
        needs_reconnect: false,
        last_checked_at: new Date().toISOString(),
        reconnect_notified_at: null,
      },
      { onConflict: "user_id" },
    );

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.redirect(`${siteUrl}${redirectTarget}?threads_connected=1`);
  } catch {
    return NextResponse.redirect(`${siteUrl}${redirectTarget}?error=threads_connect_failed`);
  }
}
