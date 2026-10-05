"use server";

import { createClient } from "@/lib/supabase/server";
import { requireProgramAccess, logProgramUsage } from "@/lib/access";
import { resolveApiKey } from "@/lib/apiKeys";
import { getDisclosureText } from "@/lib/ai/affiliateGenerator";
import { generatePostImage } from "@/lib/ai/generator";
import { publishPost } from "@/lib/posts/publish-core";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { AI_MODEL_OPTIONS, DEFAULT_AI_MODELS } from "@/lib/ai/models";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AffiliatePlatform } from "@/types/product";
import { searchProducts as searchCoupangProducts, type CoupangProduct } from "@/lib/coupang/client";
import { searchThreadsByKeyword, ThreadsKeywordSearchError, type ThreadsKeywordSearchPost, type ThreadsSearchMediaChild } from "@/lib/threads/client";

// Only "threads" items are real posts; examples and AI drafts are labelled as such in the UI.
export type ViralPostSource = "threads" | "manual" | "example" | "ai";

/** Image/video attached to a Threads search result — shown as a reference preview only, never reposted. */
export interface ViralPostMedia {
  type: "IMAGE" | "VIDEO";
  /** Image to show: the image itself, or the video's thumbnail. */
  previewUrl: string;
  /** Original file (image or video). Meta CDN URL, expires after a while. */
  fileUrl: string;
}

export interface ViralPostItem {
  id: string;
  source: ViralPostSource;
  authorHandle: string;
  authorName: string;
  content: string;
  permalink?: string;
  postedAtLabel: string;
  category: string;
  isSaved?: boolean;
  media?: ViralPostMedia[];
}

export type ThreadsSearchStatus =
  | "ok"
  | "empty"
  | "own_posts_only"
  | "no_keyword"
  | "not_connected"
  | "permission_missing"
  | "error";

export interface ThreadsSearchFilters {
  searchMode?: "KEYWORD" | "TAG";
  mediaType?: "TEXT" | "IMAGE" | "VIDEO";
  authorUsername?: string;
}

export interface ViralSearchResult {
  posts: ViralPostItem[];
  threadsStatus: ThreadsSearchStatus;
  threadsUsername: string | null;
  threadsMessage?: string;
}

const EXAMPLE_POSTS: Array<Omit<ViralPostItem, "source" | "postedAtLabel">> = [
  {
    id: "v-daiso-01",
    authorHandle: "example_daiso",
    authorName: "다이소 꿀템 예시",
    content: "다이소 가면 다른 거 다 필요없고 이거 3개는 무조건 집어오세요 ㅋㅋㅋ\n1. 스텐 스크래퍼: 냄비 굳은 때 1초 컷\n2. 틈새 세척솔: 창틀 묵은 때 대박 깔끔\n3. 실리콘 배수구 덮개: 악취 바로 차단됨!!\n천원의 행복 그 자체 ㄷㄷ",
    category: "다이소",
  },
  {
    id: "v-costco-01",
    authorHandle: "example_costco",
    authorName: "코스트코 추천 예시",
    content: "코스트코 신상 식품 코너 난리 낸 가성비 폭발 꿀템 🍖\n이 가격에 이 양이 실화냐 소리 절로 나옴 ㅋㅋㅋ 주말에 가시면 무조건 카트에 담으세요!! 재고 금방 빠집니다 🔥",
    category: "코스트코",
  },
  {
    id: "v-muji-01",
    authorHandle: "example_muji",
    authorName: "무인양품 추천 예시",
    content: "무인양품(MUJI)에서 숨겨진 삶의 질 향상 꿀템 💡\n아크릴 서랍장이랑 솜사탕 타올 꼭 사세요. 방 분위기도 원목 느낌으로 정갈해지고 정리정돈 1초 만에 깔끔해집니다!",
    category: "무인양품",
  },
  {
    id: "v-donki-01",
    authorHandle: "example_donki",
    authorName: "돈키호테 쇼핑 예시",
    content: "일본 여행 돈키호테 필수 쇼핑리스트 TOP 5 🇯🇵\n유명한 의약품 말고 뷰티/생활 소품 중에 진짜 대박인 것들만 싹 다 털어옴 ㅋㅋㅋ 한국 와서 쓰는데 대만족!",
    category: "돈키호테",
  },
  {
    id: "v-coupang-01",
    authorHandle: "example_coupang",
    authorName: "쿠팡 꿀템 예시",
    content: "솔직히 이거 안 쓰면 손해임 ㄷㄷ 쿠팡에서 산 꿀템 3가지 정리해봄!\n1. 실리콘 밀폐용기: 계란찜도 바로 됨\n2. 논슬립 러그: 청소기로 밀어도 안 움직임\n3. 다회용 수세미: 거품 대박 잘 남\n진짜 자취생 필수템 추천!",
    category: "쿠팡",
  },
  {
    id: "v-ali-01",
    authorHandle: "example_ali",
    authorName: "알리 꿀템 예시",
    content: "알리익스프레스 1만원 이하 삶의 질 급상승 꿀템 ㅋㅋㅋ\n이거 진짜 물건이네. 가성비 완전 미쳤음...\n주변에 선물용으로도 찰떡이라 5개 재구입함 🔥",
    category: "알리",
  },
  {
    id: "v-olive-01",
    authorHandle: "example_oliveyoung",
    authorName: "올리브영 추천 예시",
    content: "올리브영 세일 때 무조건 쟁여두는 선크림 🧴\n백탁 0% 수분크림처럼 촉촉하게 발리는데 피부 자극 1도 없음 ㅋㅋㅋ 세일할 때 미리 사두세요!",
    category: "올리브영",
  },
  {
    id: "v-toss-01",
    authorHandle: "example_toss",
    authorName: "토스쇼핑 핫딜 예시",
    content: "토스쇼핑 핫딜 꿀템 정보 모음 🛍️\n제철 과일 무료배송 특가랑 탄산음료 대용량 특가 바로 줍줍하세요!",
    category: "토스",
  },
];

