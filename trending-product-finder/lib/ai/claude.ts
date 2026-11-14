import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { ListingMarket } from "@/lib/listingRules";
import { withYearRule } from "@/lib/ai/yearRule";

// E2-2 상품명·태그 초안 — 회원 본인 Claude 키로 회원이 누를 때 1번만 부른다(재시도 없음 — 회원 키 이중 과금 방지).
// 호출 방식은 기준 코드 smartstore-register/src/lib/ai/claude.ts와 같다. 모델은 AI 모델 선택표의 Claude 기본값(균형).
export const DRAFT_MODEL = "claude-sonnet-5-5";

export type DraftInput = {
  market: ListingMarket;
  keyword: string;
  topWords: string[];
  related: { keyword: string; searches: number; usedInSample: number }[];
  priceMedian: number | null;
  sampleNames: string[];
  note: string;
};

export type DraftOutput = { titles: string[]; tags: string[]; reason: string };

const SCHEMA = {
  type: "object",
  properties: {
    titles: { type: "array", items: { type: "string" } },
    tags: { type: "array", items: { type: "string" } },
    reason: { type: "string" },
  },
  required: ["titles", "tags", "reason"],
  additionalProperties: false,
};

const MARKET_NAME: Record<ListingMarket, string> = { coupang: "쿠팡", naver: "네이버 스마트스토어" };

const SYSTEM =
  "당신은 한국 오픈마켓 상품 등록을 돕는 검색 최적화 담당자입니다. 셀러가 같은 키워드로 조사한 경쟁 상품명·연관 검색어 자료를 보고, " +
  "셀러가 직접 고쳐 쓸 상품명 초안 3개와 태그 10개를 만듭니다. 규칙: 상품명은 50자 이내로, 브랜드명은 넣지 않고 핵심 키워드를 앞에 두고 " +
  "용도·소재·규격처럼 상품을 설명하는 낱말만 씁니다. 같은 낱말을 반복하지 않고, 최저가·무료배송·특가·할인·1위·최고 같은 홍보 문구와 ★·【】·! 같은 꾸밈 기호를 쓰지 않습니다. " +
  "자료에 없는 사양(용량·소재·인증)을 지어내지 않습니다. 경쟁 상품명을 그대로 베끼지 않습니다. 태그는 상품명에 없는 연관 검색어 위주로, 띄어쓰기 없이 한 낱말씩 씁니다. " +
  "reason에는 어떤 자료를 근거로 골랐는지 한국어 두 문장으로 씁니다.";

function prompt(input: DraftInput): string {
  const related = input.related
    .slice(0, 20)
    .map((r) => `- ${r.keyword} (월간 검색 ${r.searches}, 경쟁 상품명 사용 ${r.usedInSample}개)`)
    .join("\n");
  return [
    `<market>${MARKET_NAME[input.market]}</market>`,
    `<keyword>${input.keyword}</keyword>`,
    `<frequent_words>${input.topWords.slice(0, 20).join(", ")}</frequent_words>`,
    related ? `<related_keywords>\n${related}\n</related_keywords>` : "<related_keywords>불러오지 않음</related_keywords>",
    input.priceMedian ? `<price_median_krw>${input.priceMedian}</price_median_krw>` : "",
    `<competitor_titles>\n${input.sampleNames.slice(0, 30).map((n) => `- ${n}`).join("\n")}\n</competitor_titles>`,
    input.note ? `<seller_note>${input.note}</seller_note>` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function draftListing(apiKey: string, input: DraftInput): Promise<DraftOutput> {
  const client = new Anthropic({ apiKey, timeout: 60_000, maxRetries: 0 });
  const res = await client.beta.messages.create({
    model: DRAFT_MODEL,
    max_tokens: 2000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
    system: withYearRule(SYSTEM),
    messages: [{ role: "user", content: prompt(input) }],
  });
  if (res.stop_reason === "refusal") throw new Error("AI가 이 요청을 처리하지 않았습니다. 키워드를 바꿔 다시 시도해 주세요.");
  const text = res.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") throw new Error("AI 응답이 비었습니다.");
  const parsed = JSON.parse(text.text) as { titles?: unknown; tags?: unknown; reason?: unknown };
  const list = (v: unknown) => (Array.isArray(v) ? v.map((x) => String(x ?? "")) : []);
  return { titles: list(parsed.titles).slice(0, 3), tags: list(parsed.tags), reason: String(parsed.reason ?? "") };
}
