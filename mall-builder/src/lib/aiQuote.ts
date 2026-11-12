// D27 AI 견적 보조 — 보낼 자료·응답 형식·최저선 보정·비용 계산(node --test 대상, DB·SDK 없음)
// 결정(주인님 2026-11-11): 몰 대표 본인 키, 모델 3개 중 선택(기본 Sonnet 5.5), 최소 마진율 아래는 코드가 최저선으로 올림, 원가는 보냄.
// AI는 제안만 한다 — 견적 회신 칸에 채워 넣고 운영자가 고쳐서 회신(자동 회신 없음).

import { z } from "zod";

// 2026-11-12 주인님 지시: 제공자 OpenAI → Claude → Gemini 순서로 고르고, 제공자마다 최신 모델 여러 개 중 선택.
// 목록·가격은 docs/AI_MODEL_CATALOG.md(등급별 추천·평가표) 기준. DB 0059의 허용 목록과 같게 유지한다.
export const AI_PROVIDERS = [
  { id: "openai", label: "OpenAI", defaultModel: "gpt-6.1-terra", keyHint: "sk-", console: "https://platform.openai.com/api-keys" },
  { id: "anthropic", label: "Claude", defaultModel: "claude-sonnet-5-5", keyHint: "sk-ant-", console: "https://console.anthropic.com/settings/keys" },
  { id: "gemini", label: "Gemini", defaultModel: "gemini-3.8-flash", keyHint: "AIza", console: "https://aistudio.google.com/apikey" },
] as const;
export type AiProviderId = (typeof AI_PROVIDERS)[number]["id"];
export const isAiProvider = (p: unknown): p is AiProviderId => AI_PROVIDERS.some((x) => x.id === p);

export const AI_MODELS = [
  { id: "gpt-6-luna", provider: "openai", label: "가성비 · GPT-6 Luna", inPerM: 0.1, outPerM: 0.5 },
  { id: "gpt-6.1-terra", provider: "openai", label: "균형(추천) · GPT-6.1 Terra", inPerM: 1, outPerM: 5 },
  { id: "gpt-6.1-sol", provider: "openai", label: "고품질 · GPT-6.1 Sol", inPerM: 2, outPerM: 10 },
  { id: "gpt-6-astra", provider: "openai", label: "최고 품질 · GPT-6 Astra", inPerM: 10, outPerM: 50 },
  { id: "claude-haiku-5-5", provider: "anthropic", label: "가성비 · Claude Haiku 5.5", inPerM: 0.1, outPerM: 0.5 },
  { id: "claude-sonnet-5-5", provider: "anthropic", label: "균형(추천) · Claude Sonnet 5.5", inPerM: 2, outPerM: 10 },
  { id: "claude-opus-5-5", provider: "anthropic", label: "최고 품질 · Claude Opus 5.5", inPerM: 4, outPerM: 20 },
  { id: "gemini-3.5-flash-lite", provider: "gemini", label: "가성비 · Gemini 3.5 Flash-Lite", inPerM: 0.3, outPerM: 2.5 },
  { id: "gemini-3.8-flash", provider: "gemini", label: "균형(추천) · Gemini 3.8 Flash", inPerM: 0.75, outPerM: 3.75 },
  { id: "gemini-4-argon", provider: "gemini", label: "최고 품질 · Gemini 4 Argon", inPerM: 4, outPerM: 20 },
] as const; // 가격: 100만 토큰당 달러(입력/출력), docs/AI_MODEL_CATALOG.md 2026-11 기준(Gemini 4 Argon은 2026-12-01 인상 가격)
export type AiModelId = (typeof AI_MODELS)[number]["id"];
export const DEFAULT_AI_PROVIDER: AiProviderId = "anthropic"; // AIMaster 기본 AI = Claude
export const DEFAULT_AI_MODEL: AiModelId = "claude-sonnet-5-5";
export const isAiModel = (m: unknown): m is AiModelId => AI_MODELS.some((x) => x.id === m);
export const providerOf = (m: AiModelId): AiProviderId => AI_MODELS.find((x) => x.id === m)!.provider;
export const modelsOf = (p: AiProviderId) => AI_MODELS.filter((x) => x.provider === p);
export const defaultModelOf = (p: AiProviderId): AiModelId => AI_PROVIDERS.find((x) => x.id === p)!.defaultModel;
/** 제공자와 모델이 짝이 맞는지 — 안 맞으면 그 제공자 기본 모델 */
export function pickModel(provider: AiProviderId, model: unknown): AiModelId {
  return isAiModel(model) && providerOf(model) === provider ? model : defaultModelOf(provider);
}

export type QuoteFact = {
  item_id: string;
  name: string;
  option: string;
  qty: number;
  list_unit: number; // 판매가 + 옵션 추가금
  customer_unit: number | null; // 지금 이 거래처가 이 수량으로 사면 내는 단가(등급가·특가·수량 할인 반영), 가격 비공개 등으로 모르면 null
  cost: number | null; // 원가(상품 기준)
  stock: number | null; // 재고(관리 안 하면 null)
  last: { price: number; date: string } | null; // 이 거래처의 최근 6개월 같은 품목 구매 단가
};

export const SuggestionSchema = z.object({
  items: z.array(
    z.object({
      item_id: z.string(),
      unit_price: z.number().int(),
      reason: z.string(),
    }),
  ),
  note: z.string(),
});
export type AiSuggestion = z.infer<typeof SuggestionSchema>;

