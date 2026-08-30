import "server-only";

export interface OpportunityInput {
  keyword: string;
  trendIndex: number | null; // 0~100, 데이터랩 상대 지수 최근값
  trendChangePct: number | null; // 전 구간 대비 변화율(%)
  productCount: number | null; // 네이버쇼핑 등록 상품 수(경쟁도 프록시)
  minPrice: number | null;
  maxPrice: number | null;
}

export interface OpportunityResult extends OpportunityInput {
  opportunityScore: number; // 0~100
}

/**
 * 기회 점수는 AI가 아니라 코드로 결정적으로 계산한다(재현 가능성/신뢰성을 위해).
 * AI는 이 숫자들을 근거로 한 "추천 사유" 문장 생성에만 쓴다.
 *
 * score = 관심도(트렌드 지수) * 0.5 + 상승폭 보너스 * 0.3 - 경쟁도 페널티 * 0.2
 */
export function calcOpportunityScore(input: OpportunityInput): number {
  const trendPart = (input.trendIndex ?? 0) * 0.5;

  const changePct = input.trendChangePct ?? 0;
  const changeBonus = Math.max(0, Math.min(changePct, 100)) * 0.3;

  const competitionIndex = input.productCount != null ? Math.min(input.productCount / 10000, 1) * 100 : 50;
  const competitionPenalty = competitionIndex * 0.2;

  const raw = trendPart + changeBonus - competitionPenalty;
  return Math.max(0, Math.min(100, Math.round(raw * 10) / 10));
}

function buildPrompt(items: OpportunityResult[]): string {
  const rows = items
    .map(
      (i) =>
        `- ${i.keyword}: 관심도지수=${i.trendIndex ?? "N/A"}, 변화율=${
          i.trendChangePct != null ? i.trendChangePct.toFixed(1) + "%" : "N/A"
        }, 등록상품수=${i.productCount ?? "N/A"}, 가격대=${i.minPrice ?? "?"}~${i.maxPrice ?? "?"}원, 기회점수=${i.opportunityScore}`,
    )
    .join("\n");

  return `당신은 이커머스 상품 소싱 전문가입니다. 아래는 네이버 데이터랩(관심도 지수)과 네이버쇼핑(등록 상품 수·가격대)에서 수집한 키워드별 지표입니다.

${rows}

각 키워드에 대해, 왜 지금 소싱을 고려할 만한지(또는 만하지 않은지) 1~2문장의 한글 추천 사유를 작성하세요. 관심도가 오르는데 등록 상품 수(경쟁)가 적으면 "기회"로, 관심도는 높지만 경쟁도 매우 치열하면 "레드오션 주의"로, 관심도가 낮으면 "시기상조"로 판단하는 식으로 구체적인 숫자를 근거로 설명하세요.

반드시 아래 JSON 배열 형식으로만 응답하세요 (다른 텍스트 없이):
[{"keyword": "키워드명", "reason": "추천 사유 문장"}]`;
}

interface ReasonItem {
  keyword: string;
  reason: string;
}

async function callOpenAI(apiKey: string, prompt: string): Promise<ReasonItem[]> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.4,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI 호출 실패 (${res.status})`);
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? "[]";
  return parseReasonItems(content);
}

async function callGemini(apiKey: string, prompt: string): Promise<ReasonItem[]> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, responseMimeType: "application/json" },
      }),
    },
  );
  if (!res.ok) throw new Error(`Gemini 호출 실패 (${res.status})`);
  const data = await res.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";
  return parseReasonItems(content);
}

function parseReasonItems(content: string): ReasonItem[] {
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed.items)) return parsed.items;
    return [];
  } catch {
    return [];
  }
}

/** OpenAI 또는 Gemini 중 등록된 키로 추천 사유를 생성한다. 둘 다 없으면 null을 반환한다. */
export async function generateReasons(
  items: OpportunityResult[],
  keys: { openai?: string | null; gemini?: string | null },
): Promise<Map<string, string>> {
  const prompt = buildPrompt(items);
  let reasons: ReasonItem[] = [];

  if (keys.openai) {
    reasons = await callOpenAI(keys.openai, prompt);
  } else if (keys.gemini) {
    reasons = await callGemini(keys.gemini, prompt);
  }

  return new Map(reasons.map((r) => [r.keyword, r.reason]));
}
