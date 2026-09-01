import "server-only";

const KOREAN_REGEX = /[가-힣]/;

export function containsKorean(text: string): boolean {
  return KOREAN_REGEX.test(text);
}

async function callOpenAI(apiKey: string, prompt: string): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI 호출 실패 (${res.status})`);
  const data = await res.json();
  return (data.choices?.[0]?.message?.content ?? "").trim();
}

async function callGemini(apiKey: string, prompt: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0 } }),
    },
  );
  if (!res.ok) throw new Error(`Gemini 호출 실패 (${res.status})`);
  const data = await res.json();
  return (data.candidates?.[0]?.content?.parts?.[0]?.text ?? "").trim();
}

/**
 * 알리익스프레스 Affiliate API(aliexpress.affiliate.product.query)의 keywords
 * 파라미터는 한글 검색어를 사실상 무시한다 — 에러 없이 "Call succeeds"로 응답하지만
 * 키워드와 무관한 인기상품(판매량 기준 베스트셀러로 추정)을 반환한다. 실계정으로
 * 직접 확인됨(2026-09-01): "자전거 렌턴"/"자전거 랜턴" → 무관 상품, "bike light"/
 * "bicycle lantern" → 정확한 자전거 라이트 상품. 그래서 한글 키워드는 검색 전에
 * 영어로 번역한다. 번역용 AI 키가 없거나 번역이 실패하면 원본 키워드로 폴백한다
 * (전혀 검색을 안 하는 것보다는, 부정확하더라도 시도하는 편이 낫다는 판단).
 */
export async function translateToEnglishKeyword(
  keyword: string,
  keys: { openai?: string | null; gemini?: string | null },
): Promise<{ keyword: string; translated: boolean }> {
  if (!containsKorean(keyword)) return { keyword, translated: false };
  if (!keys.openai && !keys.gemini) return { keyword, translated: false };

  const prompt = `다음 한글 쇼핑 검색어를 알리익스프레스(AliExpress)에서 검색하기 좋은 간결한 영어 검색어 1개로 번역해줘. 설명이나 따옴표 없이 번역된 영어 검색어만 출력해:\n"${keyword}"`;

  try {
    const result = keys.openai ? await callOpenAI(keys.openai, prompt) : await callGemini(keys.gemini!, prompt);
    const cleaned = result.replace(/^["'“”]|["'“”]$/g, "").trim();
    return cleaned ? { keyword: cleaned, translated: true } : { keyword, translated: false };
  } catch {
    return { keyword, translated: false };
  }
}
