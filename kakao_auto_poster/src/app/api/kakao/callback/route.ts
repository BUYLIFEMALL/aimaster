import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkProgramAccessApi } from "@/lib/access";
import { exchangeCodeForToken, getKakaoUserProfile } from "@/lib/kakao/client";
import { resolveKakaoAppCredentials } from "@/lib/kakao/account";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 카카오 로그인 OAuth 리다이렉트 콜백. threads/src/app/api/threads/callback/route.ts와 동일한
// 구조 — Access/Refresh Token은 여기서만 처리되어 DB에 저장되고 브라우저로는 전달되지 않는다.
export async function GET(request: NextRequest) {
  // 2026-10-15 도메인 연동(SSO): 회원이 본인 카카오 앱에 등록한 콜백은 옛 주소(kakaoautoposter.vercel.app)다. 로그인 쿠키는
  // 새 주소(.buylife.xyz)에만 있으므로, 옛 주소로 돌아온 콜백은 같은 쿼리로 새 주소에 넘겨 거기서 토큰을 교환한다.
  // 토큰 교환의 redirect_uri는 KAKAO_REDIRECT_URI(옛 주소 문자열) 그대로라 카카오의 일치 검사를 통과한다.
  if ((request.headers.get("x-forwarded-host") ?? request.headers.get("host")) === "kakaoautoposter.vercel.app") {
    return NextResponse.redirect(`https://kakao-auto-posting.buylife.xyz/api/kakao/callback${request.nextUrl.search}`, 307);
  }
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const oauthError = request.nextUrl.searchParams.get("error");

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin;

  if (oauthError || !code || !state) {
    return NextResponse.redirect(`${siteUrl}/settings?error=kakao_connect_failed`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // state 값에 요청 시점의 user.id를 담아 보냈으므로, 콜백에서도 동일 사용자인지 확인한다.
  if (!user || user.id !== state) {
    return NextResponse.redirect(`${siteUrl}/login`);
  }

  // 로그인만으로는 부족 — 이 프로그램 이용 권한(구독/개별부여/등급)이 없으면 토큰을 저장하지
  // 않는다(로그인만 한 비구독자가 계정 연동까지 끝내는 것 방지).
  const access = await checkProgramAccessApi();
  if (!access.allowed) {
    return NextResponse.redirect(`${siteUrl}/settings?error=no_access`);
  }

  // 본인 카카오 앱의 REST API 키가 등록돼 있어야 토큰 교환이 가능하다 — 연결 시작 시점
  // (connectKakaoAccountAction)에서 이미 확인했지만, 콜백에 직접 요청이 오는 경로(재시도 등)
  // 대비로 여기서도 한 번 더 확인한다.
  const credentials = await resolveKakaoAppCredentials(supabase, user.id);
  if (!credentials) {
    return NextResponse.redirect(`${siteUrl}/settings?error=kakao_app_missing`);
  }

  try {
    const token = await exchangeCodeForToken(code, credentials.restApiKey, credentials.clientSecret);
    const profile = await getKakaoUserProfile(token.access_token);

    const tokenExpiresAt = new Date(Date.now() + token.expires_in * 1000).toISOString();
    const refreshTokenExpiresAt = token.refresh_token_expires_in
      ? new Date(Date.now() + token.refresh_token_expires_in * 1000).toISOString()
      : null;

    const { error } = await supabase.from("user_kakao_accounts").upsert(
      {
        user_id: user.id,
        kakao_user_id: String(profile.id),
        nickname: profile.properties?.nickname ?? null,
        access_token: token.access_token,
        refresh_token: token.refresh_token,
        token_expires_at: tokenExpiresAt,
        refresh_token_expires_at: refreshTokenExpiresAt,
      },
      { onConflict: "user_id" },
    );

    if (error) throw new Error(error.message);

    return NextResponse.redirect(`${siteUrl}/settings?kakao_connected=1`);
  } catch {
    return NextResponse.redirect(`${siteUrl}/settings?error=kakao_connect_failed`);
  }
}
