import { saveSharedShotsInstagramAccount } from "@/lib/instagram/memberAccount";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkProgramAccessApi } from "@/lib/access";
import { resolveFacebookLoginApp } from "@/lib/apiKeys";
import { parseOAuthState } from "@/lib/oauthState";
import {
  exchangeInstagramCode,
  exchangeForLongLivedInstagramToken,
  findInstagramBusinessAccount,
} from "@/lib/instagram/client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// Instagram(Meta) OAuth 리다이렉트 콜백. Access Token은 여기서만 처리되어 DB에 저장되고
// 브라우저로는 절대 전달되지 않습니다.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const stateParam = request.nextUrl.searchParams.get("state");
  const oauthError = request.nextUrl.searchParams.get("error");

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin;

  if (oauthError || !code || !stateParam) {
    return NextResponse.redirect(`${siteUrl}/scripts?error=instagram_connect_failed`);
  }

  const { userId: stateUserId, returnTo } = parseOAuthState(stateParam);
  const redirectTarget = returnTo ?? "/scripts";

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
    // v1.23: Facebook 앱 칸 먼저, 없으면 예전 Meta 칸(연결 시작과 같은 순서)
    const { appId, appSecret } = await resolveFacebookLoginApp(supabase, user.id);
    if (!appId || !appSecret) {
      throw new Error("Facebook 앱(또는 Meta App) ID/Secret이 등록되어 있지 않습니다.");
    }

    const shortLivedToken = await exchangeInstagramCode(code, appId, appSecret);
    const longLived = await exchangeForLongLivedInstagramToken(shortLivedToken, appId, appSecret);
    const account = await findInstagramBusinessAccount(longLived.accessToken);

    const tokenExpiresAt = new Date(Date.now() + longLived.expiresInSeconds * 1000).toISOString();

    const { error } = await supabase.from("instagram_accounts").upsert(
      {
        user_id: user.id,
        ig_user_id: account.igUserId,
        ig_username: account.igUsername,
        page_id: account.pageId,
        access_token: longLived.accessToken,
        token_expires_at: tokenExpiresAt,
      },
      { onConflict: "user_id" },
    );

    if (error) {
      throw new Error(error.message);
    }

    // v1.21: 공용 연결 계정에도 저장(이중 기록)
    await saveSharedShotsInstagramAccount({
      userId: user.id,
      igUserId: account.igUserId,
      username: account.igUsername ?? null,
      pageId: account.pageId ?? null,
      accessToken: longLived.accessToken,
      tokenExpiresAt,
      appId,
    });

    return NextResponse.redirect(`${siteUrl}${redirectTarget}?instagram_connected=1`);
  } catch {
    return NextResponse.redirect(`${siteUrl}${redirectTarget}?error=instagram_connect_failed`);
  }
}