function toExamplePost(p: (typeof EXAMPLE_POSTS)[number]): ViralPostItem {
  return { ...p, source: "example", postedAtLabel: "작성 예시" };
}

// A carousel's images live in `children`; a single image/video post carries its own URLs.
function toViralMedia(post: ThreadsKeywordSearchPost): ViralPostMedia[] | undefined {
  const items: ThreadsSearchMediaChild[] = post.children?.data?.length ? post.children.data : [post];
  const media = items.flatMap((item): ViralPostMedia[] => {
    if (item.media_type === "VIDEO") {
      const preview = item.thumbnail_url ?? "";
      return item.media_url && preview ? [{ type: "VIDEO", previewUrl: preview, fileUrl: item.media_url }] : [];
    }
    if (item.media_type === "IMAGE" && item.media_url) {
      return [{ type: "IMAGE", previewUrl: item.media_url, fileUrl: item.media_url }];
    }
    return [];
  });
  return media.length ? media.slice(0, 10) : undefined;
}

function formatRelativeTime(iso?: string): string {
  if (!iso) return "";
  const diffMs = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diffMs)) return "";
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) return `${Math.max(minutes, 1)}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}일 전`;
  return new Date(iso).toLocaleDateString("ko-KR");
}

const DATE_RANGE_SECONDS: Record<"1d" | "1w" | "1m", number> = {
  "1d": 86400,
  "1w": 7 * 86400,
  "1m": 30 * 86400,
};

