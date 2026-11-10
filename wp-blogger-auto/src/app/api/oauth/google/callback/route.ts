import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { checkProgramAccessApi } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { completeGoogleConnect, OAUTH_COOKIE, SITE_ORIGIN } from "@/lib/googleConnect";
import { PublishError } from "@/lib/publish/types";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

function same(a: string, b: string) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

// 구글 동의 뒤 돌아오는 곳. 토큰은 서버에서만 다루고 브라우저로 보내지 않는다.
export async function GET(req: NextRequest) {
  const done = (q: Record<string, string>) => {
    const u = new URL("/connect", SITE_ORIGIN);
    for (const [k, v] of Object.entries(q)) u.searchParams.set(k, v);
    const res = NextResponse.redirect(u);
    res.cookies.set(OAUTH_COOKIE, "", { httpOnly: true, secure: true, sameSite: "lax", path: "/api/oauth/google", maxAge: 0 });
    return res;
  };
  const sp = req.nextUrl.searchParams;
  if (sp.get("error")) return done({ google_error: sp.get("error") === "access_denied" ? "denied" : "google" });
  const code = sp.get("code"), state = sp.get("state");
  const cookie = req.cookies.get(OAUTH_COOKIE)?.value ?? "";
  const [cookieState, cookieUser] = cookie.split(".");
  if (!code || !state || !cookieState || !same(state, cookieState)) return done({ google_error: "state" });

  const access = await checkProgramAccessApi();
  if (!access.allowed) return done({ google_error: access.status === 401 ? "login" : "no_access" });
  if (access.user.id !== cookieUser) return done({ google_error: "state" });

  try {
    await completeGoogleConnect(createAdminClient(), access.user.id, code);
    return done({ google: "connected" });
  } catch (e) {
    const code = e instanceof PublishError ? e.code : "server";
    return done({ google_error: code === "forbidden" ? "scope" : code === "bad_request" ? "app" : "token" });
  }
}
