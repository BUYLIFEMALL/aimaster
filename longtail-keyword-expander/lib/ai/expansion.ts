import "server-only";

/** LLM은 오늘 날짜를 모르므로(경쟁사 키워드 분석에서 "© 2024" 하드코딩 버그를 겪은 것과
 * 동일한 문제 — 원본 시나리오도 "현재 연도는 2025년 기준"을 프롬프트에 하드코딩해뒀었다),
 * 실제 호출 시점의 날짜를 프롬프트에 동적으로 주입한다. */
function todayKorean(): string {
  const now = new Date();
  return `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일`;
}

async function callOpenAiJson(params: { model: string; system: string; user: string; apiKey: string }): Promise<any> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${params.apiKey}` },
    body: JSON.stringify({
      model: params.model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: params.system },
        { role: "user", content: params.user },
      ],
    }),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`OpenAI 호출에 실패했습니다 (${response.status}): ${text.slice(0, 300)}`);
  }
  const json = await response.json();
  const content = json.choices?.[0]?.message?.content ?? "{}";
  try {
    return JSON.parse(content);
  } catch {
    throw new Error("OpenAI 응답을 JSON으로 해석하지 못했습니다.");
  }
}

export interface RelatedKeywordResult {
  keyword: string;
  relevance_score: number;
}

/** 1단계: SERP 데이터에서 연관 키워드를 추출한다 (원본 시나리오의 "연관 키워드 추출" 모듈). */
export async function extractRelatedKeywords(
  keyword: string,
  serpContextText: string,
  apiKey: string,
): Promise<RelatedKeywordResult[]> {
  const result = await callOpenAiJson({
    model: "gpt-4o-mini",
    apiKey,
    system:
      "당신은 세계적인 데이터 분석가입니다. 주어진 키워드와 그 검색결과 데이터를 바탕으로 연관 키워드를 도출하는 것이 임무입니다. 제목/요약에 반복적으로 등장하는 주제나 개념에 주목하세요. 결과는 반드시 JSON 객체로만 출력하세요: {\"results\": [{\"keyword\": \"연관 키워드\", \"relevance_score\": 0.0~1.0 사이 숫자}]}. XML 태그는 쓰지 마세요.",
    user: `오늘 날짜: ${todayKorean()}\n\n메인 키워드: ${keyword}\n\n검색결과 데이터:\n${serpContextText}`,
  });
  const results = Array.isArray(result?.results) ? result.results : [];
  return results
    .filter((r: any) => typeof r?.keyword === "string" && r.keyword.trim())
    .map((r: any) => ({
      keyword: String(r.keyword).trim(),
      relevance_score: typeof r.relevance_score === "number" ? r.relevance_score : 0.5,
    }));
}

export interface LongtailExpansionResult {
  original_keyword: string;
  longtail_keywords: string[];
}

/** 2단계: 메인 키워드 + 연관 키워드 각각을 롱테일 키워드로 확장한다. */
export async function extractLongtailExpansions(
  keyword: string,
  relatedKeywords: string[],
  apiKey: string,
): Promise<LongtailExpansionResult[]> {
  const keywordList = [keyword, ...relatedKeywords].map((k) => `- ${k}`).join("\n");
  const result = await callOpenAiJson({
    model: "gpt-4o-mini",
    apiKey,
    system:
      `당신은 한국어 SEO 전문가입니다. 오늘 날짜는 ${todayKorean()}입니다 — 반드시 이 실제 날짜/연도를 기준으로 판단하고, 다른 연도를 지어내지 마세요. 주어진 메인 키워드와 연관 키워드 각각에 대해, 경쟁이 상대적으로 낮으면서 더 구체적인 롱테일 키워드를 1~2개씩 만드세요. 지역/시기/구체적 상황을 포함하면 좋습니다. 결과는 반드시 JSON 객체로만 출력하세요: {\"results\": [{\"original_keyword\": \"원본 키워드\", \"longtail_keywords\": [\"롱테일1\", \"롱테일2\"]}]}. XML 태그는 쓰지 마세요.`,
    user: `키워드 목록:\n${keywordList}`,
  });
  const results = Array.isArray(result?.results) ? result.results : [];
  return results
    .filter((r: any) => typeof r?.original_keyword === "string" && Array.isArray(r?.longtail_keywords))
    .map((r: any) => ({
      original_keyword: String(r.original_keyword).trim(),
      longtail_keywords: r.longtail_keywords.filter((k: unknown) => typeof k === "string" && k.trim()).map((k: string) => k.trim()),
    }));
}

/** 3단계: Seed/연관/롱테일 키워드 전체를 바탕으로 블로그 담당자용 작업 지시 메시지를 만든다. */
export async function generateWorkMessage(
  keyword: string,
  relatedKeywords: string[],
  longtailKeywords: string[],
  apiKey: string,
): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "당신은 블로그 담당자에게 작업 지시를 전달하는 콘텐츠 기획자입니다. 마크다운 형식(굵게, 목록 등)을 써서 한국어로 작성하세요. 메인 키워드의 중요성, 연관 키워드 활용법, 롱테일 키워드로 더 구체적인 콘텐츠를 만드는 방법을 설명하고, 블로그 글 아이디어를 3~5개 제안하세요.",
        },
        {
          role: "user",
          content: `오늘 날짜: ${todayKorean()}\n\n메인 키워드: ${keyword}\n\n연관 키워드: ${relatedKeywords.join(", ") || "(없음)"}\n\n롱테일 키워드: ${longtailKeywords.join(", ") || "(없음)"}`,
        },
      ],
    }),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`OpenAI 호출에 실패했습니다 (${response.status}): ${text.slice(0, 300)}`);
  }
  const json = await response.json();
  return json.choices?.[0]?.message?.content ?? "";
}