async function searchRealThreads(
  account: { access_token: string; username: string | null },
  keyword: string,
  options: { searchType: "TOP" | "RECENT"; dateRange: "1d" | "1w" | "1m" | "all" } & ThreadsSearchFilters,
): Promise<{ posts: ViralPostItem[]; status: ThreadsSearchStatus; message?: string }> {

  const since =
    options.dateRange === "all"
      ? undefined
      : Math.floor(Date.now() / 1000) - DATE_RANGE_SECONDS[options.dateRange];

  try {
    const results = await searchThreadsByKeyword(account.access_token, {
      q: keyword,
      searchType: options.searchType,
      searchMode: options.searchMode,
      mediaType: options.mediaType,
      authorUsername: options.authorUsername,
      since,
      limit: 50,
    });

    const posts: ViralPostItem[] = results
      .filter((r) => r.text && r.text.trim().length > 0)
      .map((r) => ({
        id: `th-${r.id}`,
        source: "threads",
        authorHandle: (r.username ?? "").replace(/^@+/, ""),
        authorName: r.username ? `@${r.username.replace(/^@+/, "")}` : "Threads 사용자",
        content: r.text!.trim(),
        permalink: r.permalink,
        postedAtLabel: formatRelativeTime(r.timestamp),
        category: keyword,
        media: toViralMedia(r),
      }));

    if (posts.length === 0) return { posts, status: "empty" };

    // Filtering by one's own username naturally returns only own posts, so it says nothing about approval.
    const ownUsername = account.username?.replace(/^@+/, "").toLowerCase();
    const filteringOwn = !!ownUsername && options.authorUsername?.toLowerCase() === ownUsername;
    const onlyOwn =
      !filteringOwn && !!ownUsername && posts.every((p) => p.authorHandle.toLowerCase() === ownUsername);
    return { posts, status: onlyOwn ? "own_posts_only" : "ok" };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Threads 키워드 검색 실패";
    const code = err instanceof ThreadsKeywordSearchError ? err.code : undefined;
    // Meta answers a token without threads_keyword_search with a generic code 1 "unknown error",
    // not only the documented permission codes, so treat both as a missing grant.
    const isPermission =
      code === 1 || code === 10 || code === 200 || /permission|scope|권한/i.test(message);
    const detail = code !== undefined ? `${message} (code ${code})` : message;
    return { posts: [], status: isPermission ? "permission_missing" : "error", message: detail };
  }
}

export async function getViralPostsAction(
  options?: {
    keyword?: string;
    dateRange?: "1d" | "1w" | "1m" | "all";
    searchType?: "TOP" | "RECENT";
  } & ThreadsSearchFilters,
): Promise<ViralSearchResult> {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { data: account } = await supabase
    .from("tap_accounts")
    .select("access_token, username")
    .eq("user_id", user.id)
    .maybeSingle();
  const threadsUsername = account?.username?.replace(/^@+/, "") ?? null;

  const authorUsername = options?.authorUsername?.replace(/^@+/, "").trim() || undefined;
  if (authorUsername && !/^[\w.]{1,30}$/.test(authorUsername)) {
    return {
      posts: [],
      threadsStatus: "error",
      threadsUsername,
      threadsMessage: "작성자 아이디는 영문·숫자·밑줄(_)·마침표(.)만 입력할 수 있습니다.",
    };
  }

  const savedIds = new Set<string>();
  const { data: savedData } = await (supabase as any)
    .from("tap_saved_posts")
    .select("post_id")
    .eq("user_id", user.id);
  ((savedData ?? []) as Array<{ post_id: string }>).forEach((s) => savedIds.add(s.post_id));

  const rawKw = (options?.keyword ?? "").replace(/^#/, "").trim();
  const hasKeyword = rawKw !== "" && rawKw !== "전체";

  let threadsPosts: ViralPostItem[] = [];
  let threadsStatus: ThreadsSearchStatus = "no_keyword";
  let threadsMessage: string | undefined;

  if (hasKeyword && !account?.access_token) {
    threadsStatus = "not_connected";
  } else if (hasKeyword && account?.access_token) {
    const res = await searchRealThreads(
      { access_token: account.access_token, username: account.username },
      rawKw,
      {
        searchType: options?.searchType ?? "TOP",
        dateRange: options?.dateRange ?? "all",
        searchMode: options?.searchMode === "TAG" ? "TAG" : "KEYWORD",
        mediaType: options?.mediaType,
        authorUsername,
      },
    );
    threadsPosts = res.posts;
    threadsStatus = res.status;
    threadsMessage = res.message;
  }

  const kwLower = rawKw.toLowerCase();
  const examples = EXAMPLE_POSTS.filter(
    (p) =>
      !hasKeyword ||
      p.category.toLowerCase().includes(kwLower) ||
      p.content.toLowerCase().includes(kwLower),
  ).map(toExamplePost);

  const posts = [...threadsPosts, ...examples].map((p) => ({ ...p, isSaved: savedIds.has(p.id) }));
  return { posts, threadsStatus, threadsUsername, threadsMessage };
}

export async function searchRelatedCoupangProductsAction(
  keyword: string,
): Promise<{ products: CoupangProduct[]; error?: string }> {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  const kw = keyword.replace(/^#/, "").trim();
  if (!kw || kw === "전체") return { products: [], error: "검색어를 입력해주세요." };

  const [accessKey, secretKey] = await Promise.all([
    resolveApiKey(supabase, user.id, "coupang_access_key"),
    resolveApiKey(supabase, user.id, "coupang_secret_key"),
  ]);
  if (!accessKey || !secretKey) {
    return { products: [], error: "쿠팡파트너스 API 키가 없습니다. API키등록·플랫폼연동 메뉴에서 본인 키를 등록해주세요." };
  }

  try {
    const products = await searchCoupangProducts(kw, { accessKey, secretKey, limit: 6 });
    return { products };
  } catch (err) {
    return { products: [], error: err instanceof Error ? err.message : "쿠팡 상품 검색 실패" };
  }
}

export async function generateAiExamplePostsAction(
  keyword: string,
): Promise<{ posts: ViralPostItem[]; error?: string }> {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  const kw = keyword.replace(/^#/, "").trim();
  if (!kw || kw === "전체") return { posts: [], error: "검색어를 입력해주세요." };

  const openaiKey = await resolveApiKey(supabase, user.id, "openai");
  if (!openaiKey) {
    return { posts: [], error: "OpenAI API 키가 없습니다. API키등록·플랫폼연동 메뉴에서 본인 키를 등록해주세요." };
  }

  try {
    const openai = new OpenAI({ apiKey: openaiKey });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            'You write example Korean Threads posts that would perform well for a given keyword. Write 3 distinct posts (under 300 characters each) in natural Korean SNS tone, each directly about the keyword. Do not invent engagement numbers, usernames, or claims of real reviews. Return JSON: {"posts": [{"content": string}]}',
        },
        { role: "user", content: `키워드: ${kw}` },
      ],
      response_format: { type: "json_object" },
    });

    const parsed = JSON.parse(completion.choices[0]?.message?.content || "{}");
    const items: Array<{ content?: string }> = Array.isArray(parsed.posts) ? parsed.posts : [];
    const stamp = Date.now();
    const posts: ViralPostItem[] = items
      .filter((p) => typeof p.content === "string" && p.content.trim())
      .map((p, idx) => ({
        id: `ai-${stamp}-${idx}`,
        source: "ai",
        authorHandle: "ai_example",
        authorName: `AI 작성 예시 (${kw})`,
        content: p.content!.trim(),
        postedAtLabel: "AI 생성",
        category: kw,
      }));

    await logProgramUsage({
      userId: user.id,
      action: "ai_generate_trend_examples",
      metadata: { keyword: kw, count: posts.length },
    });

    return { posts };
  } catch (err) {
    return { posts: [], error: err instanceof Error ? err.message : "AI 예시 글 생성 실패" };
  }
}

