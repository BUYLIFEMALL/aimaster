import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  getThreadsUserProfile,
} from "@/lib/threads/client";

// Threads OAuth 리다이렉트 콜백. Access Token은 여기서만 처리되어 DB에 저장되고
// 브라우저로는 절대 전달되지 않습니다.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const oauthError = request.nextUrl.searchParams.get("error");

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin;

  if (oauthError || !code || !state) {
    return NextResponse.redirect(`${siteUrl}/accounts?error=connect_failed`);
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
    const shortLived = await exchangeCodeForToken(code);
    const longLived = await exchangeForLongLivedToken(shortLived.access_token);
    const profile = await getThreadsUserProfile(longLived.access_token);

    const tokenExpiresAt = new Date(Date.now() + longLived.expires_in * 1000).toISOString();

    const { error } = await supabase.from("threads_accounts").upsert(
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

    return NextResponse.redirect(`${siteUrl}/accounts?connected=1`);
  } catch {
    return NextResponse.redirect(`${siteUrl}/accounts?error=connect_failed`);
  }
}
