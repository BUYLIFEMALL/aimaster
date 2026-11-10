import { NextRequest, NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { MyChannelError, SITE_ORIGIN, completeConnect } from "@/lib/youtube/myChannel";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// V6 내 채널 연결 콜백(v1.27): 토큰은 서버에서만 교환·저장하고 화면으로 보내지 않는다.
export async function GET(request: NextRequest) {
  const back = (q: string) => {
    const res = NextResponse.redirect(`${SITE_ORIGIN}/my-channel?${q}`);
    res.cookies.set("yvs_mc_state", "", { path: "/api/youtube/my-channel", maxAge: 0 });
    return res;
  };
  const sp = request.nextUrl.searchParams;
  const code = sp.get("code"), state = sp.get("state") ?? "";
  if (sp.get("error") || !code) return back("error=denied");
  const access = await checkProgramAccessApi();
  if (!access.allowed) return back("error=no_access");
  const [uid, nonce] = state.split(".");
  const cookieNonce = request.cookies.get("yvs_mc_state")?.value;
  if (uid !== access.user.id || !nonce || nonce !== cookieNonce) return back("error=state");
  try {
    await completeConnect(access.user.id, code);
    return back("connected=1");
  } catch (e) {
    return back(`error=${e instanceof MyChannelError ? e.code : "google"}`);
  }
}
