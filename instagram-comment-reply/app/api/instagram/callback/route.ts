import { saveSharedCommentAccount } from "@/lib/instagram/memberAccount";
import { NextRequest, NextResponse } from "next/server";
import { SITE_ORIGIN, INSTAGRAM_REDIRECT_FOR } from "@/lib/oauthRedirect";
import { createClient } from "@/lib/supabase/server";
import { checkProgramAccessApi } from "@/lib/access";
import { resolveApiKey } from "@/lib/apiKeys";
import { parseOAuthState } from "@/lib/oauthState";
import { exchangeInstagramCode, exchangeForLongLivedToken, getInstagramAccountInfo, INSTAGRAM_MESSAGES_SCOPE } from "@/lib/instagram/client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 인스타그램 OAuth 리다이렉트 콜백. Access Token은 여기서만 처리되어 DB에 저장되고
// 브라우저로는 절대 전달되지 않습니다. (youtube-auto-reply/app/api/youtube/callback/route.ts와 동일 패턴)
export async function GET(request: NextRequest) {
  // 2026-10-16 도메인 통일(SSO) 콜백: 회원 앱에 등록된 콜백(환경변수, 옛 *.vercel.app 주소)으로 돌아오면 로그인 쿠키가 없으므로
  // 같은 경로·쿼리 그대로 새 주소(https://instagram-comment-reply.buylife.xyz)로 넘겨 거기서 토큰을 교환한다. 교환 시 redirect_uri는 옛 주소 문자열 그대로라 일치 검사 통과.
  // 넘길 때 via=old를 붙여, 새 주소에서 토큰 교환 시 인증 요청에 썼던 옛 콜백 주소를 그대로 쓰게 한다(두 주소 동시 지원).
  if ((request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "").endsWith(".vercel.app")) {
    const next = new URL(`${SITE_ORIGIN}${request.nextUrl.pathname}${request.nextUrl.search}`);
    next.searchParams.set("via", "old");
    return NextResponse.redirect(next.toString(), 307);
  }
  // 새 콜백으로 바로 돌아오면 via가 없다 → 새 주소로 교환
  const redirectUri = INSTAGRAM_REDIRECT_FOR(request.nextUrl.searchParams.get("via") === "old" ? "old" : "new");
  const code = request.nextUrl.searchParams.get("code");
  const stateParam = request.nextUrl.searchParams.get("state");
  const oauthError = request.nextUrl.searchParams.get("error");

  // 연결 후 돌아갈 주소는 옛 주소 환경변수가 아닌 새 주소 기준(옛 주소 삭제 후에도 동작)
  const siteUrl = SITE_ORIGIN;

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

    const shortLived = await exchangeInstagramCode(code, appId, appSecret, redirectUri);
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

    // 2026-10-20 병합 B: 메시지 권한까지 허락됐으면(「DM 답변도 사용」) DM 계정에도 같은 토큰으로 저장 → DM 답변 기능이 그대로 사용
    const granted = Array.isArray(shortLived.permissions)
      ? shortLived.permissions
      : String((shortLived as { permissions?: unknown }).permissions ?? "").split(",").map((v) => v.trim()).filter(Boolean);
    const withMessages = granted.includes(INSTAGRAM_MESSAGES_SCOPE);
    if (withMessages) {
      const { error: dmError } = await supabase.from("dm_accounts").upsert(
        {
          user_id: user.id,
          instagram_user_id: accountInfo.igUserId,
          username: accountInfo.username,
          access_token: longLived.access_token,
          token_expires_at: tokenExpiresAt,
          needs_reconnect: false,
          last_checked_at: new Date().toISOString(),
          reconnect_notified_at: null,
        },
        { onConflict: "user_id" },
      );
      if (dmError) throw new Error(dmError.message);
    }

    // v1.17: 공용 연결 계정에도 저장(이중 기록)
    await saveSharedCommentAccount({
      extraScopes: withMessages ? [INSTAGRAM_MESSAGES_SCOPE] : [],
      userId: user.id,
      igUserId: accountInfo.igUserId,
      username: accountInfo.username ?? null,
      accessToken: longLived.access_token,
      tokenExpiresAt,
      appId,
    });

    return NextResponse.redirect(`${siteUrl}${redirectTarget}?instagram_connected=1`);
  } catch {
    return NextResponse.redirect(`${siteUrl}${redirectTarget}?error=instagram_connect_failed`);
  }
}
