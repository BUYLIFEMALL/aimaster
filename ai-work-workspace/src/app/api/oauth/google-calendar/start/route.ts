// 구글 캘린더 연동 ② 「구글 연결」(2026-11-11) → 회원 본인 구글 앱 동의 화면. 상태값은 보안 쿠키와 함께 보내 콜백에서 대조.
// 기준: wp-blogger-auto/src/app/api/oauth/google/start/route.ts
import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { checkProgramAccessApi } from "@/lib/access";
import { authorizeUrl, getGoogleApp, OAUTH_COOKIE } from "@/server/googleCalendar";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const back = new URL("/calendar-sync", req.url);
  const access = await checkProgramAccessApi();
  if (!access.allowed) {
    back.searchParams.set("google_error", access.status === 401 ? "login" : "no_access");
    return NextResponse.redirect(back);
  }
  const app = await getGoogleApp(access.user.id);
  if (!app) {
    back.searchParams.set("google_error", "no_app");
    return NextResponse.redirect(back);
  }
  const state = randomBytes(24).toString("hex");
  const res = NextResponse.redirect(authorizeUrl(app.clientId, state));
  res.cookies.set(OAUTH_COOKIE, `${state}.${access.user.id}`, { httpOnly: true, secure: true, sameSite: "lax", path: "/api/oauth/google-calendar", maxAge: 600 });
  return res;
}
