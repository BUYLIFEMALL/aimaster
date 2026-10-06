"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { checkProgramAccess } from "@/lib/access/checkProgramAccess";
import { resolveApiKey } from "@/lib/apiKeys";
import { createClient } from "@/lib/supabase/server";
import { THREADS_CONTENT_OPS_CALLBACK_URI } from "@/threads-content-ops/lib/oauth";

const PROGRAM_SLUG = "threads-content-ops";
const CREDENTIAL_PROVIDERS = new Set([
  "openai",
  "youtube_api_key",
  "coupang_access_key",
  "coupang_secret_key",
  "threads_app_id",
  "threads_app_secret",
]);

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
  youtubeApiKey?: string;
  coupangAccessKey?: string;
  coupangSecretKey?: string;
  threadsAppId?: string;
  threadsAppSecret?: string;
}) {
  const { supabase, user } = await authorizedUser();
  const rows = [
    ["openai", input.openaiKey],
    ["youtube_api_key", input.youtubeApiKey],
    ["coupang_access_key", input.coupangAccessKey],
    ["coupang_secret_key", input.coupangSecretKey],
    ["threads_app_id", input.threadsAppId],
    ["threads_app_secret", input.threadsAppSecret],
  ].filter(([, value]) => typeof value === "string" && value.trim()) as Array<[string, string]>;

  if (!rows.length) throw new Error("저장할 값을 입력해 주세요.");

  const { error } = await supabase.from("user_api_keys").upsert(
    rows.map(([provider, api_key]) => ({ user_id: user.id, provider, api_key: api_key.trim() })),
    { onConflict: "user_id,provider" },
  );
  if (error) throw new Error("연동 정보를 저장하지 못했습니다.");
  revalidatePath("/threads-content-ops");
}

export async function deleteMemberCredential(provider: string) {
  if (!CREDENTIAL_PROVIDERS.has(provider)) throw new Error("지원하지 않는 연동 정보입니다.");
  const { supabase, user } = await authorizedUser();
  const { error } = await supabase
    .from("user_api_keys")
    .delete()
    .eq("user_id", user.id)
    .eq("provider", provider);
  if (error) throw new Error("연동 정보를 삭제하지 못했습니다.");
  revalidatePath("/threads-content-ops");
}

export async function disconnectThreadsAccount(accountId: string) {
  if (!accountId) throw new Error("연결 해제할 Threads 계정을 확인해 주세요.");
  const { supabase, user } = await authorizedUser();
  const { error } = await supabase
    .from("tco_threads_accounts")
    .delete()
    .eq("user_id", user.id)
    .eq("id", accountId);
  if (error) throw new Error("Threads 계정 연결을 해제하지 못했습니다.");
  revalidatePath("/threads-content-ops");
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
    redirect_uri: THREADS_CONTENT_OPS_CALLBACK_URI,
    scope: "threads_basic,threads_content_publish",
    response_type: "code",
    state,
  });
  return { authorizeUrl: `https://threads.net/oauth/authorize?${params.toString()}` };
}

async function generateAndSaveDraftInternal(input: { accountId: string; topic: string }) {
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

// Server Actions render an error boundary for expected provider failures when
// they throw. Return a user-safe result instead, while keeping unexpected
// failures contained on the server.
export async function generateAndSaveDraft(input: { accountId: string; topic: string }) {
  try {
    await generateAndSaveDraftInternal(input);
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "초안을 생성하지 못했습니다. 잠시 뒤 다시 시도해 주세요." };
  }
}

export async function saveDraft(input: { draftId: string; body: string }) {
  const body = input.body.trim();
  if (!input.draftId || !body || body.length > 5_000) throw new Error("초안은 1~5,000자로 입력해 주세요.");
  const { supabase, user } = await authorizedUser();
  const { error } = await supabase.from("tco_posts")
    .update({ body })
    .eq("id", input.draftId)
    .eq("user_id", user.id)
    .eq("status", "draft");
  if (error) throw new Error("초안을 저장하지 못했습니다.");
  revalidatePath("/threads-content-ops");
}

