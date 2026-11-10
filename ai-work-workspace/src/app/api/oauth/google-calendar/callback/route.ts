// 구글 캘린더 연동 ② 구글 동의 뒤 돌아오는 곳(2026-11-11). 토큰은 서버에서만 다루고 브라우저로 보내지 않는다.
// 기준: wp-blogger-auto/src/app/api/oauth/google/callback/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { checkProgramAccessApi } from "@/lib/access";
import { completeGoogleConnect, GcalError, OAUTH_COOKIE, SITE_ORIGIN } from "@/server/googleCalendar";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

function same(a: string, b: string) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export async function GET(req: NextRequest) {
  const done = (q: Record<string, string>) => {
    const u = new URL("/calendar-sync", SITE_ORIGIN);
    for (const [k, v] of Object.entries(q)) u.searchParams.set(k, v);
    const res = NextResponse.redirect(u);
    res.cookies.set(OAUTH_COOKIE, "", { httpOnly: true, secure: true, sameSite: "lax", path: "/api/oauth/google-calendar", maxAge: 0 });
    return res;
  };
  const sp = req.nextUrl.searchParams;
  if (sp.get("error")) return done({ google_error: sp.get("error") === "access_denied" ? "denied" : "google" });
  const code = sp.get("code"), state = sp.get("state");
  const [cookieState, cookieUser] = (req.cookies.get(OAUTH_COOKIE)?.value ?? "").split(".");
  if (!code || !state || !cookieState || !same(state, cookieState)) return done({ google_error: "state" });
  const access = await checkProgramAccessApi();
  if (!access.allowed) return done({ google_error: access.status === 401 ? "login" : "no_access" });
  if (access.user.id !== cookieUser) return done({ google_error: "state" });
  try {
    await completeGoogleConnect(access.user.id, code);
    return done({ google: "connected" });
  } catch (e) {
    const c = e instanceof GcalError ? e.code : "server";
    return done({ google_error: c === "forbidden" ? "scope" : c === "bad_request" ? "app" : "token" });
  }
}
