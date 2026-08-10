import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

// 기존 Make 시나리오는 매물마다 Perplexity를 호출해서 낭비가 컸다 (같은 자치구면 결과가
// 거의 같은데도 매번 재호출). 자치구+날짜 단위로 캐싱해서 하루 1회만 호출하도록 개선했다.
export async function getDistrictSentiment(
  supabase: SupabaseClient<Database>,
  sggNm: string,
  perplexityApiKey: string,
): Promise<string> {
  const today = new Date().toISOString().slice(0, 10);

  const { data: cached } = await supabase
    .from("real_estate_district_sentiment")
    .select("content")
    .eq("sgg_nm", sggNm)
    .eq("sentiment_date", today)
    .maybeSingle();

  if (cached?.content) return cached.content;

  const content = await fetchMarketSentiment(sggNm, perplexityApiKey);

  await supabase
    .from("real_estate_district_sentiment")
    .upsert(
      { sgg_nm: sggNm, sentiment_date: today, content },
      { onConflict: "sgg_nm,sentiment_date" },
    );

  return content;
}

async function fetchMarketSentiment(sggNm: string, apiKey: string): Promise<string> {
  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "sonar",
      messages: [
        {
          role: "user",
          content: `오늘(${new Date().toISOString().slice(0, 10)}) 기준 한국의 부동산 정책에 따른 분위기와 ${sggNm}의 부동산 분위기를 조사하라`,
        },
      ],
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Perplexity 요청 실패 (${res.status}): ${body}`);
  }

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Perplexity가 빈 응답을 반환했습니다.");
  return content;
}