export async function publishDraft(draftId: string) {
  const { supabase, user } = await authorizedUser();
  const { data: draft } = await supabase.from("tco_posts")
    .select("id, body, account_id")
    .eq("id", draftId).eq("user_id", user.id).eq("status", "draft").maybeSingle();
  if (!draft) throw new Error("발행할 초안을 찾지 못했습니다.");
  const { data: account } = await supabase.from("tco_threads_accounts")
    .select("id, threads_user_id, access_token, token_expires_at")
    .eq("id", draft.account_id).eq("user_id", user.id).maybeSingle();
  if (!account) throw new Error("연결된 Threads 계정을 찾지 못했습니다.");
  if (account.token_expires_at && new Date(account.token_expires_at) <= new Date()) throw new Error("Threads 연결 토큰이 만료되었습니다. 계정을 다시 연결해 주세요.");

  await supabase.from("tco_posts").update({ status: "publishing", error_message: null }).eq("id", draft.id).eq("user_id", user.id);
  try {
    const createResponse = await fetch(`https://graph.threads.net/v1.0/${account.threads_user_id}/threads`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ media_type: "TEXT", text: draft.body, access_token: account.access_token }),
      cache: "no-store",
    });
    const container = await createResponse.json() as { id?: string };
    if (!createResponse.ok || !container.id) throw new Error("Threads 게시물을 만들지 못했습니다.");
    const publishResponse = await fetch(`https://graph.threads.net/v1.0/${account.threads_user_id}/threads_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ creation_id: container.id, access_token: account.access_token }),
      cache: "no-store",
    });
    const published = await publishResponse.json() as { id?: string; permalink?: string };
    if (!publishResponse.ok || !published.id) throw new Error("Threads 게시물 발행에 실패했습니다.");
    const { error } = await supabase.from("tco_posts").update({ status: "published", published_at: new Date().toISOString(), threads_post_id: published.id, permalink: published.permalink ?? null }).eq("id", draft.id).eq("user_id", user.id);
    if (error) throw error;
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 500) : "발행 중 알 수 없는 오류가 발생했습니다.";
    await supabase.from("tco_posts").update({ status: "failed", error_message: message }).eq("id", draft.id).eq("user_id", user.id);
    throw new Error(message);
  }
  revalidatePath("/threads-content-ops");
}

/**
 * The table already has a per-member scheduled queue.  Keep all queue changes
 * on the server so a browser cannot schedule or cancel another member's post.
 * An unattended worker will consume only these server-owned queue records;
 * the browser never gets authority to publish another member's content.
 */
export async function scheduleDraft(input: { draftId: string; scheduledAt: string }) {
  const scheduledAt = new Date(input.scheduledAt);
  const now = Date.now();
  if (!input.draftId || Number.isNaN(scheduledAt.getTime()) || scheduledAt.getTime() < now + 5 * 60_000) {
    throw new Error("예약 시간은 현재로부터 5분 이후로 지정해 주세요.");
  }
  if (scheduledAt.getTime() > now + 180 * 24 * 60 * 60_000) {
    throw new Error("예약은 180일 이내의 시간만 지정할 수 있습니다.");
  }

  const { supabase, user } = await authorizedUser();
  const { data, error } = await supabase.from("tco_posts")
    .update({ status: "scheduled", scheduled_at: scheduledAt.toISOString(), error_message: null })
    .eq("id", input.draftId)
    .eq("user_id", user.id)
    .eq("status", "draft")
    .select("id")
    .maybeSingle();
  if (error || !data) throw new Error("예약할 수 있는 초안을 찾지 못했습니다. 새로고침 후 다시 시도해 주세요.");
  revalidatePath("/threads-content-ops");
}

export async function cancelScheduledDraft(draftId: string) {
  const { supabase, user } = await authorizedUser();
  const { data, error } = await supabase.from("tco_posts")
    .update({ status: "draft", scheduled_at: null })
    .eq("id", draftId)
    .eq("user_id", user.id)
    .eq("status", "scheduled")
    .select("id")
    .maybeSingle();
  if (error || !data) throw new Error("취소할 예약을 찾지 못했습니다. 새로고침 후 다시 시도해 주세요.");
  revalidatePath("/threads-content-ops");
}

export async function retryFailedDraft(draftId: string) {
  const { supabase, user } = await authorizedUser();
  const { data, error } = await supabase.from("tco_posts")
    .update({ status: "draft", scheduled_at: null, error_message: null })
    .eq("id", draftId)
    .eq("user_id", user.id)
    .eq("status", "failed")
    .select("id")
    .maybeSingle();
  if (error || !data) throw new Error("재시도할 실패 기록을 찾지 못했습니다. 새로고침 후 다시 시도해 주세요.");
  revalidatePath("/threads-content-ops");
}

function parseYouTubeVideoId(rawUrl: string) {
  try {
    const url = new URL(rawUrl.trim());
    if (url.hostname === "youtu.be") return url.pathname.split("/").filter(Boolean)[0] ?? null;
    if (url.hostname.endsWith("youtube.com")) {
      if (url.pathname === "/watch") return url.searchParams.get("v");
      const [kind, id] = url.pathname.split("/").filter(Boolean);
      if (["shorts", "embed", "live"].includes(kind)) return id ?? null;
    }
  } catch {
    return null;
  }
  return null;
}

export async function loadYouTubeSource(rawUrl: string) {
  const videoId = parseYouTubeVideoId(rawUrl);
  if (!videoId || !/^[A-Za-z0-9_-]{6,20}$/.test(videoId)) {
    throw new Error("YouTube 동영상 주소를 확인해 주세요.");
  }

  const { supabase, user } = await authorizedUser();
  const apiKey = await resolveApiKey(supabase, user.id, "youtube_api_key");
  if (!apiKey) throw new Error("YouTube 소재를 가져오려면 본인의 YouTube Data API 키를 먼저 등록해 주세요.");

  const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?${new URLSearchParams({
    part: "snippet",
    id: videoId,
    key: apiKey,
  })}`, { cache: "no-store" });
  const payload = await response.json().catch(() => null) as {
    items?: Array<{ snippet?: { title?: string; description?: string; channelTitle?: string; publishedAt?: string } }>;
  } | null;
  const snippet = payload?.items?.[0]?.snippet;
  if (!response.ok || !snippet?.title) {
    throw new Error(response.status === 403 ? "YouTube API 키 또는 할당량을 확인해 주세요." : "동영상 정보를 찾지 못했습니다. 공개된 동영상 주소인지 확인해 주세요.");
  }

  const description = (snippet.description ?? "").replace(/\s+/g, " ").trim().slice(0, 3_000);
  return {
    title: snippet.title.slice(0, 300),
    channelTitle: (snippet.channelTitle ?? "").slice(0, 200),
    publishedAt: snippet.publishedAt ?? null,
    sourceUrl: `https://www.youtube.com/watch?v=${videoId}`,
    prompt: [
      "다음 YouTube 영상의 공개 메타데이터를 바탕으로, 사실을 과장하거나 영상에 없는 경험을 지어내지 않는 한국어 Threads 초안을 작성해 주세요.",
      `영상 제목: ${snippet.title}`,
      snippet.channelTitle ? `채널: ${snippet.channelTitle}` : "",
      description ? `영상 설명: ${description}` : "",
      `출처 링크: https://www.youtube.com/watch?v=${videoId}`,
    ].filter(Boolean).join("\n"),
  };
}
