import "server-only";
import {
  fetchUrlText,
  fetchHtmlForLinks,
  extractArticleLinks,
  rewriteToScrapableListingUrl,
  pickRandom,
  newsblurLogin,
  fetchNewsblurStories,
  searchPerplexityTrending,
  structureCafeCandidates,
} from "@/lib/ai/collector";
import { resolveApiKey } from "@/lib/apiKeys";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { getNaverAccountOrError, getTargetOrError } from "@/lib/naver/account";
import { publishCafePost } from "@/lib/posts/publish-core";
import type { ScheduledSource } from "@/types/post";

type SupabaseLike = {
  from: (table: string) => any; // eslint-disable-line @typescript-eslint/no-explicit-any
};

/**
 * 등록된 글감 소스 1건에서 AI 콘텐츠 1건을 만든다. candidates.ts의 세 수집 방식(HTTP/RSS/
 * Perplexity)과 같은 원본 텍스트 수집 함수를 그대로 재사용하되, 예약 자동 실행은 매번
 * 정확히 1건만 만들도록 단순화했다 — 수동 "글감 수집"처럼 카테고리 페이지에서 최대 5건을
 * 한 번에 만들면 예약 주기마다 비용/게시량이 걷잡을 수 없이 늘어난다.
 */
async function collectRawText(
  supabase: SupabaseLike,
  userId: string,
  source: Pick<ScheduledSource, "source_type" | "source_input">,
  perplexityKey: string,
): Promise<string> {
  if (source.source_type === "http") {
    const listingUrl = rewriteToScrapableListingUrl(source.source_input);
    try {
      const html = await fetchHtmlForLinks(listingUrl);
      const links = extractArticleLinks(html, listingUrl);
      if (links.length >= 3) {
        const [picked] = pickRandom(links, 1);
        const text = await fetchUrlText(picked.url, 2500);
        return `[1] ${picked.title}\n${text}\n출처: ${picked.url}`;
      }
    } catch {
      // 목록 페이지로 못 읽으면 원래 URL을 개별 게시글로 간주하고 아래에서 바로 시도한다.
    }
    return fetchUrlText(source.source_input);
  }

  if (source.source_type === "rss") {
    const { data: account } = await supabase
      .from("newsblur_accounts")
      .select("username, password")
      .eq("user_id", userId)
      .maybeSingle();
    if (!account) throw new Error("NewsBlur 계정이 연결되어 있지 않습니다.");
    const sessionCookie = await newsblurLogin(account.username, account.password);
    const items = await fetchNewsblurStories(sessionCookie, source.source_input, 1);
    if (items.length === 0) throw new Error("가져올 새 글이 없습니다.");
    return items.map((item) => `[1] ${item.title}\n${item.text}\n출처: ${item.link}`).join("\n\n");
  }

  // perplexity
  return searchPerplexityTrending(source.source_input, perplexityKey);
}

/**
 * "🎲 후보함에서 랜덤 선택" 소스 전용 — 새로 AI를 호출해 콘텐츠를 만드는 대신, 회원이
 * "예약용 ON"으로 켜둔 게시글 후보(ncafe_candidates) 중 하나를 무작위로 골라 그대로
 * 재료로 쓴다. 한 번 뽑힌 후보는 다시 뽑히지 않도록 use_for_schedule을 꺼서 "소모"시킨다.
 */
async function pickFromCandidatePool(
  supabase: SupabaseLike,
  userId: string,
): Promise<{ title: string; content: string }> {
  const { data: candidates, error } = await supabase
    .from("ncafe_candidates")
    .select("id, title, content")
    .eq("user_id", userId)
    .eq("use_for_schedule", true);
  if (error) throw new Error(error.message);
  if (!candidates || candidates.length === 0) {
    throw new Error("예약용으로 켜둔(ON) 게시글 후보가 없습니다. 후보 목록에서 사용할 글감을 켜주세요.");
  }

  const picked = candidates[Math.floor(Math.random() * candidates.length)] as {
    id: string;
    title: string;
    content: string;
  };
  await supabase.from("ncafe_candidates").update({ use_for_schedule: false }).eq("id", picked.id);
  return { title: picked.title, content: picked.content };
}

/**
 * 예약 자동 실행 1회분 — 크론(app/api/cron/generate-and-post)과 "지금 실행" 수동 버튼
 * (lib/actions/scheduledSources.ts) 양쪽이 이 함수를 그대로 호출한다. auto_post가 켜져
 * 있으면 생성 즉시 실제 카페에 게시하고, 꺼져 있으면 초안(status='draft')으로만 저장해
 * /drafts에서 사람이 검수 후 배포하게 한다(사용자 지시, 2026-09-15).
 */
export async function runScheduledSource(
  supabase: SupabaseLike,
  userId: string,
  source: ScheduledSource,
): Promise<{ success: boolean; error?: string; postId?: string }> {
  try {
    const typedSupabase = supabase as unknown as SupabaseClient<Database>;

    let title: string;
    let content: string;

    if (source.source_type === "candidate_pool") {
      const picked = await pickFromCandidatePool(supabase, userId);
      title = picked.title;
      content = picked.content;
    } else {
      const [openaiKey, perplexityKey] = await Promise.all([
        resolveApiKey(typedSupabase, userId, "openai"),
        resolveApiKey(typedSupabase, userId, "perplexity"),
      ]);
      const rawText = await collectRawText(supabase, userId, source, perplexityKey ?? "");
      const [draft] = await structureCafeCandidates({ rawText, maxItems: 1, apiKey: openaiKey ?? "" });
      if (!draft) throw new Error("콘텐츠 생성 결과가 비어있습니다.");
      title = draft.title;
      content = draft.content;
    }

    const { data: inserted, error: insertError } = await supabase
      .from("ncafe_posts")
      .insert({ user_id: userId, target_id: source.target_id, title, content, status: "draft" })
      .select("id")
      .single();
    if (insertError || !inserted) throw new Error(insertError?.message ?? "글 저장에 실패했습니다.");

    if (source.auto_post) {
      const account = await getNaverAccountOrError(supabase, userId);
      const target = await getTargetOrError(supabase, userId, source.target_id);
      const outcome = await publishCafePost({
        supabase: typedSupabase,
        postId: inserted.id,
        userId,
        title,
        content,
        accessToken: account.access_token,
        clubId: target.club_id,
        menuId: target.menu_id,
      });
      if (!outcome.success) throw new Error(outcome.errorMessage ?? "게시에 실패했습니다.");
    }

    await supabase
      .from("ncafe_scheduled_sources")
      .update({ last_run_at: new Date().toISOString(), last_error: null })
      .eq("id", source.id);

    return { success: true, postId: inserted.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.";
    await supabase.from("ncafe_scheduled_sources").update({ last_error: message }).eq("id", source.id);
    return { success: false, error: message };
  }
}
