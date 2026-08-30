import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkProgramAccessApi } from "@/lib/access";
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
    const shortLivedToken = await exchangeInstagramCode(code);
    const longLived = await exchangeForLongLivedInstagramToken(shortLivedToken);
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

    return NextResponse.redirect(`${siteUrl}${redirectTarget}?instagram_connected=1`);
  } catch {
    return NextResponse.redirect(`${siteUrl}${redirectTarget}?error=instagram_connect_failed`);
  }
}
