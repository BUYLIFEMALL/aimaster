import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { checkProgramAccessApi } from "@/lib/access";
import { SITE_ORIGIN, authorizeUrl, getGoogleApp } from "@/lib/youtube/myChannel";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// V6 내 채널 연결 시작(v1.27): 회원 본인 구글 앱으로 동의 화면. state = 회원 id + 임의 값(쿠키로 대조, 위조 방지)
export async function GET() {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.redirect(`${SITE_ORIGIN}/my-channel?error=no_access`);
  const app = await getGoogleApp(access.user.id);
  if (!app) return NextResponse.redirect(`${SITE_ORIGIN}/my-channel?error=no_app`);
  const nonce = randomBytes(16).toString("hex");
  const res = NextResponse.redirect(authorizeUrl(app.clientId, `${access.user.id}.${nonce}`));
  res.cookies.set("yvs_mc_state", nonce, { httpOnly: true, secure: true, sameSite: "lax", path: "/api/youtube/my-channel", maxAge: 600 });
  return res;
}