function sourceFromSavedId(postId: string): ViralPostSource {
  if (postId.startsWith("th-")) return "threads";
  if (postId.startsWith("mn-")) return "manual";
  if (postId.startsWith("ai-")) return "ai";
  return "example";
}

// "mn-<shortcode>" ids (imported with a link) can rebuild the public post URL; "mn-x-<uuid>" cannot.
function permalinkFromSavedId(postId: string): string | undefined {
  if (!postId.startsWith("mn-") || postId.startsWith("mn-x-")) return undefined;
  return `https://www.threads.com/t/${postId.slice(3)}`;
}

const THREADS_POST_URL =
  /^https?:\/\/(?:www\.)?threads\.(?:net|com)\/(?:@([\w.]+)\/post\/|t\/)([\w-]+)/i;

export async function importViralPostAction(input: {
  url?: string;
  content: string;
}): Promise<{ post?: ViralPostItem; error?: string }> {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const content = input.content.trim();
  if (content.length < 10) return { error: "떡상글 본문을 10자 이상 붙여넣어 주세요." };
  if (content.length > 2000) return { error: "본문은 2,000자 이하로 붙여넣어 주세요." };

  const url = input.url?.trim() ?? "";
  let postId = `mn-x-${crypto.randomUUID()}`;
  let username = "";
  let permalink: string | undefined;

  if (url) {
    const match = url.match(THREADS_POST_URL);
    if (!match) {
      return { error: "Threads 게시글 링크 형식이 아닙니다. (예: https://www.threads.com/@아이디/post/코드)" };
    }
    username = match[1] ?? "";
    const shortcode = match[2];

    // Public oEmbed needs no token; a failure means the post is private, deleted or geo-gated.
    const oembed = await fetch(
      `https://graph.threads.net/v1.0/oembed?url=${encodeURIComponent(`https://www.threads.com/t/${shortcode}`)}`,
      { cache: "no-store" },
    );
    if (!oembed.ok) {
      return { error: "공개 게시글을 찾을 수 없습니다. 링크가 맞는지, 비공개·삭제된 글이 아닌지 확인해주세요." };
    }

    postId = `mn-${shortcode}`;
    permalink = `https://www.threads.com/t/${shortcode}`;
  }

  const authorName = username ? `@${username}` : "직접 가져온 떡상글";
  const { error } = await (supabase as any).from("tap_saved_posts").upsert(
    {
      user_id: user.id,
      post_id: postId,
      author_handle: username,
      author_name: authorName,
      content,
      category: "직접 가져오기",
    },
    { onConflict: "user_id,post_id" },
  );
  if (error) return { error: `보관함 저장 실패: ${error.message}` };

  return {
    post: {
      id: postId,
      source: "manual",
      authorHandle: username,
      authorName,
      content,
      permalink,
      postedAtLabel: "방금 가져옴",
      category: "직접 가져오기",
      isSaved: true,
    },
  };
}

