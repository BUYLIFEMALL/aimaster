import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkProgramAccessApi } from "@/lib/access";
import {
  exchangeInstagramCode,
  exchangeForLongLivedInstagramToken,
  findInstagramBusinessAccounts,
} from "@/lib/instagram/client";
import { PENDING_INSTAGRAM_CONNECTION_COOKIE, type PendingInstagramConnection } from "@/lib/instagram/pendingConnection";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// Instagram(Meta) OAuth 리다이렉트 콜백. Access Token은 여기서만 처리되고, 브라우저로는
// 절대 직접 전달되지 않습니다 (짧게 사는 httpOnly 쿠키에 담아 선택 화면으로만 넘깁니다).
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

  // 로그인만으로는 부족 — 이 프로그램 이용 권한(구독/개별부여/등급)이 없으면
  // OAuth 토큰을 저장하지 않는다 (로그인만 한 비구독자가 계정 연동까지 끝내는 것 방지).
  const access = await checkProgramAccessApi();
  if (!access.allowed) {
    return NextResponse.redirect(`${siteUrl}/accounts?error=no_access`);
  }

  try {
    const shortLived = await exchangeInstagramCode(code);
    const longLived = await exchangeForLongLivedInstagramToken(shortLived);
    const candidates = await findInstagramBusinessAccounts(longLived.accessToken);

    // Meta가 fb_exchange_token 응답에 expires_in을 안 주거나 이상한 값을 준 경우를 대비한 방어 코드.
    const DEFAULT_LONG_LIVED_TOKEN_SECONDS = 60 * 24 * 60 * 60; // Meta 공식 문서 기준 장기 토큰 수명 60일
    const expiresInSeconds =
      Number.isFinite(longLived.expiresInSeconds) && longLived.expiresInSeconds > 0
        ? longLived.expiresInSeconds
        : DEFAULT_LONG_LIVED_TOKEN_SECONDS;

    // 후보가 여러 개(또는 1개)든 항상 선택 화면을 거치게 한다 — Make의 "페이지 선택" 단계와 동일한
    // 사용자 경험. 액세스 토큰은 여기서만 잠깐 httpOnly 쿠키에 담고, 실제 DB 저장은 사용자가
    // 페이지를 확정 선택한 뒤(confirmInstagramAccountAction)에만 이뤄진다.
    const pending: PendingInstagramConnection = {
      accessToken: longLived.accessToken,
      expiresInSeconds,
      candidates,
    };

    const response = NextResponse.redirect(`${siteUrl}/accounts/select`);
    response.cookies.set(PENDING_INSTAGRAM_CONNECTION_COOKIE, JSON.stringify(pending), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600,
      path: "/",
    });
    return response;
  } catch (err) {
    // 원인 진단용: 서버 콘솔에 실제 에러를 남기고, 화면에도 메시지를 보여준다.
    // access_token 자체는 이 에러 메시지에 담기지 않으므로(우리 코드에서 던지는 Error는
    // 항상 사람이 읽을 설명 문자열) 노출 걱정 없이 그대로 보여줘도 된다.
    const message = err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.";
    console.error("[instagram/callback] 계정 연결 실패:", message);
    return NextResponse.redirect(`${siteUrl}/accounts?error=connect_failed&reason=${encodeURIComponent(message)}`);
  }
}
