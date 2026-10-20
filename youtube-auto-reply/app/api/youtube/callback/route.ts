import { saveSharedYoutubeAccount } from "@/lib/youtube/memberAccount";
import { NextRequest, NextResponse } from "next/server";
import { SITE_ORIGIN, YOUTUBE_REDIRECT_FOR } from "@/lib/oauthRedirect";
import { createClient } from "@/lib/supabase/server";
import { checkProgramAccessApi } from "@/lib/access";
import { resolveApiKey } from "@/lib/apiKeys";
import { parseOAuthState } from "@/lib/oauthState";
import { exchangeYoutubeCode, getYoutubeChannelInfo } from "@/lib/youtube/client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// YouTube OAuth 리다이렉트 콜백. Access/Refresh Token은 여기서만 처리되어 DB에 저장되고
// 브라우저로는 절대 전달되지 않습니다. (shots/src/app/api/youtube/callback/route.ts와 동일 패턴)
export async function GET(request: NextRequest) {
  // 2026-10-16 도메인 통일(SSO) 콜백: 회원 앱에 등록된 콜백(환경변수, 옛 *.vercel.app 주소)으로 돌아오면 로그인 쿠키가 없으므로
  // 같은 경로·쿼리 그대로 새 주소(https://youtube-auto-reply.buylife.xyz)로 넘겨 거기서 토큰을 교환한다. 교환 시 redirect_uri는 옛 주소 문자열 그대로라 일치 검사 통과.
  // 넘길 때 via=old를 붙여, 새 주소에서 토큰 교환 시 인증 요청에 썼던 옛 콜백 주소를 그대로 쓰게 한다(두 주소 동시 지원).
  if ((request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "").endsWith(".vercel.app")) {
    const next = new URL(`${SITE_ORIGIN}${request.nextUrl.pathname}${request.nextUrl.search}`);
    next.searchParams.set("via", "old");
    return NextResponse.redirect(next.toString(), 307);
  }
  // 새 콜백으로 바로 돌아오면 via가 없다 → 새 주소로 교환
  const redirectUri = YOUTUBE_REDIRECT_FOR(request.nextUrl.searchParams.get("via") === "old" ? "old" : "new");
  const code = request.nextUrl.searchParams.get("code");
  const stateParam = request.nextUrl.searchParams.get("state");
  const oauthError = request.nextUrl.searchParams.get("error");

  // 연결 후 돌아갈 주소는 옛 주소 환경변수가 아닌 새 주소 기준(옛 주소 삭제 후에도 동작)
  const siteUrl = SITE_ORIGIN;

  if (oauthError || !code || !stateParam) {
    return NextResponse.redirect(`${siteUrl}/settings?error=youtube_connect_failed`);
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
    const clientId = await resolveApiKey(supabase, user.id, "google_client_id");
    const clientSecret = await resolveApiKey(supabase, user.id, "google_client_secret");
    if (!clientId || !clientSecret) {
      throw new Error("Google OAuth Client ID/Secret이 등록되어 있지 않습니다.");
    }

    const token = await exchangeYoutubeCode(code, clientId, clientSecret, redirectUri);
    if (!token.refresh_token) {
      throw new Error("refresh_token을 받지 못했습니다.");
    }
    const channel = await getYoutubeChannelInfo(token.access_token);

    const tokenExpiresAt = new Date(Date.now() + token.expires_in * 1000).toISOString();

    const { error } = await supabase.from("ytreply_accounts").upsert(
      {
        user_id: user.id,
        channel_id: channel.channelId,
        channel_title: channel.channelTitle,
        access_token: token.access_token,
        refresh_token: token.refresh_token,
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

    // v1.14: 공용 연결 계정에도 저장(이중 기록)
    await saveSharedYoutubeAccount({
      userId: user.id,
      channelId: channel.channelId,
      channelTitle: channel.channelTitle ?? null,
      accessToken: token.access_token,
      refreshToken: token.refresh_token ?? null,
      tokenExpiresAt,
      clientId,
    });

    return NextResponse.redirect(`${siteUrl}${redirectTarget}?youtube_connected=1`);
  } catch {
    return NextResponse.redirect(`${siteUrl}${redirectTarget}?error=youtube_connect_failed`);
  }
}
