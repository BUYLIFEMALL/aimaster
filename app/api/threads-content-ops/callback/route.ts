import { NextRequest, NextResponse } from "next/server";
import { checkProgramAccess } from "@/lib/access/checkProgramAccess";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://www.buylife.xyz";
const CALLBACK_PATH = "/api/threads-content-ops/callback";

function redirectToSetup(query: string, clearState = false) {
  const response = NextResponse.redirect(`${SITE_URL}/threads-content-ops?${query}`);
  if (clearState) response.cookies.delete("tco_threads_oauth_state");
  return response;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const oauthError = request.nextUrl.searchParams.get("error");
  const stateCookie = request.cookies.get("tco_threads_oauth_state")?.value;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const hasAccess = user && (await checkProgramAccess(supabase, user.id, "threads-content-ops")).allowed;
  if (oauthError || !user || !code || !state || state !== stateCookie || !hasAccess) {
    return redirectToSetup("error=connect_failed", true);
  }

  const { data: keys, error: keyError } = await supabase
    .from("user_api_keys")
    .select("provider, api_key")
    .eq("user_id", user.id)
    .in("provider", ["threads_app_id", "threads_app_secret"]);
  const appId = keys?.find((key) => key.provider === "threads_app_id")?.api_key;
  const appSecret = keys?.find((key) => key.provider === "threads_app_secret")?.api_key;
  if (keyError || !appId || !appSecret) return redirectToSetup("error=app_missing", true);

  try {
    const redirectUri = `${SITE_URL}${CALLBACK_PATH}`;
    const form = new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code,
    });
    const tokenResponse = await fetch("https://graph.threads.net/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
      cache: "no-store",
    });
    const token = await tokenResponse.json() as { access_token?: string };
    if (!tokenResponse.ok || !token.access_token) throw new Error("short_lived_token");

    const longLivedResponse = await fetch(
      `https://graph.threads.net/access_token?${new URLSearchParams({
        grant_type: "th_exchange_token",
        client_secret: appSecret,
        access_token: token.access_token,
      })}`,
      { cache: "no-store" },
    );
    const longLived = await longLivedResponse.json() as { access_token?: string; expires_in?: number };
    if (!longLivedResponse.ok || !longLived.access_token) throw new Error("long_lived_token");

    const profileResponse = await fetch(
      `https://graph.threads.net/v1.0/me?${new URLSearchParams({
        fields: "id,username",
        access_token: longLived.access_token,
      })}`,
      { cache: "no-store" },
    );
    const profile = await profileResponse.json() as { id?: string; username?: string };
    if (!profileResponse.ok || !profile.id) throw new Error("profile");

    const tokenExpiresAt = typeof longLived.expires_in === "number"
      ? new Date(Date.now() + longLived.expires_in * 1_000).toISOString()
      : null;
    const { error } = await supabase.from("tco_threads_accounts").upsert({
      user_id: user.id,
      threads_user_id: profile.id,
      username: profile.username ?? null,
      access_token: longLived.access_token,
      token_expires_at: tokenExpiresAt,
    }, { onConflict: "user_id,threads_user_id" });
    if (error) throw error;

    return redirectToSetup("connected=1", true);
  } catch {
    return redirectToSetup("error=connect_failed", true);
  }
}
