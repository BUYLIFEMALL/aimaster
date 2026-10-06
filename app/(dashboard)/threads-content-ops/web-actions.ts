"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { checkProgramAccess } from "@/lib/access/checkProgramAccess";
import { resolveApiKey } from "@/lib/apiKeys";
import { createClient } from "@/lib/supabase/server";
import { THREADS_CONTENT_OPS_CALLBACK_URI } from "@/threads-content-ops/lib/oauth";
import {
  extractArticleLinks,
  extractMainText,
  fetchPublicHtml,
  pickRandom,
  rewriteToScrapableListingUrl,
  searchPerplexityTrending,
  structureCandidates,
  type ViralCandidateDraft,
} from "@/threads-content-ops/lib/collector";
import { generateAttentionPlan, rewriteAttentionPost, type AttentionPlan } from "@/threads-content-ops/lib/attention";
import { DEFAULT_ENGINE, PERSONAS, REWRITE_MODES, isKnownEngine, type RewriteMode } from "@/threads-content-ops/lib/personas";
import { analyzeShortForThreads } from "@/threads-content-ops/lib/shortsAnalysis";
import {
  YouTubeSearchError,
  fetchShortContext,
  searchYoutubeShorts,
  type ShortVideo,
  type ShortsOrder,
} from "@/threads-content-ops/lib/youtubeShorts";
import {
  COUPANG_LINK_MESSAGES,
  checkCoupangAffiliateLink,
  isCoupangImageUrl,
  searchCoupangProducts,
  type CoupangProduct,
} from "@/threads-content-ops/lib/coupang";

