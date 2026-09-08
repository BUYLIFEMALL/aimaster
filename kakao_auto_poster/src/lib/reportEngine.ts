import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { resolveApiKey } from "@/lib/apiKeys";
import { searchPerplexityInfo, structureKakaoReport } from "@/lib/ai/collector";
import { requestTelegramReviewForReport } from "@/lib/telegramReview";

export interface TopicForGeneration {
  id: string;
  topic_name: string;
  keywords: string[];
  lookback_days: number;
}

/**
 * 주제 1건에 대해 리포트를 생성하는 핵심 로직. "지금 생성" 수동 버튼(lib/actions/topics.ts)과
 * Phase 3 예약 자동 생성 크론(app/api/cron/generate-reports/route.ts) 양쪽이 이 함수를
 * 공유한다 — trending-product-finder의 lib/reportEngine.ts와 동일한 분리 패턴.
 */
export async function generateReportForTopic(
  supabase: SupabaseClient<Database>,
  userId: string,
  topic: TopicForGeneration,
  generatedVia: "manual" | "scheduled",
): Promise<{ reportId: string }> {
  const perplexityKey = await resolveApiKey(supabase, userId, "perplexity");
  const openaiKey = await resolveApiKey(supabase, userId, "openai");

  const rawText = await searchPerplexityInfo(topic.topic_name, topic.keywords, perplexityKey ?? "", topic.lookback_days);
  const draft = await structureKakaoReport({ rawText, apiKey: openaiKey ?? "" });

  const { data: inserted, error: insertError } = await supabase
    .from("kakao_reports")
    .insert({
      user_id: userId,
      topic_id: topic.id,
      title: draft.title,
      summary: draft.summary,
      content: draft.content,
      generated_via: generatedVia,
    })
    .select("id, title, summary")
    .single();

  if (insertError || !inserted) throw new Error(insertError?.message ?? "리포트 저장에 실패했습니다.");

  await requestTelegramReviewForReport(supabase, userId, inserted);

  return { reportId: inserted.id };
}
