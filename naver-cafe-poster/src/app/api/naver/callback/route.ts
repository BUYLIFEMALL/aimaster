import { NextRequest, NextResponse } from "next/server";
import { SITE_ORIGIN } from "@/lib/oauthRedirect";
import { createClient } from "@/lib/supabase/server";
import { checkProgramAccessApi } from "@/lib/access";
import { exchangeNaverCode, getNaverProfile } from "@/lib/naver/client";
import { resolveNaverAppCredentials } from "@/lib/naver/account";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 네이버 로그인 OAuth 리다이렉트 콜백. Access Token은 여기서만 처리되어 DB에 저장되고
// 브라우저로는 절대 전달되지 않습니다.
export async function GET(request: NextRequest) {
  // 2026-10-16 도메인 통일(SSO) 콜백: 회원 앱에 등록된 콜백(환경변수, 옛 *.vercel.app 주소)으로 돌아오면 로그인 쿠키가 없으므로
  // 같은 경로·쿼리 그대로 새 주소(https://naver-cafe-poster.buylife.xyz)로 넘겨 거기서 토큰을 교환한다. 교환 시 redirect_uri는 옛 주소 문자열 그대로라 일치 검사 통과.
  if ((request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "").endsWith(".vercel.app")) {
    return NextResponse.redirect(`https://naver-cafe-poster.buylife.xyz${request.nextUrl.pathname}${request.nextUrl.search}`, 307);
  }
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const oauthError = request.nextUrl.searchParams.get("error");

  // 연결 후 돌아갈 주소는 옛 주소 환경변수가 아닌 새 주소 기준(옛 주소 삭제 후에도 동작)
  const siteUrl = SITE_ORIGIN;

  if (oauthError || !code || !state) {
    return NextResponse.redirect(`${siteUrl}/settings?error=connect_failed`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== state) {
    return NextResponse.redirect(`${siteUrl}/login`);
  }

  const access = await checkProgramAccessApi();
  if (!access.allowed) {
    return NextResponse.redirect(`${siteUrl}/settings?error=no_access`);
  }

  // 본인 네이버 앱의 Client ID/Secret이 등록돼 있어야 토큰 교환이 가능하다 — 연결 시작 시점
  // (connectNaverAccountAction)에서 이미 확인했지만, 콜백에 직접 요청이 오는 경로(재시도 등)
  // 대비로 여기서도 한 번 더 확인한다.
  const credentials = await resolveNaverAppCredentials(supabase, user.id);
  if (!credentials) {
    return NextResponse.redirect(`${siteUrl}/settings?error=naver_app_missing`);
  }

  try {
    const token = await exchangeNaverCode(code, state, credentials.clientId, credentials.clientSecret);
    const profile = await getNaverProfile(token.access_token);

    const expiresInSeconds = Number(token.expires_in);
    const tokenExpiresAt = Number.isFinite(expiresInSeconds)
      ? new Date(Date.now() + expiresInSeconds * 1000).toISOString()
      : null;

    const { error } = await supabase.from("ncafe_accounts").upsert(
      {
        user_id: user.id,
        naver_id: profile.id,
        nickname: profile.nickname,
        access_token: token.access_token,
        refresh_token: token.refresh_token ?? null,
        token_expires_at: tokenExpiresAt,
      },
      { onConflict: "user_id" },
    );

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.redirect(`${siteUrl}/settings?connected=1`);
  } catch {
    return NextResponse.redirect(`${siteUrl}/settings?error=connect_failed`);
  }
}
