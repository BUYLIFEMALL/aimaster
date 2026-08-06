"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { resolveApiKey } from "@/lib/apiKeys";
import {
  fetchUrlText,
  fetchHtmlForLinks,
  extractArticleLinks,
  rewriteToScrapableListingUrl,
  pickRandom,
  newsblurLogin,
  fetchNewsblurStories,
  searchPerplexityTrending,
  structureCandidates,
  type ShortsCandidateDraft,
} from "@/lib/ai/collector";
import type { ShortsSourceType } from "@/types/database.types";

export interface CollectState {
  error?: string;
  success?: boolean;
  count?: number;
}

async function insertCandidates(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  sourceType: ShortsSourceType,
  sourceInput: string,
  drafts: ShortsCandidateDraft[],
) {
  const { error } = await supabase.from("shorts_candidates").insert(
    drafts.map((d) => ({
      user_id: userId,
      source_type: sourceType,
      source_input: sourceInput,
      title: d.title,
      hook: d.hook ?? null,
      content: d.content,
      keywords: d.keywords ?? [],
    })),
  );
  if (error) throw new Error(error.message);
}

const CATEGORY_PAGE_MIN_LINKS = 3;
const CATEGORY_PAGE_PICK_COUNT = 5;

/**
 * 방식 1: HTTP — 주어진 URL이 특정 게시글이면 그 글로 쇼츠 주제 1건을,
 * 여러 게시글이 나열된 카테고리/목록 페이지(예: 네이버 뉴스 섹션)면
 * 그중 무작위 5건을 골라 각각 쇼츠 주제를 생성한다.
 */
export async function collectFromHttpAction(
  _prevState: CollectState,
  formData: FormData,
): Promise<CollectState> {
  const user = await requireUser();
  const url = String(formData.get("url") ?? "").trim();
  if (!url) return { error: "URL을 입력해주세요." };

  try {
    const supabase = await createClient();
    const apiKey = await resolveApiKey(supabase, user.id, "openai");
    const listingUrl = rewriteToScrapableListingUrl(url);
    const html = await fetchHtmlForLinks(listingUrl);
    const links = extractArticleLinks(html, listingUrl);

    if (links.length >= CATEGORY_PAGE_MIN_LINKS) {
      // 카테고리/목록 페이지로 판단 → 무작위 게시글 몇 건을 골라 각각 본문을 가져온다.
      const picked = pickRandom(links, CATEGORY_PAGE_PICK_COUNT);
      const articles = await Promise.all(
        picked.map(async (link) => {
          try {
            const text = await fetchUrlText(link.url, 2500);
            return { ...link, text };
          } catch {
            return null;
          }
        }),
      );
      const valid = articles.filter((a): a is { url: string; title: string; text: string } => !!a);
      if (valid.length === 0) {
        return { error: "선택된 게시글 내용을 가져오지 못했습니다." };
      }

      const rawText = valid
        .map((a, i) => `[${i + 1}] ${a.title}\n${a.text}\n출처: ${a.url}`)
        .join("\n\n");
      const drafts = await structureCandidates({ rawText, maxItems: valid.length, apiKey: apiKey ?? "" });
      await insertCandidates(supabase, user.id, "http", url, drafts);
      revalidatePath("/candidates");
      return { success: true, count: drafts.length };
    }

    // 개별 게시글 페이지
    const text = await fetchUrlText(url);
    const drafts = await structureCandidates({ rawText: text, maxItems: 1, apiKey: apiKey ?? "" });
    await insertCandidates(supabase, user.id, "http", url, drafts);
    revalidatePath("/candidates");
    return { success: true, count: drafts.length };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다." };
  }
}

/** 방식 2: RSS(NewsBlur) — 연결된 NewsBlur 계정에서 선택한 구독 피드의 최근 글로 쇼츠 주제 후보를 생성한다. */
export async function collectFromRssAction(
  _prevState: CollectState,
  formData: FormData,
): Promise<CollectState> {
  const user = await requireUser();
  const feedId = String(formData.get("feedId") ?? "").trim();
  const feedTitle = String(formData.get("feedTitle") ?? "").trim();
  if (!feedId) return { error: "구독 피드를 선택해주세요." };

  try {
    const supabase = await createClient();
    const { data: account } = await supabase
      .from("newsblur_accounts")
      .select("username, password")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!account) return { error: "먼저 NewsBlur 계정을 연결해주세요." };

    const apiKey = await resolveApiKey(supabase, user.id, "openai");
    const sessionCookie = await newsblurLogin(account.username, account.password);
    const items = await fetchNewsblurStories(sessionCookie, feedId, 5);
    if (items.length === 0) return { error: "가져올 글이 없습니다." };

    const rawText = items
      .map((item, i) => `[${i + 1}] ${item.title}\n${item.text}\n출처: ${item.link}`)
      .join("\n\n");
    const drafts = await structureCandidates({ rawText, maxItems: items.length, apiKey: apiKey ?? "" });
    await insertCandidates(supabase, user.id, "rss", feedTitle || feedId, drafts);
    revalidatePath("/candidates");
    return { success: true, count: drafts.length };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다." };
  }
}

/** 방식 3: Perplexity — 시드 주제로 현재 트렌딩 앵글을 찾아 쇼츠 주제 후보를 생성한다. */
export async function collectFromPerplexityAction(
  _prevState: CollectState,
  formData: FormData,
): Promise<CollectState> {
  const user = await requireUser();
  const topic = String(formData.get("topic") ?? "").trim();
  if (!topic) return { error: "주제를 입력해주세요." };

  try {
    const supabase = await createClient();
    const perplexityKey = await resolveApiKey(supabase, user.id, "perplexity");
    const openaiKey = await resolveApiKey(supabase, user.id, "openai");
    const trendText = await searchPerplexityTrending(topic, perplexityKey ?? "");
    const drafts = await structureCandidates({ rawText: trendText, maxItems: 5, apiKey: openaiKey ?? "" });
    await insertCandidates(supabase, user.id, "perplexity", topic, drafts);
    revalidatePath("/candidates");
    return { success: true, count: drafts.length };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다." };
  }
}

export async function deleteCandidateAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();

  await supabase.from("shorts_candidates").delete().eq("user_id", user.id).eq("id", id);

  revalidatePath("/candidates");
}
