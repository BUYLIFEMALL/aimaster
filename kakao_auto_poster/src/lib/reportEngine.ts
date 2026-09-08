import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { resolveApiKey } from "@/lib/apiKeys";
import { searchPerplexityInfo, structureKakaoReport } from "@/lib/ai/collector";
import { requestTelegramReviewForReport } from "@/lib/telegramReview";
import { notifyReportByEmail } from "@/lib/emailNotify";
import { sendReportToKakaoCore } from "@/lib/kakaoSend";

export interface TopicForGeneration {
  id: string;
  topic_name: string;
  keywords: string[];
  lookback_days: number;
  notify_channels: string[];
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

  // 주제별 알림 채널 칩(카카오톡/텔레그램/이메일, TopicRow.tsx) 선택에 따라 각각
  // 독립적으로 보낸다 — trending-product-finder의 SourcingAlertControls.tsx와 동일한
  // 방식. 카카오톡을 켜두면 검토 없이 즉시 발행된다(사용자 명시 지시) — 텔레그램을
  // 같이 켜둔 경우 승인 요청 메시지도 별도로 가는데, 이미 발행된 뒤라 그 버튼은
  // 형식상 의미가 없어진다는 점은 참고.
  if (topic.notify_channels.includes("kakao")) {
    await sendReportToKakaoCore(supabase, userId, inserted.id);
  }

  if (topic.notify_channels.includes("telegram")) {
    await requestTelegramReviewForReport(supabase, userId, inserted);
  }

  // 이메일은 순수 알림이라(승인/거부 같은 필수 액션이 없음) 예약 자동 생성분에만 보낸다 —
  // "지금 생성" 버튼은 이미 화면을 보고 있어 중복 알림이라 제외(trending-product-finder
  // Phase 10과 동일한 판단). 관리자 클라이언트가 필요해 여기서 새로 만든다(전달받은
  // supabase는 수동 생성 시 사용자 세션 클라이언트라 auth.admin API를 쓸 수 없다).
  if (generatedVia === "scheduled" && topic.notify_channels.includes("email")) {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    await notifyReportByEmail(createAdminClient(), userId, inserted);
  }

  return { reportId: inserted.id };
}
