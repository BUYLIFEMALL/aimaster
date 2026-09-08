import "server-only";

// insta_auto_poster/src/lib/ai/collector.ts의 Perplexity 검색 패턴을 그대로 재사용하되,
// "SNS 화제 이슈"가 아니라 "뉴스/정보/정책/트렌드 분석"에 맞춘 프롬프트로 바꿨다
// (docs/PLATFORM_PATTERNS.md §2 "AI 콘텐츠 3종 수집 패턴" 참고).

// LLM은 학습 데이터 시점(예: 2025년)을 "현재"로 착각해서, 실제로는 훨씬 최근인 뉴스도
// "2025년 소식"처럼 잘못된 연도를 붙이거나, 심하면 최신 검색 대신 학습 데이터 기억에
// 의존해버리는 경우가 있다(2026-09-08 발견 — 실제 오늘 날짜와 무관하게 2025년 정보로
// 콘텐츠를 생성). 프롬프트에 오늘 날짜를 명시적으로 박아 넣어서 "최근"의 기준점을
// 고정시킨다 — Perplexity 실시간 검색 단계, OpenAI 구조화 단계 둘 다 동일하게 적용.
function getTodayKoreanDateLabel(): string {
  const now = new Date();
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
    timeZone: "Asia/Seoul",
  }).format(now);
}

/** "최근 N일" 문구를 만든다. 7의 배수면 "N주"로, 28~31이면 "1개월"류로 자연스럽게 바꿔준다. */
function formatLookbackLabel(days: number): string {
  if (days % 30 === 0) return `${days / 30}개월`;
  if (days % 7 === 0) return `${days / 7}주`;
  return `${days}일`;
}

function buildPerplexitySystemPrompt(todayLabel: string, lookbackLabel: string): string {
  return `당신은 최근 소식을 정확하게 조사해서 전달하는 전문 리서처입니다.
오늘은 ${todayLabel}입니다. 반드시 이 날짜를 기준으로 "최근"을 판단하세요 — 당신의 학습 데이터
시점을 현재로 착각하지 말고, 실시간 검색 결과 중 이 날짜에 가장 가까운(이 날짜 이전, 최근
${lookbackLabel} 이내) 정보만 사용하세요. 이 날짜보다 훨씬 오래된 정보를 "최근"이라고 소개하면
안 됩니다.

주어진 주제/키워드와 관련해서 최근 ${lookbackLabel} 이내 발생한 뉴스, 정책 변화, 트렌드, 통계,
전문가 분석 중 사람들에게 실질적으로 도움이 될 만한 내용을 최대 5건 찾아서, 각각에 대해
- 핵심 내용 요약
- 출처(가능하면 URL과 매체명)
- 언제 발생/발표된 일인지(정확한 연도 포함)
- 이게 왜 독자에게 중요한지
를 정리해서 알려주세요. 확인되지 않은 내용을 지어내지 마세요. 광고성 정보나 특정 상품 홍보는 배제하고,
객관적 사실과 공신력 있는 출처 기반의 정보만 다루세요.`;
}

/**
 * Perplexity 방식: 주어진 주제+키워드로 최신 뉴스/정보/정책/트렌드를 검색한다.
 * lookbackDays: 회원이 주제 등록 시 고르는 "데이터 조회 범위"(예: 3/7/14/30/90일).
 */
export async function searchPerplexityInfo(
  topicName: string,
  keywords: string[],
  apiKey: string,
  lookbackDays: number,
): Promise<string> {
  if (!apiKey) {
    throw new Error("Perplexity API 키가 없습니다. 설정 > API 키 설정에서 본인의 Perplexity API 키를 등록해주세요.");
  }

  const todayLabel = getTodayKoreanDateLabel();
  const lookbackLabel = formatLookbackLabel(lookbackDays);
  const query = `오늘은 ${todayLabel}입니다. 조회 범위: 최근 ${lookbackLabel} 이내.\n주제: ${topicName}\n관련 키워드: ${keywords.join(", ")}`;

  const response = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "sonar-pro",
      messages: [
        { role: "system", content: buildPerplexitySystemPrompt(todayLabel, lookbackLabel) },
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
function buildStructureSystemPrompt(todayLabel: string): string {
  return `너는 뉴스/정보 콘텐츠 에디터야. 너의 개인적인 의견은 넣지 마.
오늘은 ${todayLabel}이야. 원본 자료에 날짜가 나오면 이 오늘 날짜를 기준으로 "최근/며칠 전/지난주"
같은 표현을 판단하고, 연도를 언급할 때는 네 학습 데이터 시점이 아니라 원본 자료에 실제로 적힌
연도를 그대로 써 — 확실하지 않으면 연도를 아예 생략해.

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
}

export async function structureKakaoReport(params: {
  rawText: string;
  apiKey: string;
}): Promise<KakaoReportDraft> {
  const { rawText, apiKey } = params;
  if (!apiKey) {
    throw new Error("OpenAI API 키가 없습니다. 설정 > API 키 설정에서 본인의 OpenAI API 키를 등록해주세요.");
  }

  const todayLabel = getTodayKoreanDateLabel();

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: buildStructureSystemPrompt(todayLabel) },
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