/** 원가와 최소 마진율로 정한 최저 단가(원 단위 올림). 원가를 모르면 null */
export function floorPrice(cost: number | null, minMargin: number): number | null {
  if (cost == null || cost <= 0) return null;
  return Math.ceil(cost / (1 - minMargin / 100));
}

export const marginRate = (price: number, cost: number | null) => (cost == null || price <= 0 ? null : Math.round(((price - cost) / price) * 1000) / 10);

export type CheckedRow = {
  item_id: string;
  suggested: number | null; // AI가 낸 값
  final: number | null; // 최저선 보정 뒤(화면에 채워 넣을 값)
  reason: string;
  margin: number | null; // final 기준 마진율(%)
  warnings: string[];
};

/** AI 응답 검사 — 모르는 품목은 버리고, 빠진 품목은 표시, 최저선 아래면 올리고, 지금 거래처 단가보다 비싸면 경고 */
export function checkSuggestion(facts: QuoteFact[], ai: AiSuggestion, minMargin: number): CheckedRow[] {
  const byId = new Map(ai.items.map((i) => [i.item_id, i]));
  return facts.map((f) => {
    const s = byId.get(f.item_id);
    const warnings: string[] = [];
    if (!s || !Number.isInteger(s.unit_price) || s.unit_price <= 0) {
      return { item_id: f.item_id, suggested: null, final: null, reason: "AI가 이 품목 단가를 내지 않았습니다.", margin: null, warnings: ["직접 입력해 주세요"] };
    }
    let final = s.unit_price;
    const floor = floorPrice(f.cost, minMargin);
    if (floor != null && final < floor) {
      warnings.push(`최소 마진 ${minMargin}% 아래라 ${floor.toLocaleString("ko-KR")}원으로 올렸습니다`);
      final = floor;
    }
    if (f.customer_unit != null && final > f.customer_unit) warnings.push(`지금 이 거래처 단가(${f.customer_unit.toLocaleString("ko-KR")}원)보다 비쌉니다`);
    if (f.cost == null) warnings.push("원가가 없어 마진을 확인하지 못했습니다");
    return { item_id: f.item_id, suggested: s.unit_price, final, reason: s.reason.replace(/[\s{}[\]"`]+$/u, "").slice(0, 120), margin: marginRate(final, f.cost), warnings };
  });
}

/** 대략 비용(달러·원) — 표시용, 환율은 대략 1,400원 */
export function estimateCost(model: AiModelId, usage: { input_tokens: number; output_tokens: number }) {
  const m = AI_MODELS.find((x) => x.id === model) ?? AI_MODELS.find((x) => x.id === DEFAULT_AI_MODEL)!;
  const usd = (usage.input_tokens * m.inPerM + usage.output_tokens * m.outPerM) / 1_000_000;
  return { usd: Math.round(usd * 10000) / 10000, krw: Math.max(1, Math.round(usd * 1400)) };
}

/** AI에 보낼 글 — 몰 데이터만. 개인정보(연락처·주소)는 보내지 않는다 */
export function buildQuotePrompt(facts: QuoteFact[], ctx: { buyer: string; isBusiness: boolean; requestNote: string; minMargin: number; year: number }) {
  const system = [
    "너는 한국 B2B 도매 쇼핑몰 운영자를 돕는 견적 단가 보조다. 운영자가 거래처의 견적 요청에 회신할 품목별 단가(원, 부가세 포함, 정수)를 제안한다.",
    `[기준 연도: ${ctx.year}년] 날짜와 관행은 ${ctx.year}년 기준으로 판단한다.`,
    "규칙:",
    `- 원가가 있으면 (단가 - 원가) / 단가 가 ${ctx.minMargin}% 이상이 되게 한다.`,
    "- '지금 거래처 단가'는 이 거래처가 지금 그대로 사면 내는 값이다. 견적은 보통 이보다 같거나 조금 낮게(대량·재구매·관계 고려) 제안하되 마진을 지킨다.",
    "- 최근 구매 단가가 있으면 일관성을 고려한다. 재고가 요청 수량보다 적으면 할인을 줄이고 이유에 적는다.",
    "- 끝자리는 보기 좋게(10원·100원 단위) 맞춘다.",
    "- reason은 품목마다 한국어 한 문장(40자 이내). note는 운영자에게 하는 전체 한두 문장 조언(한국어).",
    "- 모든 품목의 item_id를 그대로 돌려준다.",
  ].join("\n");
  const lines = facts.map((f) =>
    JSON.stringify({
      item_id: f.item_id,
      품목: f.option ? `${f.name} (${f.option})` : f.name,
      요청수량: f.qty,
      판매가: f.list_unit,
      지금거래처단가: f.customer_unit,
      원가: f.cost,
      재고: f.stock,
      최근구매: f.last ? `${f.last.date} ${f.last.price}원` : null,
    }),
  );
  const user = [
    `거래처: ${ctx.buyer} (${ctx.isBusiness ? "승인 사업자" : "일반 손님"})`,
    ctx.requestNote ? `거래처 요청 메모: ${ctx.requestNote.slice(0, 300)}` : "거래처 요청 메모: 없음",
    "품목(한 줄에 하나):",
    ...lines,
  ].join("\n");
  return { system, user };
}
