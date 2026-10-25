import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { checkProgramAccessApi, getSessionUser, PROGRAM_SLUG } from "@/lib/access";
import { createServiceClient } from "@/lib/supabase/service";
import { saveMemberAccount } from "@/lib/memberIntegrations";
import { checkState, KAKAO_REDIRECT_URI, KAKAO_SCOPES, STATE_COOKIE } from "@/lib/kakaoOAuth";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 카카오 바로 연결 콜백(2026-10-25, v1.17). 기준: kakao_auto_poster src/app/api/kakao/callback/route.ts.
// ① 로그인 회원 ② state = 쿠키 = 그 회원 ③ 프로그램 이용 권한 ④ 회원 본인 REST 키로 토큰 교환 ⑤ 공용 연결 계정(member_platform_accounts kakao)에 저장
// — 「카카오 자동화」도 같은 앱이면 이 연결을 그대로 쓴다. 토큰은 서버에만, 화면으로 보내지 않는다.
const BACK = "https://realty-listing-alert.buylife.xyz/delivery";

function back(q: string) {
  const res = NextResponse.redirect(`${BACK}?${q}#kakao-card`);
  res.cookies.set(STATE_COOKIE, "", { path: "/api/kakao", maxAge: 0 });
  return res;
}

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const code = sp.get("code");
  const state = sp.get("state");
  if (sp.get("error") || !code) return back(`kakao_error=${encodeURIComponent(sp.get("error_description") || "카카오 동의가 취소됐어요.")}`);

  const user = await getSessionUser();
  if (!user) return NextResponse.redirect("https://realty-listing-alert.buylife.xyz/login");
  const jar = await cookies();
  if (!checkState(state, jar.get(STATE_COOKIE)?.value, user.id)) return back("kakao_error=" + encodeURIComponent("연결 확인값이 맞지 않아요. 「카카오 연결하기」를 다시 눌러 주세요."));
  const access = await checkProgramAccessApi();
  if (!access.allowed) return back("kakao_error=" + encodeURIComponent("이 프로그램 이용 권한이 없어요."));

  const db = createServiceClient();
  const key = async (provider: string) => {
    const { data } = await db.from("user_api_keys").select("api_key").eq("user_id", user.id).eq("provider", provider).maybeSingle();
    return typeof data?.api_key === "string" ? data.api_key.trim() : "";
  };
  const restApiKey = await key("kakao_rest_api_key");
  const clientSecret = await key("kakao_client_secret");
  if (!restApiKey) return back("kakao_error=" + encodeURIComponent("카카오 REST API 키를 먼저 저장해 주세요."));

  try {
    const form: Record<string, string> = { grant_type: "authorization_code", client_id: restApiKey, redirect_uri: KAKAO_REDIRECT_URI, code };
    if (clientSecret) form.client_secret = clientSecret;
    const tokRes = await fetch("https://kauth.kakao.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
      body: new URLSearchParams(form).toString(),
    });
    const tok = (await tokRes.json().catch(() => ({}))) as { access_token?: string; refresh_token?: string; expires_in?: number; refresh_token_expires_in?: number; scope?: string; error_description?: string; error_code?: string };
    if (!tokRes.ok || !tok.access_token) throw new Error(tok.error_description || `카카오 토큰 받기 실패(${tokRes.status})`);

    const meRes = await fetch("https://kapi.kakao.com/v2/user/me", { headers: { Authorization: `Bearer ${tok.access_token}` } });
    const me = (await meRes.json().catch(() => ({}))) as { id?: number; properties?: { nickname?: string } };
    if (!meRes.ok || !me.id) throw new Error("카카오 계정 정보를 읽지 못했어요.");

    // 이번에 받은 권한만 적는다(공용 규칙) — 「카카오톡 메시지 전송」에 동의하지 않았으면 talk_message가 빠져 카톡 받기가 「다시 연결」로 보인다
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
      connectedVia: PROGRAM_SLUG,
    });
    if (error) throw new Error(`저장 실패: ${error}`);
    if (!granted.includes("talk_message")) return back("kakao_error=" + encodeURIComponent("「카카오톡 메시지 전송」 동의가 빠졌어요. 카카오 개발자 동의항목에서 켠 뒤 다시 연결해 주세요."));
    return back("kakao=connected");
  } catch (e) {
    return back("kakao_error=" + encodeURIComponent(e instanceof Error ? e.message : "카카오 연결에 실패했어요."));
  }
}
