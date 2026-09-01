import "server-only";

export interface OpportunityInput {
  keyword: string;
  trendIndex: number | null; // 0~100, 데이터랩 상대 지수 최근값
  trendChangePct: number | null; // 전 구간 대비 변화율(%)
  productCount: number | null; // 네이버쇼핑 등록 상품 수(경쟁도 프록시)
  minPrice: number | null;
  maxPrice: number | null;
  youtubeScore: number | null; // 0~100, 최근 관련 영상 업로드량+조회수 기반(Phase 6, 선택)
  youtubeUploadCount: number | null; // 참고용 원본 지표(최근 30일 업로드 수)
}

export interface OpportunityResult extends OpportunityInput {
  opportunityScore: number; // 0~100
}

/**
 * 기회 점수는 AI가 아니라 코드로 결정적으로 계산한다(재현 가능성/신뢰성을 위해).
 * AI는 이 숫자들을 근거로 한 "추천 사유" 문장 생성에만 쓴다.
 *
 * 유튜브 신호(Phase 6, 선택 — youtube_api_key 등록 시에만 값이 들어옴)가 있으면
 * 가중치를 아래처럼 재배분한다:
 * - 경쟁도 데이터 없음 + 유튜브 없음(Phase 1 기본): 관심도*0.7 + 상승폭*0.3
 * - 경쟁도 데이터 없음 + 유튜브 있음: 관심도*0.5 + 상승폭*0.25 + 유튜브*0.25
 * - 경쟁도 있음 + 유튜브 없음(Phase 2 이후): 관심도*0.5 + 상승폭*0.3 − 경쟁도 페널티*0.2
 * - 경쟁도 있음 + 유튜브 있음: 관심도*0.4 + 상승폭*0.2 − 경쟁도 페널티*0.2 + 유튜브*0.2
 *
 * 경쟁도(등록 상품 수)는 현재 Phase 1이라 항상 null(네이버 쇼핑검색 API 종료로 공식
 * 취득 불가) — Phase 2에서 쿠팡파트너스 검색 API로 확보하면 두 아래쪽 분기가 쓰인다.
 */
export function calcOpportunityScore(input: OpportunityInput): number {
  const changePct = Math.max(0, Math.min(input.trendChangePct ?? 0, 100));
  const hasYoutube = input.youtubeScore != null;
  const youtubeScore = input.youtubeScore ?? 0;

  if (input.productCount == null) {
    const raw = hasYoutube
      ? (input.trendIndex ?? 0) * 0.5 + changePct * 0.25 + youtubeScore * 0.25
      : (input.trendIndex ?? 0) * 0.7 + changePct * 0.3;
    return Math.max(0, Math.min(100, Math.round(raw * 10) / 10));
  }

  const competitionIndex = Math.min(input.productCount / 10000, 1) * 100;
  const raw = hasYoutube
    ? (input.trendIndex ?? 0) * 0.4 + changePct * 0.2 - competitionIndex * 0.2 + youtubeScore * 0.2
    : (input.trendIndex ?? 0) * 0.5 + changePct * 0.3 - competitionIndex * 0.2;
  return Math.max(0, Math.min(100, Math.round(raw * 10) / 10));
}

function buildPrompt(items: OpportunityResult[]): string {
  const hasCompetitionData = items.some((i) => i.productCount != null);
  const hasYoutubeData = items.some((i) => i.youtubeScore != null);

  const rows = items
    .map((i) => {
      let row = `- ${i.keyword}: 관심도지수=${i.trendIndex ?? "N/A"}, 변화율=${
        i.trendChangePct != null ? i.trendChangePct.toFixed(1) + "%" : "N/A"
      }, 기회점수=${i.opportunityScore}`;
      if (hasCompetitionData) {
        row += `, 등록상품수=${i.productCount ?? "N/A"}, 가격대=${i.minPrice ?? "?"}~${i.maxPrice ?? "?"}원`;
      }
      if (hasYoutubeData) {
        row += `, 최근30일 관련영상=${i.youtubeUploadCount ?? "N/A"}개(유튜브신호점수=${i.youtubeScore ?? "N/A"})`;
      }
      return row;
    })
    .join("\n");

  const competitionNote = hasCompetitionData
    ? "관심도가 오르는데 등록 상품 수(경쟁)가 적으면 \"기회\"로, 관심도는 높지만 경쟁도 매우 치열하면 \"레드오션 주의\"로 판단하세요."
    : "경쟁 상품 수 데이터는 아직 없으니(추후 추가 예정), 관심도 지수와 변화율만으로 판단하세요.";
  const youtubeNote = hasYoutubeData
    ? " 최근 30일 관련 영상이 많으면 콘텐츠/마케팅으로도 화제성이 있다는 뜻이니 그 점도 참고하세요."
    : "";

  return `당신은 이커머스 상품 소싱 전문가입니다. 아래는 네이버 쇼핑인사이트에서 수집한 키워드별 관심도 지표입니다.

${rows}

각 키워드에 대해, 왜 지금 소싱을 고려할 만한지(또는 만하지 않은지) 1~2문장의 한글 추천 사유를 작성하세요. ${competitionNote}${youtubeNote} 관심도가 낮으면 "시기상조"로 판단하는 식으로 구체적인 숫자를 근거로 설명하세요.

반드시 아래 JSON 객체 형식으로만 응답하세요 (다른 텍스트 없이). 키워드가 몇 개든 "items" 배열
안에 전부 포함하세요:
{"items": [{"keyword": "키워드명", "reason": "추천 사유 문장"}, ...]}`;
}

export interface ReasonItem {
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

/**
 * OpenAI의 response_format: json_object는 최상위가 객체여야 한다는 제약이 있어,
 * "배열로만 응답하라"는 지시와 부딪히면 모델이 {"items":[...]} 대신 키워드가 1개일 때
 * 단일 평면 객체({"keyword":..., "reason":...})로 응답하는 경우가 실제로 관찰됐다
 * (2026-08-31 실계정 테스트에서 발견 — 이 케이스를 놓치면 추천 사유가 전부 조용히
 * 사라진다). 그래서 여러 응답 형태를 방어적으로 처리한다.
 */
function parseReasonItems(content: string): ReasonItem[] {
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed?.items)) return parsed.items;
    if (Array.isArray(parsed?.results)) return parsed.results;
    if (Array.isArray(parsed?.recommendations)) return parsed.recommendations;
    if (parsed && typeof parsed === "object" && typeof parsed.keyword === "string") {
      return [parsed as ReasonItem];
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * 임의의 프롬프트를 OpenAI 또는 Gemini 중 등록된 키로 실행해 {keyword, reason}[] 를
 * 받아온다. 기회 점수 리포트와 후보 상품군 추천 두 기능이 이 공통 실행기를 재사용한다.
 */
export async function runReasonPrompt(
  prompt: string,
  keys: { openai?: string | null; gemini?: string | null },
): Promise<Map<string, string>> {
  let reasons: ReasonItem[] = [];

  if (keys.openai) {
    reasons = await callOpenAI(keys.openai, prompt);
  } else if (keys.gemini) {
    reasons = await callGemini(keys.gemini, prompt);
  }

  return new Map(reasons.map((r) => [r.keyword, r.reason]));
}

/** OpenAI 또는 Gemini 중 등록된 키로 추천 사유를 생성한다. 둘 다 없으면 null을 반환한다. */
export async function generateReasons(
  items: OpportunityResult[],
  keys: { openai?: string | null; gemini?: string | null },
): Promise<Map<string, string>> {
  return runReasonPrompt(buildPrompt(items), keys);
}