export async function toggleBookmarkAction(post: ViralPostItem): Promise<{ isSaved: boolean; error?: string }> {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { data: existing, error: checkErr } = await (supabase as any)
    .from("tap_saved_posts")
    .select("id")
    .eq("user_id", user.id)
    .eq("post_id", post.id)
    .maybeSingle();
  if (checkErr) return { isSaved: !!post.isSaved, error: checkErr.message };

  if (existing) {
    const { error } = await (supabase as any)
      .from("tap_saved_posts")
      .delete()
      .eq("id", existing.id)
      .eq("user_id", user.id);
    if (error) return { isSaved: true, error: error.message };
    return { isSaved: false };
  }

  const { error } = await (supabase as any).from("tap_saved_posts").insert({
    user_id: user.id,
    post_id: post.id,
    author_handle: post.authorHandle,
    author_name: post.authorName,
    content: post.content,
    category: post.category,
  });
  if (error) return { isSaved: false, error: error.message };
  return { isSaved: true };
}

export async function getSavedBookmarksAction(): Promise<{ posts: ViralPostItem[] }> {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { data } = await (supabase as any)
    .from("tap_saved_posts")
    .select("post_id, author_handle, author_name, content, category, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const posts: ViralPostItem[] = ((data ?? []) as any[]).map((row) => ({
    id: row.post_id,
    source: sourceFromSavedId(row.post_id),
    authorHandle: row.author_handle,
    authorName: row.author_name,
    content: row.content,
    permalink: permalinkFromSavedId(row.post_id),
    postedAtLabel: `찜 ${formatRelativeTime(row.created_at)}`,
    category: row.category || "일반",
    isSaved: true,
  }));
  return { posts };
}

export async function getUserProductsAction(): Promise<{ products: any[]; error?: string }> {
  try {
    const user = await requireProgramAccess();
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("affiliate_products")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) return { products: [], error: error.message };
    return { products: data || [] };
  } catch (err) {
    return { products: [], error: err instanceof Error ? err.message : "상품 목록 조회 실패" };
  }
}

export interface GenerateBenchmarkInput {
  viralContent: string;
  productName: string;
  affiliateUrl: string;
  platform: AffiliatePlatform;
  price?: number;
  personaDescription?: string;
  aiProvider?: "openai" | "gemini" | "anthropic";
  aiModel?: string;
  imageModel?: string;
}

