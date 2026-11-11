// D29 AI 도우미 공통 — 몰 대표 본인 키 풀기 + Claude 구조화 호출 + 오류 안내(견적 보조·상품 도우미·문의 초안·첫 화면이 함께 씀).
// 최상위 규칙: 그 몰 대표 본인 키만 쓴다(키가 없으면 등록 안내, 다른 키로 대신 처리하지 않음). 재시도 0(본인 키 이중 과금 방지).

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { z } from "zod";
import { openSecret } from "./secretBox";
import { DEFAULT_AI_MODEL, estimateCost, isAiModel, type AiModelId } from "./aiQuote";

export type AiFail = { ok: false; error: string; needKey?: boolean };
export type AiSetup = { ok: true; apiKey: string; model: AiModelId; minMargin: number };

export const NO_KEY_MESSAGE = "AI 키가 없습니다. 「쇼핑몰 정보」 아래 「AI 도우미」에 몰 대표 본인 Anthropic 키를 등록해 주세요.";

/** 몰 대표 키·모델·최소 마진 — 키가 없거나 이 메뉴 권한이 없으면 안내 */
export async function loadAi(supabase: SupabaseClient, storeId: string): Promise<AiFail | AiSetup> {
  const { data: status } = await supabase.rpc("mall_builder_ai_status", { p_store_id: storeId });
  const st = (status ?? {}) as { has_key?: boolean; model?: string; min_margin?: number };
  if (!st.has_key) return { ok: false, needKey: true, error: NO_KEY_MESSAGE };
  const { data: enc } = await supabase.rpc("mall_builder_ai_key_enc", { p_store_id: storeId });
  if (typeof enc !== "string" || !enc) return { ok: false, error: "이 메뉴 권한이 있는 직원만 AI 도우미를 쓸 수 있습니다." };
  try {
    return { ok: true, apiKey: openSecret(enc, storeId), model: isAiModel(st.model) ? st.model : DEFAULT_AI_MODEL, minMargin: Number(st.min_margin ?? 10) };
  } catch (e) {
    return { ok: false, needKey: true, error: e instanceof Error ? e.message : "키를 풀지 못했습니다." };
  }
}

type Content = string | Anthropic.ContentBlockParam[];

/** 구조화 응답 한 번 부르기 — 성공하면 읽은 값·사용량·대략 비용 */
export async function callStructured<S extends z.ZodType>(
  ai: AiSetup,
  opts: { system: string; content: Content; schema: S; maxTokens?: number },
): Promise<AiFail | { ok: true; data: z.infer<S>; usage: { input_tokens: number; output_tokens: number }; cost: { usd: number; krw: number } }> {
  const client = new Anthropic({ apiKey: ai.apiKey, maxRetries: 0, timeout: 120_000 });
  let response;
  try {
    response = await client.messages.parse({
      model: ai.model,
      max_tokens: opts.maxTokens ?? 8000,
      system: opts.system,
      messages: [{ role: "user", content: opts.content }],
      output_config: { effort: "low", format: zodOutputFormat(opts.schema) },
    });
  } catch (e) {
    return { ok: false, ...aiErrorMessage(e) };
  }
  if (response.stop_reason === "refusal") return { ok: false, error: "AI가 이 요청에 답하지 않았습니다. 직접 입력해 주세요." };
  if (response.stop_reason === "max_tokens" || !response.parsed_output) return { ok: false, error: "AI 답을 읽지 못했습니다. 다시 눌러 주세요." };
  const usage = { input_tokens: response.usage.input_tokens, output_tokens: response.usage.output_tokens };
  return { ok: true, data: response.parsed_output as z.infer<S>, usage, cost: estimateCost(ai.model, usage) };
}

/** SDK 오류 → 운영자 안내 */
export function aiErrorMessage(e: unknown): { error: string; needKey?: boolean } {
  if (e instanceof Anthropic.AuthenticationError) return { needKey: true, error: "등록한 Anthropic 키가 올바르지 않습니다. 키를 다시 등록해 주세요." };
  if (e instanceof Anthropic.PermissionDeniedError) return { error: "이 키로는 선택한 모델을 쓸 수 없습니다. Anthropic 콘솔에서 권한·결제를 확인해 주세요." };
  if (e instanceof Anthropic.RateLimitError) return { error: "Anthropic 사용 한도에 걸렸습니다. 잠시 뒤 다시 눌러 주세요." };
  if (e instanceof Anthropic.BadRequestError) return { error: `AI 요청이 거절됐습니다: ${e.message.slice(0, 160)}` };
  if (e instanceof Anthropic.APIError) return { error: `AI 호출 실패(${e.status ?? "연결"}): ${e.message.slice(0, 160)}` };
  return { error: "AI 호출에 실패했습니다. 잠시 뒤 다시 눌러 주세요." };
}
