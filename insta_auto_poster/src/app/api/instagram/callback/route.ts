import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkProgramAccessApi } from "@/lib/access";
import { resolveApiKey } from "@/lib/apiKeys";
import { exchangeInstagramCode, exchangeForLongLivedToken, getInstagramAccountInfo } from "@/lib/instagram/client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 인스타그램(Instagram Login) OAuth 리다이렉트 콜백. Access Token은 여기서만 처리되어 DB에
// 저장되고, 브라우저로는 절대 전달되지 않습니다. (instagram-comment-reply/instagram-dm-reply와
// 동일 패턴 — Instagram Login 방식은 계정이 하나만 나오므로 옛 Facebook 로그인 방식에 있던
// "페이지 선택" 화면이 필요 없습니다.)
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const stateParam = request.nextUrl.searchParams.get("state");
  const oauthError = request.nextUrl.searchParams.get("error");

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin;

  if (oauthError || !code || !stateParam) {
    return NextResponse.redirect(`${siteUrl}/accounts?error=connect_failed`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // state 값에 요청 시점의 user.id를 담아 보냈으므로, 콜백에서도 동일 사용자인지 확인합니다.
  if (!user || user.id !== stateParam) {
    return NextResponse.redirect(`${siteUrl}/login`);
  }

  const access = await checkProgramAccessApi();
  if (!access.allowed) {
    return NextResponse.redirect(`${siteUrl}/accounts?error=no_access`);
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

    // Meta가 응답에 expires_in을 안 주거나 이상한 값을 준 경우를 대비한 방어 코드.
    const DEFAULT_LONG_LIVED_TOKEN_SECONDS = 60 * 24 * 60 * 60; // 공식 문서 기준 장기 토큰 수명 60일
    const expiresInSeconds =
      Number.isFinite(longLived.expires_in) && longLived.expires_in > 0
        ? longLived.expires_in
        : DEFAULT_LONG_LIVED_TOKEN_SECONDS;
    const tokenExpiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

    const { error } = await supabase.from("insta_accounts").upsert(
      {
        user_id: user.id,
        ig_user_id: accountInfo.igUserId,
        ig_username: accountInfo.username,
        page_id: null,
        access_token: longLived.access_token,
        token_expires_at: tokenExpiresAt,
      },
      { onConflict: "user_id" },
    );

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.redirect(`${siteUrl}/accounts?connected=1`);
  } catch (err) {
    // 원인 진단용: 서버 콘솔에 실제 에러를 남기고, 화면에도 메시지를 보여준다.
    const message = err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.";
    console.error("[instagram/callback] 계정 연결 실패:", message);
    return NextResponse.redirect(`${siteUrl}/accounts?error=connect_failed&reason=${encodeURIComponent(message)}`);
  }
}
