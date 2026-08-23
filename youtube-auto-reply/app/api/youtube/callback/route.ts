import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkProgramAccessApi } from "@/lib/access";
import { resolveApiKey } from "@/lib/apiKeys";
import { parseOAuthState } from "@/lib/oauthState";
import { exchangeYoutubeCode, getYoutubeChannelInfo } from "@/lib/youtube/client";

// YouTube OAuth 리다이렉트 콜백. Access/Refresh Token은 여기서만 처리되어 DB에 저장되고
// 브라우저로는 절대 전달되지 않습니다. (shots/src/app/api/youtube/callback/route.ts와 동일 패턴)
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const stateParam = request.nextUrl.searchParams.get("state");
  const oauthError = request.nextUrl.searchParams.get("error");

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin;

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

    const token = await exchangeYoutubeCode(code, clientId, clientSecret);
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
      },
      { onConflict: "user_id" },
    );

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.redirect(`${siteUrl}${redirectTarget}?youtube_connected=1`);
  } catch {
    return NextResponse.redirect(`${siteUrl}${redirectTarget}?error=youtube_connect_failed`);
  }
}