export async function generateBenchmarkCaptionAction(
  input: GenerateBenchmarkInput
): Promise<{ caption?: string; imageUrl?: string; error?: string }> {
  const user = await requireProgramAccess();

  if (!input.viralContent || !input.productName || !input.affiliateUrl) {
    return { error: "필수 입력 항목이 누락되었습니다." };
  }

  const provider = input.aiProvider || "openai";
  const personaDesc = input.personaDescription || "친근하고 현실적인 쇼핑 추천 톤";
  const disclosureText = getDisclosureText(input.platform) || "(광고) 제휴 활동으로 수수료를 받을 수 있습니다.";

  const prompt = `You are a Master Viral Threads Marketer.
[PERSONA TONE & STYLE]: ${personaDesc}

Analyze the following VIRAL Threads post:
"""
${input.viralContent}
"""

Now, rewrite a BRAND NEW viral Threads affiliate post for this product:
- Product Name: ${input.productName}
- Platform: ${input.platform}
${input.price ? `- Price: ${input.price.toLocaleString()}원` : ""}

RULES:
1. Replicate the viral hook style and sentence rhythm of the reference viral post, while strictly adopting the assigned PERSONA TONE & STYLE.
2. Keep body content length under 380 characters.
3. Language: Natural Korean.
4. Output ONLY the post body text without legal disclosures or URL links.`;

  try {
    const supabase = await createClient();
    let bodyText = "";

    const model = input.aiModel || DEFAULT_AI_MODELS[provider];
    if (!AI_MODEL_OPTIONS.some((opt) => opt.provider === provider && opt.value === model)) {
      return { error: `지원하지 않는 AI 모델입니다: ${model}` };
    }

    if (provider === "anthropic") {
      const claudeKey = await resolveApiKey(supabase, user.id, "anthropic");
      if (!claudeKey) {
        return { error: "Anthropic (Claude) API 키가 없습니다. 설정 페이지에서 본인 키를 등록해주세요." };
      }

      const anthropic = new Anthropic({ apiKey: claudeKey });
      const params: Anthropic.Beta.MessageCreateParamsNonStreaming = {
        model,
        max_tokens: 16000,
        messages: [{ role: "user", content: prompt }],
      };
      // Opus 5 may decline via safety classifiers; server-side fallback reruns on a suitable model.
      if (model === "claude-opus-5") {
        params.betas = ["server-side-fallback-2026-07-01"];
        params.fallbacks = "default";
      }
      const response = await anthropic.beta.messages.create(params);

      if (response.stop_reason === "refusal") {
        throw new Error("Claude가 이 요청을 처리하지 않았습니다. 다른 AI 엔진이나 모델로 다시 시도해주세요.");
      }
      // Sonnet 5 / Opus 5 think by default, so the first block can be a thinking block.
      bodyText = response.content
        .filter((block): block is Anthropic.Beta.BetaTextBlock => block.type === "text")
        .map((block) => block.text)
        .join("")
        .trim();
      if (!bodyText) throw new Error("Claude가 캡션을 생성하지 못했습니다.");

      await logProgramUsage({
        userId: user.id,
        action: "ai_generate_viral_benchmark_anthropic",
        metadata: { productName: input.productName, platform: input.platform, model: input.aiModel },
      });
    } else if (provider === "gemini") {
      const geminiKey = await resolveApiKey(supabase, user.id, "gemini");
      if (!geminiKey) {
        return { error: "Gemini API 키가 없습니다. 설정 페이지에서 본인 키를 등록해주세요." };
      }

      const genAI = new GoogleGenerativeAI(geminiKey);
      const result = await genAI.getGenerativeModel({ model }).generateContent(prompt);
      bodyText = result.response.text().trim();
      if (!bodyText) throw new Error("Gemini가 캡션을 생성하지 못했습니다.");

      await logProgramUsage({
        userId: user.id,
        action: "ai_generate_viral_benchmark_gemini",
        metadata: { productName: input.productName, platform: input.platform, model: input.aiModel },
      });
    } else {
      const openAiKey = await resolveApiKey(supabase, user.id, "openai");
      if (!openAiKey) {
        return { error: "OpenAI API 키가 없습니다. 설정 페이지에서 본인 키를 등록해주세요." };
      }

      const openai = new OpenAI({ apiKey: openAiKey });
      // Reasoning models (o-series, GPT-5.x, GPT-6) only accept the default temperature.
      const completion = await openai.chat.completions.create({
        model,
        messages: [{ role: "user", content: prompt }],
        ...(model.startsWith("gpt-4") ? { temperature: 0.8 } : {}),
      });

      bodyText = completion.choices[0]?.message?.content?.trim() || "";
      if (!bodyText) {
        throw new Error("AI가 캡션을 생성하지 못했습니다.");
      }

      await logProgramUsage({
        userId: user.id,
        action: "ai_generate_viral_benchmark_openai",
        metadata: { productName: input.productName, platform: input.platform, model: input.aiModel },
      });
    }

    const ctaText = "상품링크:";
    const finalCaption = `${disclosureText}\n\n${bodyText}\n\n${ctaText} ${input.affiliateUrl}`;

    let generatedImageUrl: string | undefined = undefined;
    if (input.imageModel && input.imageModel !== "none") {
      try {
        const geminiKey = await resolveApiKey(supabase, user.id, "gemini");
        if (geminiKey) {
          const imagePrompt = `${input.productName} realistic aesthetic product photo, high resolution, clean background, modern photography`;
          const imgRes = await generatePostImage({ prompt: imagePrompt, model: input.imageModel as any }, geminiKey);
          const ext = imgRes.mimeType.split("/")[1] ?? "png";
          const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

          const { error: uploadErr } = await supabase.storage
            .from("post-images")
            .upload(path, Buffer.from(imgRes.base64, "base64"), {
              contentType: imgRes.mimeType,
              upsert: false,
            });

          if (!uploadErr) {
            const { data } = supabase.storage.from("post-images").getPublicUrl(path);
            generatedImageUrl = data.publicUrl;
          }
        }
      } catch {
        // ignore image gen failure and return caption
      }
    }

    return { caption: finalCaption, imageUrl: generatedImageUrl };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI 캡션 생성 실패";
    return { error: msg };
  }
}