const PROGRAM_SLUG = "threads-content-ops";
const CREDENTIAL_PROVIDERS = new Set([
  "openai",
  "youtube_api_key",
  "perplexity",
  "gemini",
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
  perplexityKey?: string;
  geminiKey?: string;
  coupangAccessKey?: string;
  coupangSecretKey?: string;
  threadsAppId?: string;
  threadsAppSecret?: string;
}) {
  const { supabase, user } = await authorizedUser();
  const rows = [
    ["openai", input.openaiKey],
    ["youtube_api_key", input.youtubeApiKey],
    ["perplexity", input.perplexityKey],
    ["gemini", input.geminiKey],
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

export async function saveOperationProfile(input: {
  accountId: string;
  topic: string;
  personality: string;
  tone: string;
  targetAudience: string;
  forbiddenTopics: string;
  forbiddenExpressions: string;
  dailyRatio: number;
  promotionalRatio: number;
  dailyPostTarget: number;
  commentCheckIntervalMinutes: number;
  operatingStart: string;
  operatingEnd: string;
  automationEnabled: boolean;
}) {
  const { supabase, user } = await authorizedUser();
  const accountId = input.accountId.trim();
  if (!accountId) throw new Error("운영 정보를 저장할 Threads 계정을 선택해 주세요.");
  const numeric = [input.dailyRatio, input.promotionalRatio, input.dailyPostTarget, input.commentCheckIntervalMinutes];
  if (numeric.some((value) => !Number.isInteger(value))) throw new Error("운영 비율과 목표값은 정수로 입력해 주세요.");
  if (input.dailyRatio < 0 || input.dailyRatio > 100 || input.promotionalRatio < 0 || input.promotionalRatio > 100 || input.dailyPostTarget < 0 || input.dailyPostTarget > 50 || input.commentCheckIntervalMinutes < 5 || input.commentCheckIntervalMinutes > 1440) {
    throw new Error("운영 비율(0~100), 하루 게시 목표(0~50), 댓글 확인 주기(5~1,440분)를 확인해 주세요.");
  }
  const textFields = [input.topic, input.personality, input.tone, input.targetAudience, input.forbiddenTopics, input.forbiddenExpressions];
  if (textFields.some((value) => value.length > 2_000)) throw new Error("운영 정보 항목은 각각 2,000자 이내로 입력해 주세요.");
  if ((input.operatingStart && !/^\d{2}:\d{2}$/.test(input.operatingStart)) || (input.operatingEnd && !/^\d{2}:\d{2}$/.test(input.operatingEnd))) {
    throw new Error("운영 시간 형식을 확인해 주세요.");
  }

  const { data: account } = await supabase.from("tco_threads_accounts")
    .select("id")
    .eq("id", accountId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!account) throw new Error("내가 연결한 Threads 계정을 찾지 못했습니다.");

  const { error } = await supabase.from("tco_operation_profiles").upsert({
    user_id: user.id,
    account_id: accountId,
    topic: input.topic.trim(),
    personality: input.personality.trim(),
    tone: input.tone.trim(),
    target_audience: input.targetAudience.trim(),
    forbidden_topics: input.forbiddenTopics.trim(),
    forbidden_expressions: input.forbiddenExpressions.trim(),
    daily_ratio: input.dailyRatio,
    promotional_ratio: input.promotionalRatio,
    daily_post_target: input.dailyPostTarget,
    comment_check_interval_minutes: input.commentCheckIntervalMinutes,
    operating_start: input.operatingStart || null,
    operating_end: input.operatingEnd || null,
    automation_enabled: input.automationEnabled,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,account_id" });
  if (error) throw new Error("계정별 운영 정보를 저장하지 못했습니다.");
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
  const payload = await response.json().catch(() => null) as { output_text?: unknown; output?: Array<{ content?: Array<{ type?: string; text?: string }> }>; error?: { message?: string; code?: string } } | null;
  const fallbackText = payload?.output?.flatMap((item) => item.content ?? []).filter((part) => part.type === "output_text").map((part) => part.text ?? "").join("").trim();
  const body = typeof payload?.output_text === "string" ? payload.output_text.trim() : fallbackText ?? "";
  if (!response.ok || !body || body.length > 5_000) {
    if (response.status === 401 || response.status === 403) throw new Error("OpenAI API 키 또는 해당 모델 사용 권한을 확인해 주세요.");
    if (response.status === 429) throw new Error("OpenAI API 할당량 또는 분당 요청 한도에 도달했습니다. OpenAI 결제·사용 한도 후 다시 시도해 주세요.");
    if (!response.ok) throw new Error("OpenAI가 초안 요청을 처리하지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
    throw new Error("OpenAI 응답에서 초안 본문을 읽지 못했습니다. 같은 요청을 한 번 더 시도해 주세요.");
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

// ---------------------------------------------------------------------------
// 콘텐츠 소스 큐 (v1.28) — 회원이 직접 등록한 포스팅 상품(쿠팡·네이버 브랜드 커넥트). 블로그 등록은 v1.32에서 제거(주인님 지시).
// 이 단계에서는 외부 수집/크롤링을 하지 않고, 회원이 입력한 값만 본인 계정에 저장한다.
// 예상된 오류는 throw하지 않고 결과 객체로 돌려준다(운영 서버에서 Server Action의 throw 메시지가 가려지기 때문).
// ---------------------------------------------------------------------------
const SOURCE_TYPES = ["coupang", "naver_brand_connect"];
const SOURCE_STATUSES = ["ready", "used", "archived"];
const MAX_SOURCES_PER_USER = 200;

type SourceResult = { ok: true } | { ok: false; error: string };

function normalizeSourceUrl(raw: string): string {
  const text = raw.trim();
  if (!text || text.length > 2_000) throw new Error("링크는 1~2,000자로 입력해 주세요.");
  let url: URL;
  try { url = new URL(text); } catch { throw new Error("링크 형식을 확인해 주세요. https://로 시작하는 전체 주소를 입력해야 합니다."); }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("http 또는 https 링크만 등록할 수 있습니다.");
  if (url.username || url.password) throw new Error("로그인 정보가 포함된 링크는 등록할 수 없습니다.");
  return url.href;
}

function checkSourceText(title: string, summary: string) {
  if (!title.trim() || title.trim().length > 200) throw new Error("제목은 1~200자로 입력해 주세요.");
  if (summary.length > 1_000) throw new Error("메모는 1,000자 이내로 입력해 주세요.");
}

function sourceFailure(error: unknown, fallback: string): SourceResult {
  return { ok: false, error: error instanceof Error ? error.message : fallback };
}

/** 쿠팡 소스는 수수료가 잡히는 제휴 추적 링크만 허용한다(일반 쇼핑 주소는 수수료 0). */
function assertCoupangAffiliateUrl(url: string) {
  const check = checkCoupangAffiliateLink(url);
  if (!check.ok) throw new Error(COUPANG_LINK_MESSAGES[check.reason]);
}

/** 계정 소유 확인 → 개수 제한 → 중복 확인 → 저장. 직접 등록과 쿠팡 검색 결과 저장이 함께 쓴다. */
async function insertContentSource(
  supabase: Awaited<ReturnType<typeof authorizedUser>>["supabase"],
  userId: string,
  input: { accountId: string; sourceType: string; title: string; sourceUrl: string; summary: string; metadata?: Record<string, unknown> },
) {
  const { data: account } = await supabase.from("tco_threads_accounts")
    .select("id").eq("id", input.accountId).eq("user_id", userId).maybeSingle();
  if (!account) throw new Error("내가 연결한 Threads 계정을 찾지 못했습니다.");

  const { count } = await supabase.from("tco_content_sources")
    .select("id", { count: "exact", head: true }).eq("user_id", userId);
  if ((count ?? 0) >= MAX_SOURCES_PER_USER) throw new Error(`소스는 최대 ${MAX_SOURCES_PER_USER}건까지 등록할 수 있습니다. 사용한 소스를 삭제해 주세요.`);

  const { data: duplicate } = await supabase.from("tco_content_sources")
    .select("id").eq("user_id", userId).eq("account_id", account.id).eq("source_url", input.sourceUrl).maybeSingle();
  if (duplicate) throw new Error("이 계정에 이미 같은 링크가 등록되어 있습니다.");

  const { error } = await supabase.from("tco_content_sources").insert({
    user_id: userId,
    account_id: account.id,
    source_type: input.sourceType,
    title: input.title.trim(),
    source_url: input.sourceUrl,
    summary: input.summary.trim(),
    metadata: input.metadata ?? {},
    status: "ready",
  });
  if (error) throw new Error("소스를 저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
}

export async function createContentSource(input: {
  accountId: string;
  sourceType: string;
  title: string;
  sourceUrl: string;
  summary: string;
}): Promise<SourceResult> {
  try {
    if (!SOURCE_TYPES.includes(input.sourceType)) throw new Error("지원하지 않는 소스 종류입니다.");
    checkSourceText(input.title, input.summary);
    const sourceUrl = normalizeSourceUrl(input.sourceUrl);
    if (input.sourceType === "coupang") assertCoupangAffiliateUrl(sourceUrl);
    const { supabase, user } = await authorizedUser();
    await insertContentSource(supabase, user.id, { ...input, sourceUrl });
    revalidatePath("/threads-content-ops");
    return { ok: true };
  } catch (error) {
    return sourceFailure(error, "소스를 등록하지 못했습니다.");
  }
}

export async function updateContentSource(input: {
  id: string;
  title: string;
  sourceUrl: string;
  summary: string;
}): Promise<SourceResult> {
  try {
    checkSourceText(input.title, input.summary);
    const sourceUrl = normalizeSourceUrl(input.sourceUrl);
    const { supabase, user } = await authorizedUser();

    const { data: current } = await supabase.from("tco_content_sources")
      .select("id, account_id, source_type").eq("id", input.id).eq("user_id", user.id).maybeSingle();
    if (!current) throw new Error("수정할 소스를 찾지 못했습니다. 새로고침 후 다시 시도해 주세요.");
    if (current.source_type === "coupang") assertCoupangAffiliateUrl(sourceUrl);

    const { data: duplicate } = await supabase.from("tco_content_sources")
      .select("id").eq("user_id", user.id).eq("account_id", current.account_id).eq("source_url", sourceUrl).neq("id", current.id).maybeSingle();
    if (duplicate) throw new Error("이 계정에 이미 같은 링크가 등록되어 있습니다.");

    const { error } = await supabase.from("tco_content_sources")
      .update({ title: input.title.trim(), source_url: sourceUrl, summary: input.summary.trim(), updated_at: new Date().toISOString() })
      .eq("id", current.id).eq("user_id", user.id);
    if (error) throw new Error("소스를 수정하지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
    revalidatePath("/threads-content-ops");
    return { ok: true };
  } catch (error) {
    return sourceFailure(error, "소스를 수정하지 못했습니다.");
  }
}

export async function setContentSourceStatus(input: { id: string; status: string }): Promise<SourceResult> {
  try {
    if (!SOURCE_STATUSES.includes(input.status)) throw new Error("지원하지 않는 상태입니다.");
    const { supabase, user } = await authorizedUser();
    const { data, error } = await supabase.from("tco_content_sources")
      .update({ status: input.status, error_message: null, updated_at: new Date().toISOString() })
      .eq("id", input.id).eq("user_id", user.id).select("id").maybeSingle();
    if (error || !data) throw new Error("상태를 바꿀 소스를 찾지 못했습니다. 새로고침 후 다시 시도해 주세요.");
    revalidatePath("/threads-content-ops");
    return { ok: true };
  } catch (error) {
    return sourceFailure(error, "상태를 바꾸지 못했습니다.");
  }
}

export async function deleteContentSource(id: string): Promise<SourceResult> {
  try {
    const { supabase, user } = await authorizedUser();
    const { data, error } = await supabase.from("tco_content_sources")
      .delete().eq("id", id).eq("user_id", user.id).select("id").maybeSingle();
    if (error || !data) throw new Error("삭제할 소스를 찾지 못했습니다. 새로고침 후 다시 시도해 주세요.");
    revalidatePath("/threads-content-ops");
    return { ok: true };
  } catch (error) {
    return sourceFailure(error, "소스를 삭제하지 못했습니다.");
  }
}

// ---------------------------------------------------------------------------
// 쿠팡 파트너스 검색 → 소스 저장 (v1.30)
// 회원 본인의 Access/Secret Key(user_api_keys)로만 검색하고, 검색 결과는 저장하지 않는다.
// 회원이 고른 상품만 소스 큐에 저장한다. 키가 없거나 실패하면 안내만 돌려주며 예시 상품은 만들지 않는다.
// ---------------------------------------------------------------------------
type CoupangSearchResult =
  | { ok: true; products: CoupangProduct[] }
  | { ok: false; error: string; needKeys?: boolean };

export async function searchCoupangForSources(keyword: string): Promise<CoupangSearchResult> {
  try {
    const query = keyword.trim();
    if (!query || query.length > 100) throw new Error("검색어는 1~100자로 입력해 주세요.");
    const { supabase, user } = await authorizedUser();
    const [accessKey, secretKey] = await Promise.all([
      resolveApiKey(supabase, user.id, "coupang_access_key"),
      resolveApiKey(supabase, user.id, "coupang_secret_key"),
    ]);
    if (!accessKey || !secretKey) {
      return { ok: false, needKeys: true, error: "쿠팡 파트너스 Access Key와 Secret Key를 먼저 등록해 주세요. API키등록·플랫폼연동에서 본인 키를 저장하면 검색할 수 있습니다." };
    }
    const products = await searchCoupangProducts(query, { accessKey, secretKey, limit: 10 });
    return { ok: true, products };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "쿠팡 상품을 검색하지 못했습니다." };
  }
}

export async function saveCoupangSearchResult(input: {
  accountId: string;
  product: CoupangProduct;
  summary: string;
}): Promise<SourceResult> {
  try {
    const product = input.product;
    const title = typeof product?.productName === "string" ? product.productName.trim().slice(0, 200) : "";
    if (!title) throw new Error("저장할 상품 정보를 확인해 주세요. 다시 검색해서 선택해 주세요.");
    if (input.summary.length > 1_000) throw new Error("메모는 1,000자 이내로 입력해 주세요.");
    const sourceUrl = normalizeSourceUrl(String(product.productUrl ?? ""));
    assertCoupangAffiliateUrl(sourceUrl);

    const price = Number(product.productPrice);
    const productId = Number(product.productId);
    const { supabase, user } = await authorizedUser();
    await insertContentSource(supabase, user.id, {
      accountId: input.accountId,
      sourceType: "coupang",
      title,
      sourceUrl,
      summary: input.summary,
      metadata: {
        via: "coupang_search",
        productId: Number.isFinite(productId) ? productId : null,
        price: Number.isFinite(price) && price >= 0 ? price : null,
        imageUrl: typeof product.productImage === "string" && isCoupangImageUrl(product.productImage) ? product.productImage : null,
        isRocket: Boolean(product.isRocket),
        isFreeShipping: Boolean(product.isFreeShipping),
        savedAt: new Date().toISOString(),
      },
    });
    revalidatePath("/threads-content-ops");
    return { ok: true };
  } catch (error) {
    return sourceFailure(error, "상품을 소스로 저장하지 못했습니다.");
  }
}

// ---------------------------------------------------------------------------
// 떡상 콘텐츠 수집 = 글감 수집 (v1.34)
// `threads/`의 글감 수집(HTTP·Perplexity + AI 구조화)을 옮겼다. 회원 본인의 OpenAI/Perplexity 키만 쓰고,
// 원문 전체는 저장하지 않으며 AI가 정리한 후보(제목·본문·키워드)와 출처만 본인 계정에 저장한다.
// 예상된 오류는 throw하지 않고 결과 객체로 돌려준다.
// ---------------------------------------------------------------------------
const MAX_VIRAL_PER_USER = 300;
const VIRAL_STATUSES = ["ready", "used", "archived"];
type CollectResult = { ok: true; count: number } | { ok: false; error: string; needKey?: "openai" | "perplexity" };

async function saveViralDrafts(
  supabase: Awaited<ReturnType<typeof authorizedUser>>["supabase"],
  userId: string,
  method: "http" | "perplexity",
  sourceInput: string,
  drafts: ViralCandidateDraft[],
) {
  const { count } = await supabase.from("tco_viral_candidates")
    .select("id", { count: "exact", head: true }).eq("user_id", userId);
  if ((count ?? 0) + drafts.length > MAX_VIRAL_PER_USER) {
    throw new Error(`수집한 글감은 최대 ${MAX_VIRAL_PER_USER}건까지 보관할 수 있습니다. 사용한 글감을 삭제한 뒤 다시 수집해 주세요.`);
  }
  const now = Date.now();
  const { error } = await supabase.from("tco_viral_candidates").insert(drafts.map((draft, index) => ({
    user_id: userId,
    method,
    source_input: sourceInput.slice(0, 2_000),
    title: draft.title,
    content: draft.content,
    keywords: draft.keywords,
    created_at: new Date(now - index).toISOString(),
  })));
  if (error) throw new Error("수집한 글감을 저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
}

/** 방식 1: 주소 지정 — 글 1건이면 그 글로, 목록 페이지면 안의 글 중 무작위 5건으로 글감 후보를 만든다. */
export async function collectViralFromUrl(rawUrl: string): Promise<CollectResult> {
  try {
    const input = rawUrl.trim();
    if (!input || input.length > 2_000) throw new Error("주소를 1~2,000자로 입력해 주세요.");
    const { supabase, user } = await authorizedUser();
    const openaiKey = await resolveApiKey(supabase, user.id, "openai");
    if (!openaiKey) return { ok: false, needKey: "openai", error: "글감을 정리하려면 본인의 OpenAI API 키가 필요합니다. API키등록·플랫폼연동에서 등록해 주세요." };

    const listing = await fetchPublicHtml(rewriteToScrapableListingUrl(input));
    const links = extractArticleLinks(listing.html, listing.finalUrl);
    let rawText: string;
    let maxItems = 1;
    if (links.length >= 3) {
      const picked = pickRandom(links, 5);
      const articles = await Promise.all(picked.map(async (link) => {
        try { return { ...link, text: extractMainText((await fetchPublicHtml(link.url)).html, 2_500) }; } catch { return null; }
      }));
      const valid = articles.filter((article): article is { url: string; title: string; text: string } => Boolean(article && article.text.length > 100));
      if (!valid.length) throw new Error("목록의 게시글 내용을 가져오지 못했습니다. 개별 글 주소로 시도해 주세요.");
      rawText = valid.map((article, index) => `[${index + 1}] ${article.title}\n${article.text}\n출처: ${article.url}`).join("\n\n");
      maxItems = valid.length;
    } else {
      const text = extractMainText(listing.html);
      if (text.length < 100) throw new Error("페이지에서 읽을 수 있는 본문을 찾지 못했습니다. 로그인이 필요하거나 화면이 자바스크립트로 그려지는 페이지일 수 있습니다.");
      rawText = `${text}\n출처: ${listing.finalUrl}`;
    }
    const drafts = await structureCandidates({ rawText, maxItems, apiKey: openaiKey });
    await saveViralDrafts(supabase, user.id, "http", input, drafts);
    revalidatePath("/threads-content-ops");
    return { ok: true, count: drafts.length };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "글감을 수집하지 못했습니다." };
  }
}

/** 방식 2: Perplexity — 시드 주제로 최근 72시간 화제 이슈를 찾아 글감 후보를 만든다. */
export async function collectViralFromPerplexity(rawTopic: string): Promise<CollectResult> {
  try {
    const topic = rawTopic.trim();
    if (!topic || topic.length > 200) throw new Error("주제를 1~200자로 입력해 주세요.");
    const { supabase, user } = await authorizedUser();
    const [perplexityKey, openaiKey] = await Promise.all([
      resolveApiKey(supabase, user.id, "perplexity"),
      resolveApiKey(supabase, user.id, "openai"),
    ]);
    if (!perplexityKey) return { ok: false, needKey: "perplexity", error: "화제 검색에는 본인의 Perplexity API 키(pplx-...)가 필요합니다. API키등록·플랫폼연동에서 등록해 주세요." };
    if (!openaiKey) return { ok: false, needKey: "openai", error: "글감을 정리하려면 본인의 OpenAI API 키가 필요합니다. API키등록·플랫폼연동에서 등록해 주세요." };

    const trendText = await searchPerplexityTrending(topic, perplexityKey);
    const drafts = await structureCandidates({ rawText: trendText, maxItems: 5, apiKey: openaiKey });
    await saveViralDrafts(supabase, user.id, "perplexity", topic, drafts);
    revalidatePath("/threads-content-ops");
    return { ok: true, count: drafts.length };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "글감을 수집하지 못했습니다." };
  }
}

export async function setViralCandidateStatus(input: { id: string; status: string }): Promise<SourceResult> {
  try {
    if (!VIRAL_STATUSES.includes(input.status)) throw new Error("지원하지 않는 상태입니다.");
    const { supabase, user } = await authorizedUser();
    const { data, error } = await supabase.from("tco_viral_candidates")
      .update({ status: input.status, updated_at: new Date().toISOString() })
      .eq("id", input.id).eq("user_id", user.id).select("id").maybeSingle();
    if (error || !data) throw new Error("상태를 바꿀 글감을 찾지 못했습니다. 새로고침 후 다시 시도해 주세요.");
    revalidatePath("/threads-content-ops");
    return { ok: true };
  } catch (error) {
    return sourceFailure(error, "상태를 바꾸지 못했습니다.");
  }
}

export async function deleteViralCandidate(id: string): Promise<SourceResult> {
  try {
    const { supabase, user } = await authorizedUser();
    const { data, error } = await supabase.from("tco_viral_candidates")
      .delete().eq("id", id).eq("user_id", user.id).select("id").maybeSingle();
    if (error || !data) throw new Error("삭제할 글감을 찾지 못했습니다. 새로고침 후 다시 시도해 주세요.");
    revalidatePath("/threads-content-ops");
    return { ok: true };
  } catch (error) {
    return sourceFailure(error, "글감을 삭제하지 못했습니다.");
  }
}

// ---------------------------------------------------------------------------
// 유튜브 쇼츠 검색 (v1.37) — shorts-viral-studio의 검색을 옮겼다. 회원 본인의 YouTube Data API 키만 쓴다.
// 검색 결과는 DB에 저장하지 않고, "글감으로 저장"(분석 후 글감 생성)을 누른 영상만 저장된다(아래 analyzeShortToViralCandidates).
// ---------------------------------------------------------------------------
type ShortsSearchResult = { ok: true; videos: ShortVideo[] } | { ok: false; error: string; needKey?: boolean };
const SHORTS_ORDERS = ["viewCount", "relevance", "date"];
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

export async function searchViralShorts(input: { query: string; dateFrom?: string; dateTo?: string; order: string }): Promise<ShortsSearchResult> {
  try {
    const query = input.query?.trim();
    if (!query) throw new Error("검색어를 입력해 주세요. (예: 다이어트, 재테크, 여행)");
    if (query.length > 100) throw new Error("검색어는 100자 이내로 입력해 주세요.");
    if (!SHORTS_ORDERS.includes(input.order)) throw new Error("정렬 기준이 올바르지 않습니다.");
    if ((input.dateFrom && !DAY.test(input.dateFrom)) || (input.dateTo && !DAY.test(input.dateTo))) throw new Error("게시 기간 형식이 올바르지 않습니다.");
    const { supabase, user } = await authorizedUser();
    const apiKey = await resolveApiKey(supabase, user.id, "youtube_api_key");
    if (!apiKey) return { ok: false, needKey: true, error: "YouTube Data API 키가 등록되어 있지 않습니다. API키등록·플랫폼연동에서 본인 키를 등록해 주세요." };
    const videos = await searchYoutubeShorts({ query, dateFrom: input.dateFrom || undefined, dateTo: input.dateTo || undefined, order: input.order as ShortsOrder }, apiKey);
    return { ok: true, videos };
  } catch (error) {
    if (error instanceof YouTubeSearchError) return { ok: false, error: error.message, needKey: error.invalidKey };
    return { ok: false, error: error instanceof Error ? error.message : "유튜브 검색 중 오류가 발생했습니다." };
  }
}

/**
 * 쇼츠 분석 → 글감 (v1.39). Gemini 키가 있으면 영상을 직접 보고, 없으면 OpenAI로 제목·수치·댓글을 근거로 추정 분석해
 * 터진 이유(훅·구조)와 Threads 글감 후보 최대 3건을 저장한다. 영상 대사·자막은 옮기지 않고 새 문장으로 쓰게 한다.
 */
type AnalyzeShortResult = { ok: true; count: number; evidence: "video" | "metadata"; note?: string } | { ok: false; error: string; needKey?: "openai" | "gemini" };

export async function analyzeShortToViralCandidates(input: { id: string; title: string; channelName: string; views: number; subs: number | null; vsRatio: number | null; grade: string; publishedAt: string }): Promise<AnalyzeShortResult> {
  try {
    if (!YOUTUBE_ID.test(input.id ?? "")) throw new Error("영상 정보가 올바르지 않습니다. 다시 검색해 주세요.");
    const title = String(input.title ?? "").trim().slice(0, 100);
    if (!title) throw new Error("영상 제목이 비어 있습니다.");
    const finite = (value: unknown) => (typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null);
    const { supabase, user } = await authorizedUser();
    const [geminiKey, openaiKey, youtubeKey] = await Promise.all([
      resolveApiKey(supabase, user.id, "gemini"),
      resolveApiKey(supabase, user.id, "openai"),
      resolveApiKey(supabase, user.id, "youtube_api_key"),
    ]);
    if (!geminiKey && !openaiKey) return { ok: false, needKey: "gemini", error: "영상 분석에는 본인의 Gemini(영상 직접 분석) 또는 OpenAI(제목·댓글 기반 추정) API 키가 필요합니다. API키등록·플랫폼연동에서 등록해 주세요." };

    const sourceInput = `https://www.youtube.com/shorts/${input.id}`;
    const { data: existing } = await supabase.from("tco_viral_candidates").select("id").eq("user_id", user.id).eq("source_input", sourceInput).like("content", "%[영상 분석]%").limit(1);
    if (existing?.length) throw new Error("이미 분석해서 글감으로 만든 영상입니다. 아래 수집한 글감 목록을 확인해 주세요.");

    const extra = youtubeKey ? await fetchShortContext(input.id, youtubeKey) : { description: "", comments: [] as string[] };
    const analysis = await analyzeShortForThreads({
      meta: { id: input.id, title, channelName: String(input.channelName ?? "").slice(0, 80), views: finite(input.views) ?? 0, subs: finite(input.subs), vsRatio: finite(input.vsRatio), grade: String(input.grade ?? "").slice(0, 10), publishedAt: String(input.publishedAt ?? "").slice(0, 10) },
      extra, geminiKey, openaiKey,
    });
    const summary = [analysis.hook && `훅: ${analysis.hook}`, analysis.whyViral && `터진 이유: ${analysis.whyViral}`].filter(Boolean).join(" / ").slice(0, 400);
    const drafts = analysis.candidates.map((draft) => ({ ...draft, content: summary ? `${draft.content}\n\n[영상 분석] ${summary}` : draft.content }));
    await saveViralDrafts(supabase, user.id, "http", sourceInput, drafts);
    revalidatePath("/threads-content-ops");
    return { ok: true, count: drafts.length, evidence: analysis.evidence, note: analysis.note };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "영상을 분석하지 못했습니다." };
  }
}

// ---------------------------------------------------------------------------
// 주목받는 글 만들기 (v1.41) — threads-easy-planner의 글 생성(4단계 구조 + 5대 훅 유형)을 글감 흐름에 합쳤다.
// 생성 결과는 저장하지 않고 화면에 보여준 뒤, 회원이 고른 글만 초안으로 저장한다(자동 발행 없음).
// ---------------------------------------------------------------------------
type AttentionResult = { ok: true; plan: AttentionPlan } | { ok: false; error: string; needKey?: boolean };
type EngineInput = { provider: string; model: string };
type CustomFields = { product?: string; experience?: string; targetAudience?: string };

async function resolveEngine(supabase: Awaited<ReturnType<typeof authorizedUser>>["supabase"], userId: string, engine: EngineInput | undefined) {
  const provider = engine?.provider ?? DEFAULT_ENGINE.provider;
  const model = engine?.model ?? DEFAULT_ENGINE.model;
  if (!isKnownEngine(provider, model)) throw new Error("지원하지 않는 AI 엔진 또는 모델입니다. 다시 선택해 주세요.");
  const apiKey = await resolveApiKey(supabase, userId, provider);
  if (!apiKey) {
    const name = provider === "openai" ? "OpenAI" : "Gemini";
    return { ok: false as const, error: `${name} API 키가 등록되어 있지 않습니다. API키등록·플랫폼연동에서 본인 키를 등록하거나 다른 AI 엔진을 선택해 주세요.` };
  }
  return { ok: true as const, engine: { provider, model, apiKey } };
}

const clean = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");

export async function generateAttentionPost(input: { topic: string; note?: string; personaId?: string; custom?: CustomFields; engine?: EngineInput }): Promise<AttentionResult> {
  try {
    const topic = clean(input.topic, 1_201);
    const note = clean(input.note, 301);
    if (!topic || topic.length > 1_200) throw new Error("글감 또는 주제를 1~1,200자로 입력해 주세요.");
    if (note.length > 300) throw new Error("추가 요청은 300자 이내로 입력해 주세요.");
    const persona = input.personaId ? PERSONAS.find((item) => item.id === input.personaId) : undefined;
    if (input.personaId && !persona) throw new Error("지원하지 않는 페르소나입니다.");
    const custom: CustomFields = { product: clean(input.custom?.product, 200), experience: clean(input.custom?.experience, 800), targetAudience: clean(input.custom?.targetAudience, 200) };
    const { supabase, user } = await authorizedUser();
    const resolved = await resolveEngine(supabase, user.id, input.engine);
    if (!resolved.ok) return { ok: false, needKey: true, error: resolved.error };
    return { ok: true, plan: await generateAttentionPlan({ topic, note: note || undefined, personaTone: persona?.tonePrompt, custom, engine: resolved.engine }) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "글을 생성하지 못했습니다." };
  }
}

/** 선택한 글 한 편을 7가지 방향 중 하나로 다시 쓴다(저장하지 않음). */
export async function rewriteGeneratedPost(input: { hook: string; content: string; mode: string; engine?: EngineInput }): Promise<{ ok: true; hook: string; content: string } | { ok: false; error: string }> {
  try {
    const content = clean(input.content, 5_001);
    if (!content || content.length > 5_000) throw new Error("다시 쓸 본문을 1~5,000자로 확인해 주세요.");
    if (!REWRITE_MODES.some((item) => item.mode === input.mode)) throw new Error("지원하지 않는 다시 쓰기 방식입니다.");
    const { supabase, user } = await authorizedUser();
    const resolved = await resolveEngine(supabase, user.id, input.engine);
    if (!resolved.ok) return { ok: false, error: resolved.error };
    const result = await rewriteAttentionPost({ hook: clean(input.hook, 200), content, mode: input.mode as RewriteMode, engine: resolved.engine });
    return { ok: true, ...result };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "글을 다시 쓰지 못했습니다." };
  }
}

/** 마음에 드는 생성 글을 검토 대기 초안으로 저장한다. 글감에서 만든 글이면 그 글감을 사용 완료로 표시한다. */
export async function saveGeneratedDraft(input: { accountId: string; body: string; viralId?: string }): Promise<SourceResult> {
  try {
    const body = String(input.body ?? "").trim();
    if (!input.accountId || !body || body.length > 5_000) throw new Error("연결 계정과 1~5,000자 본문을 확인해 주세요.");
    const { supabase, user } = await authorizedUser();
    const { data: account } = await supabase.from("tco_threads_accounts").select("id")
      .eq("id", input.accountId).eq("user_id", user.id).maybeSingle();
    if (!account) throw new Error("연결된 Threads 계정을 찾지 못했습니다.");
    const { error } = await supabase.from("tco_posts").insert({ user_id: user.id, account_id: account.id, body, status: "draft" });
    if (error) throw new Error("초안을 저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
    if (input.viralId) {
      await supabase.from("tco_viral_candidates").update({ status: "used", updated_at: new Date().toISOString() })
        .eq("id", input.viralId).eq("user_id", user.id);
    }
    revalidatePath("/threads-content-ops");
    return { ok: true };
  } catch (error) {
    return sourceFailure(error, "초안을 저장하지 못했습니다.");
  }
}
