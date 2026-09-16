"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { resolveApiKey } from "@/lib/apiKeys";
import { getCandidateCategoryMap, saveCandidateCategoryMap } from "@/lib/actions/categories";
import {
  fetchUrlText,
  fetchHtmlForLinks,
  extractArticleLinks,
  rewriteToScrapableListingUrl,
  pickRandom,
  newsblurLogin,
  fetchNewsblurStories,
  searchPerplexityTrending,
  structureThreadsCandidates,
  type ThreadsCandidateDraft,
} from "@/lib/ai/collector";
import type { ThreadsSourceType } from "@/types/database.types";

export interface CollectState {
  error?: string;
  success?: boolean;
  count?: number;
}

export interface MoveCandidatesState {
  error?: string;
  count?: number;
}

export async function moveCandidatesToCategoryAction(formData: FormData): Promise<MoveCandidatesState> {
  const user = await requireProgramAccess();
  const ids = formData.getAll("ids").map(String).filter(Boolean);
  const categoryId = String(formData.get("categoryId") ?? "").trim() || null;

  if (ids.length === 0) return { error: "이동할 글감 후보를 선택해주세요." };

  const supabase = await createClient();

  // 1차 시도: threads_candidates DB 테이블
  try {
    const { error } = await supabase
      .from("threads_candidates")
      .update({ category_id: categoryId })
      .in("id", ids)
      .eq("user_id", user.id);

    if (!error) {
      revalidatePath("/candidates");
      return { count: ids.length };
    }
  } catch {
    // fallback 진행
  }

  // 2차 Fallback: user_api_keys 저장소 활용 매핑 저장
  try {
    const currentMap = await getCandidateCategoryMap(supabase, user.id);
    const updatedMap = { ...currentMap };
    ids.forEach((id) => {
      if (categoryId) {
        updatedMap[id] = categoryId;
      } else {
        delete updatedMap[id];
      }
    });
    await saveCandidateCategoryMap(supabase, user.id, updatedMap);

    revalidatePath("/candidates");
    return { count: ids.length };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "카테고리 이동에 실패했습니다." };
  }
}

async function insertCandidates(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  sourceType: ThreadsSourceType,
  sourceInput: string,
  drafts: ThreadsCandidateDraft[],
  categoryId?: string | null,
) {
  const now = Date.now();
  
  // 1. 후보 insert
  const { data: inserted, error } = await supabase
    .from("threads_candidates")
    .insert(
      drafts.map((d, i) => ({
        user_id: userId,
        source_type: sourceType,
        source_input: sourceInput,
        title: d.title,
        content: d.content,
        keywords: d.keywords ?? [],
        category_id: categoryId || null,
        created_at: new Date(now - i).toISOString(),
      })),
    )
    .select("id");

  if (error) {
    // category_id 컬럼 없이 insert 시도 시 fallback 구문으로 재시도
    if (error.code === "42703" || error.message?.includes("category_id")) {
      const { data: retryData, error: retryErr } = await supabase
        .from("threads_candidates")
        .insert(
          drafts.map((d, i) => ({
            user_id: userId,
            source_type: sourceType,
            source_input: sourceInput,
            title: d.title,
            content: d.content,
            keywords: d.keywords ?? [],
            created_at: new Date(now - i).toISOString(),
          })),
        )
        .select("id");

      if (retryErr) throw new Error(retryErr.message);

      if (categoryId && retryData) {
        const currentMap = await getCandidateCategoryMap(supabase, userId);
        const updatedMap = { ...currentMap };
        retryData.forEach((row) => {
          updatedMap[row.id] = categoryId;
        });
        await saveCandidateCategoryMap(supabase, userId, updatedMap);
      }
      return;
    }
    throw new Error(error.message);
  }

  // DB에 category_id가 포함 정상 저장 및 Fallback 백업도 함께 저장
  if (categoryId && inserted) {
    try {
      const currentMap = await getCandidateCategoryMap(supabase, userId);
      const updatedMap = { ...currentMap };
      inserted.forEach((row) => {
        updatedMap[row.id] = categoryId;
      });
      await saveCandidateCategoryMap(supabase, userId, updatedMap);
    } catch {
      // ignore
    }
  }
}

