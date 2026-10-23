import "server-only";

/**
 * Perplexity로 도메인 소유 회사를 리서치한다. 원본 Make.com 시나리오의 "경쟁사 분석"
 * 모듈(sonar 모델)과 동일한 프롬프트를 재사용한다.
 */
export async function researchCompanyByDomain(domain: string, apiKey: string): Promise<string> {
  const response = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "sonar",
      messages: [
        {
          role: "system",
          content:
            "당신은 기업 리서치 전문가입니다. 사용자가 제공한 도메인 주소를 바탕으로 회사명을 확인하고, 해당 회사의 사업 분야, 핵심 서비스, 대표적인 제품 또는 플랫폼에 대한 정보를 요약해서 제공하세요. 정보는 가능한 경우 신뢰할 수 있는 웹사이트(예: 공식 홈페이지, LinkedIn, Crunchbase)에서 확인한 내용으로만 답변하세요.",
        },
        { role: "user", content: `도메인 주소: ${domain}` },
      ],
      temperature: 0.2,
      top_p: 0.9,
      return_citations: true,
    }),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Perplexity 호출에 실패했습니다 (${response.status}): ${text.slice(0, 300)}`);
  }
  const json = await response.json();
  return json.choices?.[0]?.message?.content ?? "";
}

/** Perplexity 리서치 원문에서 회사명만 뽑아낸다 (원본의 "회사 정보 추출" 모듈). */
export async function extractCompanyName(researchText: string, apiKey: string): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `제공하는 회사 정보를 분석하여 회사 이름만 출력하세요.\n\n**회사 이름만 출력하세요**\n\n<회사정보>\n${researchText}\n</회사정보>`,
        },
      ],
      temperature: 1,
    }),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`OpenAI 호출에 실패했습니다 (${response.status}): ${text.slice(0, 300)}`);
  }
  const json = await response.json();
  return (json.choices?.[0]?.message?.content ?? "").trim();
}
