"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess, logProgramUsage } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { resolveApiKey } from "@/lib/apiKeys";
import { fetchSerpContext } from "@/lib/serp/client";
import { extractRelatedKeywords, extractLongtailExpansions, generateWorkMessage } from "@/lib/ai/expansion";
import { sendTelegramMessage } from "@/lib/telegram/client";

export interface RunExpansionState {
  error?: string;
  needsApiKey?: string; // "serpapi" | "openai"
  runId?: string;
}

/**
 * 원본 Make.com 시나리오의 전체 흐름(SerpApi 검색 → 연관 키워드 추출 → 롱테일 확장 →
 * 블로그 작업 지시 메시지 → 알림 발송)을 서버 액션 하나로 처리한다. Google Docs 중간 저장은
 * 쓰지 않고, SerpApi 응답을 바로 텍스트로 정리해서 GPT에 전달한다.
 */
export async function runKeywordExpansionAction(seedId: string): Promise<RunExpansionState> {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { data: seed } = await supabase
    .from("longtail_seed_keywords")
    .select("*")
    .eq("id", seedId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!seed) return { error: "키워드를 찾을 수 없습니다." };

  const serpApiKey = await resolveApiKey(supabase, user.id, "serpapi");
  if (!serpApiKey) return { needsApiKey: "serpapi" };
  const openaiKey = await resolveApiKey(supabase, user.id, "openai");
  if (!openaiKey) return { needsApiKey: "openai" };

  try {
    const serpContext = await fetchSerpContext(seed.engine, seed.keyword, serpApiKey);

    const relatedResults = await extractRelatedKeywords(seed.keyword, serpContext.contextText, openaiKey);

    let relatedRows: { id: string; keyword: string }[] = [];
    if (relatedResults.length > 0) {
      const { data, error } = await supabase
        .from("longtail_related_keywords")
        .upsert(
          relatedResults.map((r) => ({
            user_id: user.id,
            seed_id: seed.id,
            keyword: r.keyword,
            relevance_score: r.relevance_score,
            updated_at: new Date().toISOString(),
          })),
          { onConflict: "seed_id,keyword" },
        )
        .select("id, keyword");
      if (error) return { error: error.message };
      relatedRows = data ?? [];
    }

    const longtailResults = await extractLongtailExpansions(
      seed.keyword,
      relatedRows.map((r) => r.keyword),
      openaiKey,
    );

    const relatedIdByKeyword = new Map(relatedRows.map((r) => [r.keyword.trim().toLowerCase(), r.id]));
    const expansionRows = longtailResults.flatMap((group) =>
      group.longtail_keywords.map((keyword) => ({
        user_id: user.id,
        seed_id: seed.id,
        related_id: relatedIdByKeyword.get(group.original_keyword.trim().toLowerCase()) ?? null,
        keyword,
      })),
    );

    if (expansionRows.length > 0) {
      const { error } = await supabase
        .from("longtail_expansions")
        .upsert(expansionRows, { onConflict: "seed_id,keyword" });
      if (error) return { error: error.message };
    }

    const summaryText = await generateWorkMessage(
      seed.keyword,
      relatedRows.map((r) => r.keyword),
      expansionRows.map((r) => r.keyword),
      openaiKey,
    );

    const { data: run, error: runError } = await supabase
      .from("longtail_runs")
      .insert({
        user_id: user.id,
        seed_id: seed.id,
        related_count: relatedRows.length,
        expansion_count: expansionRows.length,
        summary_text: summaryText,
      })
      .select("id")
      .single();
    if (runError || !run) return { error: runError?.message ?? "실행 결과 저장에 실패했습니다." };

    const { data: telegramLink } = await supabase
      .from("user_telegram_links")
      .select("bot_token, chat_id")
      .eq("user_id", user.id)
      .eq("program_slug", "longtail-keyword-expander")
      .maybeSingle();
    if (telegramLink) {
      try {
        await sendTelegramMessage({
          botToken: telegramLink.bot_token,
          chatId: telegramLink.chat_id,
          text: `🧩 "${seed.keyword}" 키워드 확장이 끝났어요.\n연관 키워드 ${relatedRows.length}개, 롱테일 키워드 ${expansionRows.length}개를 찾았어요.\n\n${summaryText}`,
        });
      } catch (err) {
        console.error("텔레그램 알림 발송 실패:", err);
      }
    }

    await logProgramUsage({
      userId: user.id,
      action: "run_keyword_expansion",
      metadata: { keyword: seed.keyword, relatedCount: relatedRows.length, expansionCount: expansionRows.length },
    });

    revalidatePath("/seeds");
    revalidatePath(`/seeds/${seed.id}`);
    revalidatePath("/runs");
    return { runId: run.id };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "키워드 확장 중 오류가 발생했습니다." };
  }
}
