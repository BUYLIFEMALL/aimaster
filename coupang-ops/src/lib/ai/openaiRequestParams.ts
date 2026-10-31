// 공용 기준 코드 「openai-request-params」 — 기준: naver-blog-seo-studio/lib/ai/openaiRequestParams.ts (docs/SHARED_MODULES.md)
// 사본은 직접 고치지 않는다. 기준만 고친 뒤 `node scripts/check-shared-modules.mjs --sync`.
// OpenAI 추론 모델(GPT-5·GPT-6·o 계열)은 temperature 지정과 max_tokens를 거부(400)한다(2026-10-20 운영에서 확인).
// 새 세대 모델이 나와 규칙이 바뀌면 이 파일 한 곳만 고친다.

/** 추론 모델이 생각 단계까지 쓰고도 답을 낼 수 있게 주는 최소 출력 한도 */
export const REASONING_MIN_COMPLETION_TOKENS = 4000;

export function isOpenAIReasoningModel(model: string) {
  return /^(gpt-5|gpt-6|o\d)/i.test(model.trim());
}

export type OpenAIGenerationParams = { temperature?: number; max_tokens?: number; max_completion_tokens?: number };

/**
 * 모델에 맞는 생성 옵션을 만든다. 요청 본문에 `...openAIGenerationParams(model, { temperature, maxTokens })`로 펼쳐 넣는다.
 * - temperature: 추론 모델이면 뺀다(기본 온도만 허용).
 * - maxTokens: 추론 모델이면 max_completion_tokens로 바꾸고, 생각 단계도 포함되므로 최소 REASONING_MIN_COMPLETION_TOKENS를 준다.
 */
export function openAIGenerationParams(model: string, options: { temperature?: number; maxTokens?: number } = {}): OpenAIGenerationParams {
  const reasoning = isOpenAIReasoningModel(model);
  const params: OpenAIGenerationParams = {};
  if (typeof options.temperature === "number" && !reasoning) params.temperature = options.temperature;
  if (typeof options.maxTokens === "number") {
    if (reasoning) params.max_completion_tokens = Math.max(options.maxTokens, REASONING_MIN_COMPLETION_TOKENS);
    else params.max_tokens = options.maxTokens;
  }
  return params;
}

/** 모델 선택 칸 아래에 보여 줄 짧은 안내(해당 없으면 빈 문자열) */
export function openAIModelNotice(model: string) {
  return isOpenAIReasoningModel(model) ? "GPT-5·GPT-6 계열은 생각하는 단계가 있어 응답이 조금 느릴 수 있습니다." : "";
}

/** 모델 선택 칸 옆에 붙일 성격 표시(OpenAI 글 모델이 아니면 빈 문자열). 이름 규칙 기준이라 새 계열이 나오면 여기만 고친다. */
export function openAIModelTier(model: string) {
  const name = model.trim().toLowerCase();
  if (!/^(gpt-|o\d)/.test(name)) return "";
  if (/(mini|nano|luna)/.test(name)) return "⚡ 빠름";
  if (/(sol|astra|pro)/.test(name) || /^(gpt-5|o\d)$/.test(name)) return "💎 고품질";
  return "⚖️ 균형";
}

/** 상대 비용 표시(💰 적음 ~ 💰💰💰 큼). 같은 OpenAI 모델끼리 비교한 값이라 가격이 조금 바뀌어도 틀리지 않게 정확한 단가는 쓰지 않는다. */
export function openAIModelCostLevel(model: string) {
  const tier = openAIModelTier(model);
  if (tier.includes("빠름")) return "💰";
  if (tier.includes("균형")) return "💰💰";
  if (tier.includes("고품질")) return "💰💰💰";
  return "";
}

/** 모델 선택 칸에 한 줄로 보여 줄 「⚡ 빠름 · 비용 💰」(OpenAI 글 모델이 아니면 빈 문자열) */
export function openAIModelBadge(model: string) {
  const tier = openAIModelTier(model);
  return tier ? `${tier} · 비용 ${openAIModelCostLevel(model)}` : "";
}

/** 모델 성격 표시에 마우스를 올리거나 눌렀을 때 보여 줄 한 줄 설명(해당 없으면 빈 문자열) */
export function openAIModelTierHint(model: string) {
  const tier = openAIModelTier(model);
  const cost = " 비용은 OpenAI 모델끼리 비교한 상대 표시이며 정확한 단가가 아닙니다.";
  if (tier.includes("빠름")) return "짧은 글·빠른 응답에 적합하고 비용이 적습니다." + cost;
  if (tier.includes("고품질")) return "긴 글·복잡한 주제에 적합하지만 느리고 비용이 큽니다." + cost;
  if (tier.includes("균형")) return "대부분의 글에 무난한 품질과 속도입니다." + cost;
  return "";
}

/** OpenAI 오류 응답의 거부 이유(error.message)를 화면 안내에 덧붙일 짧은 문구로 만든다(읽지 못하면 빈 문자열). */
export async function openAIErrorReason(response: Response) {
  try {
    const data = await response.json() as { error?: { message?: unknown } };
    const message = typeof data.error?.message === "string" ? data.error.message.trim() : "";
    return message ? ` — OpenAI 안내: ${message.slice(0, 200)}` : "";
  } catch {
    return "";
  }
}
