import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { checkProgramAccessApi, THIS_PROGRAM_SLUG } from "@/lib/access";
import { checkState, KAKAO_REDIRECT_URI, KAKAO_SCOPES, STATE_COOKIE } from "@/lib/kakao/oauth";
import { saveMemberAccount } from "@/lib/memberIntegrations";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 카카오 연결 콜백. 기준 realty-listing-alert app/api/kakao/callback/route.ts.
// 로그인 회원 + state·쿠키 일치 + 이용 권한 + 회원 본인 REST 키로 토큰 교환 후 공용 계정에 저장. 토큰은 화면으로 보내지 않는다.
const BACK = "https://coupang-ops.buylife.xyz/connect";

function back(q: string) {
  const res = NextResponse.redirect(`${BACK}?${q}#kakao-card`);
  res.cookies.set(STATE_COOKIE, "", { path: "/api/kakao", maxAge: 0 });
  return res;
}
const fail = (text: string) => back(`kakao_error=${encodeURIComponent(text)}`);

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const code = sp.get("code");
  if (sp.get("error") || !code) return fail(sp.get("error_description") || "카카오 동의가 취소됐습니다.");

  const { data: auth } = await (await createClient()).auth.getUser();
  const user = auth.user;
  if (!user) return NextResponse.redirect("https://coupang-ops.buylife.xyz/login");
  const jar = await cookies();
  if (!checkState(sp.get("state"), jar.get(STATE_COOKIE)?.value, user.id)) return fail("연결 확인값이 맞지 않습니다. 다시 시도해 주세요.");
  const access = await checkProgramAccessApi();
  if (!access.allowed) return fail("이 프로그램 이용 권한이 없습니다.");

  const db = createAdminClient();
  const key = async (provider: string) => {
    const { data } = await db.from("user_api_keys").select("api_key").eq("user_id", user.id).eq("provider", provider).maybeSingle();
    return typeof data?.api_key === "string" ? data.api_key.trim() : "";
  };
  const restApiKey = await key("kakao_rest_api_key");
  const clientSecret = await key("kakao_client_secret");
  if (!restApiKey) return fail("카카오 REST API 키를 먼저 저장해 주세요.");

  try {
    const form: Record<string, string> = { grant_type: "authorization_code", client_id: restApiKey, redirect_uri: KAKAO_REDIRECT_URI, code };
    if (clientSecret) form.client_secret = clientSecret;
    const tokRes = await fetch("https://kauth.kakao.com/oauth/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" }, body: new URLSearchParams(form).toString() });
    const tok = (await tokRes.json().catch(() => ({}))) as { access_token?: string; refresh_token?: string; expires_in?: number; refresh_token_expires_in?: number; scope?: string; error_description?: string };
    if (!tokRes.ok || !tok.access_token) throw new Error(tok.error_description || `카카오 토큰 받기 실패(${tokRes.status})`);

    const meRes = await fetch("https://kapi.kakao.com/v2/user/me", { headers: { Authorization: `Bearer ${tok.access_token}` } });
    const me = (await meRes.json().catch(() => ({}))) as { id?: number; properties?: { nickname?: string } };
    if (!meRes.ok || !me.id) throw new Error("카카오 계정 정보를 읽지 못했습니다.");

    const granted = (tok.scope || KAKAO_SCOPES.join(" ")).split(/[\s,]+/).filter(Boolean);
    const { error } = await saveMemberAccount(db, {
      userId: user.id,
      platform: "kakao",
      externalId: String(me.id),
      username: me.properties?.nickname ?? null,
      accessToken: tok.access_token,
      refreshToken: tok.refresh_token ?? null,
      tokenExpiresAt: new Date(Date.now() + (tok.expires_in ?? 21599) * 1000).toISOString(),
      refreshExpiresAt: tok.refresh_token_expires_in ? new Date(Date.now() + tok.refresh_token_expires_in * 1000).toISOString() : null,
      grantedScopes: granted,
      appRef: restApiKey,
      connectedVia: THIS_PROGRAM_SLUG,
    });
    if (error) throw new Error("연결을 저장하지 못했습니다.");
    if (!granted.includes("talk_message")) return fail("「카카오톡 메시지 전송」 동의가 빠졌습니다. 카카오 개발자 동의항목을 켜고 다시 연결해 주세요.");
    return back("kakao=connected");
  } catch (e) {
    return fail(e instanceof Error ? e.message : "카카오 연결에 실패했습니다.");
  }
}
