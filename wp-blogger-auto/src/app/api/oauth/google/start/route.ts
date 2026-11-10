import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { checkProgramAccessApi } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { getGoogleApp, authorizeUrl, OAUTH_COOKIE } from "@/lib/googleConnect";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

// 「구글 연결」 → 회원 본인 구글 앱의 동의 화면으로. 상태값은 무작위 값을 보안 쿠키와 함께 보내 콜백에서 대조한다.
export async function GET(req: Request) {
  const back = new URL("/connect", req.url);
  const access = await checkProgramAccessApi();
  if (!access.allowed) {
    back.searchParams.set("google_error", access.status === 401 ? "login" : "no_access");
    return NextResponse.redirect(back);
  }
  const app = await getGoogleApp(createAdminClient(), access.user.id);
  if (!app) {
    back.searchParams.set("google_error", "no_app");
    return NextResponse.redirect(back);
  }
  const state = randomBytes(24).toString("hex");
  const res = NextResponse.redirect(authorizeUrl(app.clientId, state));
  res.cookies.set(OAUTH_COOKIE, `${state}.${access.user.id}`, { httpOnly: true, secure: true, sameSite: "lax", path: "/api/oauth/google", maxAge: 600 });
  return res;
}
