import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveApiKey } from "@/lib/apiKeys";
import { exchangeYoutubeCode, getYoutubeChannelInfo } from "@/lib/youtube/client";

// YouTube OAuth 리다이렉트 콜백. Access/Refresh Token은 여기서만 처리되어 DB에 저장되고
// 브라우저로는 절대 전달되지 않습니다.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const oauthError = request.nextUrl.searchParams.get("error");

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin;

  if (oauthError || !code || !state) {
    return NextResponse.redirect(`${siteUrl}/scripts?error=youtube_connect_failed`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // state 값에 요청 시점의 user.id를 담아 보냈으므로, 콜백에서도 동일 사용자인지 확인합니다.
  if (!user || user.id !== state) {
    return NextResponse.redirect(`${siteUrl}/login`);
  }

  try {
    const clientId = await resolveApiKey(supabase, user.id, "google_client_id");
    const clientSecret = await resolveApiKey(supabase, user.id, "google_client_secret");
    if (!clientId || !clientSecret) {
      throw new Error("Google OAuth Client ID/Secret이 등록되어 있지 않습니다.");
    }

    const token = await exchangeYoutubeCode(code, clientId, clientSecret);
    if (!token.refresh_token) {
      // prompt=consent를 걸어놨지만, 혹시 refresh_token이 안 오면 자동 재발급이 불가능하므로
      // 여기서 바로 재연결을 요청한다.
      throw new Error("refresh_token을 받지 못했습니다.");
    }
    const channel = await getYoutubeChannelInfo(token.access_token);

    const tokenExpiresAt = new Date(Date.now() + token.expires_in * 1000).toISOString();

    const { error } = await supabase.from("youtube_accounts").upsert(
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

    return NextResponse.redirect(`${siteUrl}/scripts?youtube_connected=1`);
  } catch {
    return NextResponse.redirect(`${siteUrl}/scripts?error=youtube_connect_failed`);
  }
}
