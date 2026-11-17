// E4 1단계(WS-20261117-25) 구글 동의 뒤 돌아오는 곳. 기준: ../../google-calendar/callback/route.ts
// 토큰은 서버에서만 다루고 브라우저·로그로 보내지 않는다. 기능이 꺼져 있으면 회원 확인·DB·구글 호출 전에 돌려보냄.
import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { checkProgramAccessApi } from "@/lib/access";
import { completeGmailConnect, gmailEnabled, GmailError, GMAIL_COOKIE_PATH, GMAIL_OAUTH_COOKIE } from "@/server/gmailInbox";
import { SITE_ORIGIN } from "@/server/googleCalendar";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

function same(a: string, b: string) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export async function GET(req: NextRequest) {
  const done = (q: Record<string, string>) => {
    const u = new URL("/inbox", SITE_ORIGIN);
    for (const [k, v] of Object.entries(q)) u.searchParams.set(k, v);
    const res = NextResponse.redirect(u);
    res.cookies.set(GMAIL_OAUTH_COOKIE, "", { httpOnly: true, secure: true, sameSite: "lax", path: GMAIL_COOKIE_PATH, maxAge: 0 });
    return res;
  };
  if (!gmailEnabled()) return done({ gmail_error: "off" });
  const sp = req.nextUrl.searchParams;
  if (sp.get("error")) return done({ gmail_error: sp.get("error") === "access_denied" ? "denied" : "google" });
  const code = sp.get("code"), state = sp.get("state");
  const [cookieState, cookieUser, cookieApp] = (req.cookies.get(GMAIL_OAUTH_COOKIE)?.value ?? "").split(".");
  if (!code || !state || !cookieState || !cookieUser || !cookieApp || !same(state, cookieState)) return done({ gmail_error: "state" });
  const access = await checkProgramAccessApi();
  if (!access.allowed) return done({ gmail_error: access.status === 401 ? "login" : "no_access" });
  if (access.user.id !== cookieUser) return done({ gmail_error: "state" });
  try {
    await completeGmailConnect(access.user.id, code, cookieApp);
    return done({ gmail: "connected" });
  } catch (e) {
    const c = e instanceof GmailError ? e.code : "server";
    return done({ gmail_error: c === "forbidden" ? "scope" : c === "conflict" ? "other_account" : c === "bad_request" ? "app" : "token" });
  }
}
