import "server-only";

// insta_auto_poster/src/lib/ai/collector.ts의 Perplexity 검색 패턴을 그대로 재사용하되,
// "SNS 화제 이슈"가 아니라 "뉴스/정보/정책/트렌드 분석"에 맞춘 프롬프트로 바꿨다
// (docs/PLATFORM_PATTERNS.md §2 "AI 콘텐츠 3종 수집 패턴" 참고).

const PERPLEXITY_SYSTEM_PROMPT = `당신은 최근 소식을 정확하게 조사해서 전달하는 전문 리서처입니다.
주어진 주제/키워드와 관련해서 최근 1~2주 이내 발생한 뉴스, 정책 변화, 트렌드, 통계, 전문가 분석 중
사람들에게 실질적으로 도움이 될 만한 내용을 최대 5건 찾아서, 각각에 대해
- 핵심 내용 요약
- 출처(가능하면 URL과 매체명)
- 언제 발생/발표된 일인지
- 이게 왜 독자에게 중요한지
를 정리해서 알려주세요. 확인되지 않은 내용을 지어내지 마세요. 광고성 정보나 특정 상품 홍보는 배제하고,
객관적 사실과 공신력 있는 출처 기반의 정보만 다루세요.`;

/** Perplexity 방식: 주어진 주제+키워드로 최신 뉴스/정보/정책/트렌드를 검색한다. */
export async function searchPerplexityInfo(
  topicName: string,
  keywords: string[],
  apiKey: string,
): Promise<string> {
  if (!apiKey) {
    throw new Error("Perplexity API 키가 없습니다. 설정 > API 키 설정에서 본인의 Perplexity API 키를 등록해주세요.");
  }

  const query = `주제: ${topicName}\n관련 키워드: ${keywords.join(", ")}`;

  const response = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "sonar-pro",
      messages: [
        { role: "system", content: PERPLEXITY_SYSTEM_PROMPT },
        { role: "user", content: query },
      ],
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Perplexity 검색 요청이 실패했습니다. (${response.status}) ${errorBody}`);
  }

  const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("Perplexity가 빈 응답을 반환했습니다.");
  }
  return content;
}

export interface KakaoReportDraft {
  title: string;
  summary: string;
  content: string;
}

// 카카오톡 메시지(친구톡/브랜드메시지) 글자수 제약 때문에 report 하나를 "제목 + 짧은 요약(카카오
// 발송용) + 전체 분량 본문(웹 리포트 페이지용)"으로 나눠서 생성한다 — trending-product-finder의
// buildReportText() 압축 포맷과 동일한 설계(§ Phase 2에서 실제 발송에 summary를 쓴다).
const STRUCTURE_SYSTEM_PROMPT = `너는 뉴스/정보 콘텐츠 에디터야. 너의 개인적인 의견은 넣지 마.
주어진 원본 리서치 자료를 바탕으로, 실제로 존재하는 사실만 사용해서 독자에게 유용한 정보성
콘텐츠 1건을 만들어. 절대 지어내지 마.

아래 규칙을 반드시 지켜서 작성해:
1. title: 핵심 내용을 한눈에 알 수 있는 제목, 30자 이내
2. summary: 카카오톡 메시지로 바로 보낼 짧은 요약. 3~5개의 핵심 포인트를 "• "로 시작하는 줄로
   나눠서 작성하고, 각 줄은 60자 이내로. 전체 summary는 300자를 넘기지 마
3. content: 웹 페이지에 실릴 전체 분량 본문. 배경 설명, 구체적 수치나 사례, 왜 중요한지에 대한
   해설, 출처를 포함해서 1200~2000자 분량의 이해하기 쉬운 글로 작성해. 4~6개 문단으로 나누고
   문단 사이에는 줄바꿈을 두 번(JSON 문자열 안에서 \\n\\n) 넣어
4. 정중한 존댓말(-습니다/-합니다체)로 작성해. 반말이나 지나치게 캐주얼한 말투는 쓰지 마
5. 마크다운 문법(#, *, -, ** 등)은 쓰지 말고 일반 텍스트로만 작성해(summary의 "• "는 예외)
6. 사실관계가 불확실한 내용은 "~로 알려졌습니다/추정됩니다"처럼 명확히 구분해서 표현해

출력은 반드시 아래 형식의 JSON만 출력해. 다른 설명은 절대 추가하지 마.
{"title": "...", "summary": "...", "content": "..."}`;

export async function structureKakaoReport(params: {
  rawText: string;
  apiKey: string;
}): Promise<KakaoReportDraft> {
  const { rawText, apiKey } = params;
  if (!apiKey) {
    throw new Error("OpenAI API 키가 없습니다. 설정 > API 키 설정에서 본인의 OpenAI API 키를 등록해주세요.");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: STRUCTURE_SYSTEM_PROMPT },
        { role: "user", content: `아래 원본 리서치 자료로 정보성 콘텐츠 1건을 만들어주세요.\n\n${rawText}` },
      ],
      response_format: { type: "json_object" },
      max_tokens: 3000,
      temperature: 0.4,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`AI 구조화 요청이 실패했습니다. (${response.status}) ${errorBody}`);
  }

  const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  const raw = data.choices?.[0]?.message?.content?.trim();
  if (!raw) {
    throw new Error("AI가 빈 응답을 반환했습니다.");
  }

  let parsed: Partial<KakaoReportDraft>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("AI 응답을 JSON으로 해석하지 못했습니다.");
  }

  if (!parsed.title || !parsed.summary || !parsed.content) {
    throw new Error("AI 응답에 필요한 필드가 없습니다.");
  }

  return { title: parsed.title, summary: parsed.summary, content: parsed.content };
}
