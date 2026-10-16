import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkProgramAccessApi } from "@/lib/access";
import { resolveApiKey } from "@/lib/apiKeys";
import {
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  getThreadsUserProfile,
} from "@/lib/threads/client";
import { SITE_ORIGIN, THREADS_REDIRECT_FOR } from "@/lib/oauthRedirect";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// Threads OAuth 리다이렉트 콜백. Access Token은 여기서만 처리되어 DB에 저장되고
// 브라우저로는 절대 전달되지 않습니다.
export async function GET(request: NextRequest) {
  // 2026-10-16 도메인 통일(SSO) 콜백: 회원 앱에 등록된 콜백(환경변수, 옛 *.vercel.app 주소)으로 돌아오면 로그인 쿠키가 없으므로
  // 같은 경로·쿼리 그대로 새 주소(https://auto-threads-posting.buylife.xyz)로 넘겨 거기서 토큰을 교환한다. 교환 시 redirect_uri는 옛 주소 문자열 그대로라 일치 검사 통과.
  // 넘길 때 via=old를 붙여, 새 주소에서 토큰 교환 시 인증 요청에 썼던 옛 콜백 주소를 그대로 쓰게 한다(두 주소 동시 지원).
  if ((request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "").endsWith(".vercel.app")) {
    const next = new URL(`${SITE_ORIGIN}${request.nextUrl.pathname}${request.nextUrl.search}`);
    next.searchParams.set("via", "old");
    return NextResponse.redirect(next.toString(), 307);
  }
  // 새 콜백으로 바로 돌아오면 via가 없다 → 새 주소로 교환
  const redirectUri = THREADS_REDIRECT_FOR(request.nextUrl.searchParams.get("via") === "old" ? "old" : "new");
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

  // state 값에 요청 시점의 user.id를 담아 보냈으므로, 콜백에서도 동일 사용자인지 확인합니다.
  if (!user || user.id !== state) {
    return NextResponse.redirect(`${siteUrl}/login`);
  }

  // 로그인만으로는 부족 — 이 프로그램 이용 권한(구독/개별부여/등급)이 없으면
  // OAuth 토큰을 저장하지 않는다 (로그인만 한 비구독자가 계정 연동까지 끝내는 것 방지).
  const access = await checkProgramAccessApi();
  if (!access.allowed) {
    return NextResponse.redirect(`${siteUrl}/settings?error=no_access`);
  }

  try {
    // 본인 계정의 Meta App ID/Secret으로만 토큰을 교환한다 (앱 공용 키 폴백 없음).
    const appId = await resolveApiKey(supabase, user.id, "threads_app_id");
    const appSecret = await resolveApiKey(supabase, user.id, "threads_app_secret");
    if (!appId || !appSecret) {
      return NextResponse.redirect(`${siteUrl}/settings?error=meta_app_missing`);
    }

    const shortLived = await exchangeCodeForToken(code, appId, appSecret, redirectUri);
    const longLived = await exchangeForLongLivedToken(shortLived.access_token, appSecret);
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

    return NextResponse.redirect(`${siteUrl}/settings?connected=1`);
  } catch {
    return NextResponse.redirect(`${siteUrl}/settings?error=connect_failed`);
  }
}