const CATEGORY_PAGE_MIN_LINKS = 3;
const CATEGORY_PAGE_PICK_COUNT = 5;

/**
 * 방식 1: HTTP — 주어진 URL이 특정 게시글이면 그 글로 게시글 주제 1건을,
 * 여러 게시글이 나열된 카테고리/목록 페이지(예: 네이버 뉴스 섹션)면
 * 그중 무작위 5건을 골라 각각 게시글 주제를 생성한다.
 */
export async function collectFromHttpAction(
  _prevState: CollectState,
  formData: FormData,
): Promise<CollectState> {
  const user = await requireProgramAccess();
  const url = String(formData.get("url") ?? "").trim();
  const categoryId = String(formData.get("categoryId") ?? "").trim() || null;
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
      const drafts = await structureThreadsCandidates({ rawText, maxItems: valid.length, apiKey: apiKey ?? "" });
      await insertCandidates(supabase, user.id, "http", url, drafts, categoryId);
      revalidatePath("/candidates");
      return { success: true, count: drafts.length };
    }

    // 개별 게시글 페이지
    const text = await fetchUrlText(url);
    const drafts = await structureThreadsCandidates({ rawText: text, maxItems: 1, apiKey: apiKey ?? "" });
    await insertCandidates(supabase, user.id, "http", url, drafts, categoryId);
    revalidatePath("/candidates");
    return { success: true, count: drafts.length };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다." };
  }
}

/** 방식 2: RSS(NewsBlur) — 연결된 NewsBlur 계정에서 선택한 구독 피드의 최근 글로 게시글 주제 후보를 생성한다. */
export async function collectFromRssAction(
  _prevState: CollectState,
  formData: FormData,
): Promise<CollectState> {
  const user = await requireProgramAccess();
  const feedId = String(formData.get("feedId") ?? "").trim();
  const feedTitle = String(formData.get("feedTitle") ?? "").trim();
  const categoryId = String(formData.get("categoryId") ?? "").trim() || null;
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
    const drafts = await structureThreadsCandidates({ rawText, maxItems: items.length, apiKey: apiKey ?? "" });
    await insertCandidates(supabase, user.id, "rss", feedTitle || feedId, drafts, categoryId);
    revalidatePath("/candidates");
    return { success: true, count: drafts.length };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다." };
  }
}

/** 방식 3: Perplexity — 시드 주제로 현재 트렌딩 앵글을 찾아 게시글 주제 후보를 생성한다. */
export async function collectFromPerplexityAction(
  _prevState: CollectState,
  formData: FormData,
): Promise<CollectState> {
  const user = await requireProgramAccess();
  const topic = String(formData.get("topic") ?? "").trim();
  const categoryId = String(formData.get("categoryId") ?? "").trim() || null;
  if (!topic) return { error: "주제를 입력해주세요." };

  try {
    const supabase = await createClient();
    const perplexityKey = await resolveApiKey(supabase, user.id, "perplexity");
    if (!perplexityKey) {
      return {
        error: "Perplexity API 키가 등록되어 있지 않습니다. [설정 페이지](/settings)에서 Perplexity API 키(pplx-...)를 먼저 등록해 주세요.",
      };
    }

    const openaiKey = await resolveApiKey(supabase, user.id, "openai");
    const trendText = await searchPerplexityTrending(topic, perplexityKey);
    const drafts = await structureThreadsCandidates({ rawText: trendText, maxItems: 5, apiKey: openaiKey ?? "" });
    await insertCandidates(supabase, user.id, "perplexity", topic, drafts, categoryId);
    revalidatePath("/candidates");
    return { success: true, count: drafts.length };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.";
    if (msg.includes("401") || msg.includes("invalid_api_key") || msg.includes("Invalid API key")) {
      return {
        error: "Perplexity API 키가 유효하지 않습니다(401). [설정 페이지](/settings)에서 발급받으신 Perplexity API 키(pplx-...)를 다시 입력해 주세요.",
      };
    }
    return { error: msg };
  }
}

export async function deleteCandidateAction(formData: FormData) {
  const user = await requireProgramAccess();
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();

  await supabase.from("threads_candidates").delete().eq("user_id", user.id).eq("id", id);

  revalidatePath("/candidates");
}
