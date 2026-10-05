"use server";

import { cookies } from "next/headers";
import { checkProgramAccess } from "@/lib/access/checkProgramAccess";
import { createClient } from "@/lib/supabase/server";

const PROGRAM_SLUG = "threads-content-ops";

async function authorizedUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await checkProgramAccess(supabase, user.id, PROGRAM_SLUG)).allowed) {
    throw new Error("프로그램 이용 권한을 확인하지 못했습니다.");
  }
  return { supabase, user };
}

export async function saveMemberCredentials(input: {
  openaiKey?: string;
  threadsAppId?: string;
  threadsAppSecret?: string;
}) {
  const { supabase, user } = await authorizedUser();
  const rows = [
    ["openai", input.openaiKey],
    ["threads_app_id", input.threadsAppId],
    ["threads_app_secret", input.threadsAppSecret],
  ].filter(([, value]) => typeof value === "string" && value.trim()) as Array<[string, string]>;

  if (!rows.length) throw new Error("저장할 값을 입력해 주세요.");

  const { error } = await supabase.from("user_api_keys").upsert(
    rows.map(([provider, api_key]) => ({ user_id: user.id, provider, api_key: api_key.trim() })),
    { onConflict: "user_id,provider" },
  );
  if (error) throw new Error("연동 정보를 저장하지 못했습니다.");
}

export async function startThreadsOAuth() {
  const { supabase, user } = await authorizedUser();
  const { data, error } = await supabase
    .from("user_api_keys")
    .select("provider, api_key")
    .eq("user_id", user.id)
    .in("provider", ["threads_app_id", "threads_app_secret"]);
  if (error) throw new Error("연동 정보를 불러오지 못했습니다.");

  const appId = data?.find((row) => row.provider === "threads_app_id")?.api_key;
  const secret = data?.find((row) => row.provider === "threads_app_secret")?.api_key;
  if (!appId || !secret) throw new Error("Threads 앱 ID와 앱 시크릿을 먼저 저장해 주세요.");

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://www.buylife.xyz";
  const redirectUri = `${siteUrl}/api/threads-content-ops/callback`;
  const state = crypto.randomUUID();
  const cookieStore = await cookies();
  cookieStore.set("tco_threads_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/threads-content-ops/callback",
    maxAge: 60 * 10,
  });

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    scope: "threads_basic,threads_content_publish",
    response_type: "code",
    state,
  });
  return { authorizeUrl: `https://threads.net/oauth/authorize?${params.toString()}` };
}
