// E4 1단계(WS-20261117-25) 「Gmail 연결」 → 회원 본인 구글 앱 동의 화면. 기준: ../../google-calendar/start/route.ts
// 기능이 꺼져 있으면 회원 확인·DB·구글 호출 전에 돌려보냄. 쿠키 = state.회원.앱표식(콜백에서 셋 다 대조).
import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { gmailEnabled, GmailError, GMAIL_COOKIE_PATH, GMAIL_OAUTH_COOKIE, startGmailConnect } from "@/server/gmailInbox";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const back = new URL("/inbox", req.url);
  if (!gmailEnabled()) {
    back.searchParams.set("gmail_error", "off");
    return NextResponse.redirect(back);
  }
  const access = await checkProgramAccessApi();
  if (!access.allowed) {
    back.searchParams.set("gmail_error", access.status === 401 ? "login" : "no_access");
    return NextResponse.redirect(back);
  }
  try {
    const { url, cookie } = await startGmailConnect(access.user.id);
    const res = NextResponse.redirect(url);
    res.cookies.set(GMAIL_OAUTH_COOKIE, cookie, { httpOnly: true, secure: true, sameSite: "lax", path: GMAIL_COOKIE_PATH, maxAge: 600 });
    return res;
  } catch (e) {
    back.searchParams.set("gmail_error", e instanceof GmailError && e.code === "bad_request" ? "no_app" : "server");
    return NextResponse.redirect(back);
  }
}
