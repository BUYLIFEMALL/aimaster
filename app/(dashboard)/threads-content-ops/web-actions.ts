"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { checkProgramAccess } from "@/lib/access/checkProgramAccess";
import { resolveApiKey } from "@/lib/apiKeys";
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

export async function generateAndSaveDraft(input: { accountId: string; topic: string }) {
  const topic = input.topic.trim();
  if (!input.accountId || !topic || topic.length > 1_200) {
    throw new Error("연결 계정과 1~1,200자 주제를 확인해 주세요.");
  }

  const { supabase, user } = await authorizedUser();
  const { data: account } = await supabase
    .from("tco_threads_accounts")
    .select("id")
    .eq("id", input.accountId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!account) throw new Error("연결된 Threads 계정을 찾지 못했습니다.");

  const apiKey = await resolveApiKey(supabase, user.id, "openai");
  if (!apiKey) throw new Error("초안 생성 전 본인의 OpenAI API 키를 저장해 주세요.");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      input: [
        { role: "developer", content: "Write one Korean Threads draft. Be concise, natural, and useful. Do not invent personal experiences or facts. Return only the post body, without a title, labels, hashtags, or quotation marks." },
        { role: "user", content: topic },
      ],
      max_output_tokens: 700,
    }),
    cache: "no-store",
  });
  const payload = await response.json().catch(() => null) as { output_text?: unknown } | null;
  const body = typeof payload?.output_text === "string" ? payload.output_text.trim() : "";
  if (!response.ok || !body || body.length > 5_000) {
    throw new Error(response.status === 401 || response.status === 403 ? "OpenAI API 키 또는 권한을 확인해 주세요." : "초안을 생성하지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
  }

  const { error } = await supabase.from("tco_posts").insert({
    user_id: user.id,
    account_id: account.id,
    body,
    status: "draft",
  });
  if (error) throw new Error("생성한 초안을 저장하지 못했습니다.");
  revalidatePath("/threads-content-ops");
}