export async function createDirectBenchmarkPostAction(input: {
  content: string;
  productName: string;
  productId?: string;
  platform: AffiliatePlatform;
  affiliateUrl: string;
  imageUrl?: string;
  publishNow?: boolean;
}): Promise<{ postId?: string; error?: string }> {
  try {
    const user = await requireProgramAccess();
    const supabase = await createClient();

    let imageUrl: string | null = input.imageUrl || null;

    if (!imageUrl && input.productId) {
      const { data: prod } = await supabase
        .from("affiliate_products")
        .select("image_url")
        .eq("id", input.productId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (prod?.image_url) {
        imageUrl = prod.image_url;
      }
    }

    if (!imageUrl) {
      try {
        const geminiKey = await resolveApiKey(supabase, user.id, "gemini");
        if (geminiKey) {
          const prompt = `${input.productName} high quality realistic product showcase photo, modern style, clean lighting`;
          const imgResult = await generatePostImage({ prompt }, geminiKey);
          const ext = imgResult.mimeType.split("/")[1] ?? "png";
          const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

          const { error: uploadErr } = await supabase.storage
            .from("post-images")
            .upload(path, Buffer.from(imgResult.base64, "base64"), {
              contentType: imgResult.mimeType,
              upsert: false,
            });

          if (!uploadErr) {
            const { data } = supabase.storage.from("post-images").getPublicUrl(path);
            imageUrl = data.publicUrl;
          }
        }
      } catch {
        // ignore image gen failure and save post text
      }
    }

    const { data: inserted, error } = await supabase
      .from("tap_posts")
      .insert({
        user_id: user.id,
        product_id: input.productId || null,
        content: input.content,
        image_url: imageUrl,
        status: "draft",
      })
      .select("id")
      .single();

    if (error || !inserted) {
      return { error: error?.message || "게시글 저장에 실패했습니다." };
    }

    if (input.publishNow) {
      const { data: account, error: accErr } = await supabase
        .from("tap_accounts")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (accErr || !account) {
        return {
          postId: inserted.id,
          error: "게시글은 임시 저장되었으나, Threads 계정이 연결되지 않았습니다. [설정] 메뉴에서 계정을 연결해 주세요.",
        };
      }

      try {
        await publishPost({
          supabase,
          postId: inserted.id,
          userId: user.id,
          content: input.content,
          imageUrl: imageUrl,
          videoUrl: null,
          threadsUserId: account.threads_user_id,
          accessToken: account.access_token,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Threads 즉시 포스팅에 실패했습니다.";
        await supabase.from("tap_posts").update({ status: "failed", error_message: message }).eq("id", inserted.id);
        return { postId: inserted.id, error: `포스팅 실패: ${message}` };
      }
    }

    await logProgramUsage({
      userId: user.id,
      action: input.publishNow ? "publish_benchmark_post_direct" : "create_benchmark_post_direct",
      metadata: { postId: inserted.id, productName: input.productName },
    });

    return { postId: inserted.id };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "게시글 저장 실패" };
  }
}
