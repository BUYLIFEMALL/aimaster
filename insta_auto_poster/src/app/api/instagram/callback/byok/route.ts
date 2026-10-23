import { NextRequest, NextResponse } from "next/server";
import { SITE_ORIGIN, INSTAGRAM_REDIRECT_FOR } from "@/lib/oauthRedirect";
import { createClient } from "@/lib/supabase/server";
import { checkProgramAccessApi } from "@/lib/access";
import { resolveApiKey } from "@/lib/apiKeys";
import { exchangeInstagramCode, exchangeForLongLivedToken, getInstagramAccountInfo } from "@/lib/instagram/client";
import { IS_STANDALONE } from "@/lib/deployment";
import { saveSharedInstagramAccount } from "@/lib/instagram/memberAccount";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 인스타그램(Instagram Login, BYOK) OAuth 리다이렉트 콜백. 회원 본인 소유 Meta 앱(App ID/Secret)
// 으로 연결하는 대체(fallback) 방법이다 — 기본 연결 방법(/api/instagram/callback, Facebook 로그인)이
// 안 되는 회원을 위해 제공한다. Access Token은 여기서만 처리되어 DB에 저장되고, 브라우저로는
// 절대 전달되지 않습니다. (instagram-comment-reply/instagram-dm-reply와 동일 패턴 — Instagram
// Login 방식은 계정이 하나만 나오므로 Facebook 로그인 방식에 있는 "페이지 선택" 화면이 필요 없습니다.)
export async function GET(request: NextRequest) {
  // 2026-10-16 도메인 통일(SSO) 콜백: 회원 앱에 등록된 콜백(환경변수, 옛 *.vercel.app 주소)으로 돌아오면 로그인 쿠키가 없으므로
  // 같은 경로·쿼리 그대로 새 주소(https://auto-instagram-posting.buylife.xyz)로 넘겨 거기서 토큰을 교환한다. 교환 시 redirect_uri는 옛 주소 문자열 그대로라 일치 검사 통과.
  // 넘길 때 via=old를 붙여, 새 주소에서 토큰 교환 시 인증 요청에 썼던 옛 콜백 주소를 그대로 쓰게 한다(두 주소 동시 지원).
  // 독립 운영 복사본(수강생 *.vercel.app)은 자기 주소에서 그대로 교환한다(2026-10-18)
  if (!IS_STANDALONE && (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "").endsWith(".vercel.app")) {
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
    // 원인 진단용(2026-10-16): 코드·state 값은 남기지 않고 어떤 항목이 왔는지와 Instagram 오류 사유만 기록하고 화면에도 사유를 보여준다.
    const sp = request.nextUrl.searchParams;
    const why = oauthError
      ? `Instagram 오류: ${sp.get("error_reason") ?? oauthError}${sp.get("error_description") ? ` (${sp.get("error_description")})` : ""}`
      : `응답 값 누락(code ${code ? "있음" : "없음"}, state ${stateParam ? "있음" : "없음"})`;
    console.error("[instagram/callback/byok] 연결 시작 실패:", why, "keys=", [...sp.keys()].join(","));
    return NextResponse.redirect(`${siteUrl}/settings?error=connect_failed&reason=${encodeURIComponent(why)}`);
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
    return NextResponse.redirect(`${siteUrl}/settings?error=no_access`);
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
        auth_method: "instagram_login",
        access_token: longLived.access_token,
        token_expires_at: tokenExpiresAt,
      },
      { onConflict: "user_id" },
    );

    if (error) {
      throw new Error(error.message);
    }

    // v1.30: 공용 연결 계정에도 저장(이중 기록)
    await saveSharedInstagramAccount({
      userId: user.id,
      igUserId: accountInfo.igUserId,
      username: accountInfo.username ?? null,
      pageId: null,
      authMethod: "instagram_login",
      accessToken: longLived.access_token,
      tokenExpiresAt,
      appId,
    });

    return NextResponse.redirect(`${siteUrl}/settings?connected=1`);
  } catch (err) {
    // 원인 진단용: 서버 콘솔에 실제 에러를 남기고, 화면에도 메시지를 보여준다.
    const message = err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.";
    console.error("[instagram/callback/byok] 계정 연결 실패:", message);
    return NextResponse.redirect(`${siteUrl}/settings?error=connect_failed&reason=${encodeURIComponent(message)}`);
  }
}
