import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkProgramAccessApi } from "@/lib/access";
import { resolveApiKey } from "@/lib/apiKeys";
import { parseOAuthState } from "@/lib/oauthState";
import { exchangeInstagramCode, exchangeForLongLivedToken, getInstagramAccountInfo } from "@/lib/instagram/client";

// 인스타그램 OAuth 리다이렉트 콜백. Access Token은 여기서만 처리되어 DB에 저장되고
// 브라우저로는 절대 전달되지 않습니다. (youtube-auto-reply/app/api/youtube/callback/route.ts와 동일 패턴)
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const stateParam = request.nextUrl.searchParams.get("state");
  const oauthError = request.nextUrl.searchParams.get("error");

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin;

  if (oauthError || !code || !stateParam) {
    return NextResponse.redirect(`${siteUrl}/settings?error=instagram_connect_failed`);
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
    const appId = await resolveApiKey(supabase, user.id, "meta_app_id");
    const appSecret = await resolveApiKey(supabase, user.id, "meta_app_secret");
    if (!appId || !appSecret) {
      throw new Error("Meta App ID/Secret이 등록되어 있지 않습니다.");
    }

    const shortLived = await exchangeInstagramCode(code, appId, appSecret);
    const longLived = await exchangeForLongLivedToken(shortLived.access_token, appSecret);
    const accountInfo = await getInstagramAccountInfo(longLived.access_token, shortLived.user_id);

    const tokenExpiresAt = new Date(Date.now() + longLived.expires_in * 1000).toISOString();

    const { error } = await supabase.from("ig_accounts").upsert(
      {
        user_id: user.id,
        ig_user_id: accountInfo.igUserId,
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

    return NextResponse.redirect(`${siteUrl}${redirectTarget}?instagram_connected=1`);
  } catch {
    return NextResponse.redirect(`${siteUrl}${redirectTarget}?error=instagram_connect_failed`);
  }
}
