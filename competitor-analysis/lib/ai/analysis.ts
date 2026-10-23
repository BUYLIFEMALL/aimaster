import "server-only";
import type { SerpResultItem } from "@/lib/serp/client";

interface AnalysisInput {
  keyword: string;
  items: (SerpResultItem & { domain: string | null })[];
  competitorNames: Map<string, string | null>; // domain -> company_name
}

function formatItemsForPrompt(input: AnalysisInput): string {
  const lines = input.items.map((item) => {
    const companyName = item.domain ? input.competitorNames.get(item.domain) : null;
    return `- [${item.resultType}] ${item.title ?? "(제목 없음)"} | 도메인: ${item.domain ?? "-"}${
      companyName ? ` (${companyName})` : ""
    } | ${item.snippet ?? ""}`;
  });
  return lines.join("\n");
}

/**
 * GPT-4o로 키워드 단위 심층 분석을 생성한다. 원본 Make.com 시나리오의
 * "경쟁사 데이터분석" 모듈과 동일한 프롬프트 구조를 재사용하되, Google Docs를
 * 거치지 않고 DB에서 바로 조회한 데이터를 그대로 전달한다.
 */
export async function analyzeKeywordCompetitors(input: AnalysisInput, apiKey: string): Promise<string> {
  const dataBlock = formatItemsForPrompt(input);

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: `제공하는 "${input.keyword}" 키워드 검색 데이터를 깊게 분석하여 결과를 도출하세요.\n\n<결과>\n* 검색 데이터를 요약하세요.\n* 주요 경쟁사/USP/콘텐츠 아이디어를 분석 보고서를 작성하세요.\n* 광고(ad)로 노출 중인 곳은 자본을 들여 이 키워드를 공략하는 경쟁사이니 별도로 짚어주세요.\n* PAA(사람들이 함께 묻는 질문)는 아직 다뤄지지 않은 콘텐츠 기회로 짚어주세요.\n</결과>\n\n${dataBlock}`,
        },
      ],
      temperature: 1,
    }),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`OpenAI 분석 호출에 실패했습니다 (${response.status}): ${text.slice(0, 300)}`);
  }
  const json = await response.json();
  return json.choices?.[0]?.message?.content ?? "";
}
