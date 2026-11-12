// D29 AI 도우미 공통 — 몰 대표 본인 키 + 구조화 호출 + 오류 안내(견적 보조·상품 도우미·문의 초안·첫 화면이 함께 씀).
// 2026-11-12: 제공자 OpenAI / Claude / Gemini 중 몰 대표가 고른 것으로 부른다(플랜 docs/PLAN_20261112_AI_MULTI_PROVIDER.md).
// 최상위 규칙: 그 몰 대표 본인 키만 쓴다(키가 없으면 등록 안내, 다른 키·다른 제공자로 대신 처리하지 않음). 재시도 0(본인 키 이중 과금 방지).
// 키 출처: 운영(AIMaster)은 메인 사이트 「API키등록·플랫폼연동」의 몰 대표 키(user_api_keys) — 한 번 등록하면 다시 묻지 않음.
//          Lab·배포 키트는 몰 안에 서버 암호화로 저장한 키(고른 제공자 하나).

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { openSecret } from "./secretBox";
import { AI_PROVIDERS, DEFAULT_AI_PROVIDER, estimateCost, isAiProvider, pickModel, type AiModelId, type AiProviderId } from "./aiQuote";
import { PLATFORM_AIMASTER, MAIN_SITE_URL } from "./platform";

export type AiFail = { ok: false; error: string; needKey?: boolean };
export type AiSetup = { ok: true; provider: AiProviderId; apiKey: string; model: AiModelId; minMargin: number };

const providerLabel = (p: AiProviderId) => AI_PROVIDERS.find((x) => x.id === p)!.label;

export function noKeyMessage(p: AiProviderId): string {
  return PLATFORM_AIMASTER
    ? `${providerLabel(p)} 키가 없습니다. 메인 사이트 「API키등록·플랫폼연동」(${MAIN_SITE_URL}/api-settings)에 몰 대표 본인 ${providerLabel(p)} 키를 등록해 주세요.`
    : `${providerLabel(p)} 키가 없습니다. 「쇼핑몰 정보」 아래 「AI 도우미」에 몰 대표 본인 ${providerLabel(p)} 키를 등록해 주세요.`;
}
/** 옛 문구(Claude 기준) — 다른 파일이 가져다 쓰던 이름 유지 */
export const NO_KEY_MESSAGE = noKeyMessage("anthropic");

type Status = { provider?: string; key_provider?: string; has_key?: boolean; model?: string; min_margin?: number; can_use?: boolean };

/** 몰 대표 키(운영: 공용 user_api_keys) — 서버 전용 관리자 연결로 그 몰 대표 한 사람 것만 읽는다 */
async function ownerSharedKey(storeId: string, provider: AiProviderId): Promise<string | null> {
  const { createAdminClient } = await import("./supabase/admin");
  const admin = createAdminClient();
  const { data: store } = await admin.from("mall_builder_stores").select("owner_id").eq("id", storeId).maybeSingle();
  if (!store?.owner_id) return null;
  const { data } = await admin.from("user_api_keys").select("api_key").eq("user_id", store.owner_id).eq("provider", provider).maybeSingle();
  const key = typeof data?.api_key === "string" ? data.api_key.trim() : "";
  return key || null;
}

/** 몰 대표 키·제공자·모델·최소 마진 — 키가 없거나 이 메뉴 권한이 없으면 안내 */
export async function loadAi(supabase: SupabaseClient, storeId: string): Promise<AiFail | AiSetup> {
  const { data: status } = await supabase.rpc("mall_builder_ai_status", { p_store_id: storeId });
  const st = (status ?? {}) as Status;
  const provider: AiProviderId = isAiProvider(st.provider) ? st.provider : DEFAULT_AI_PROVIDER;
  const model = pickModel(provider, st.model);
  const minMargin = Number(st.min_margin ?? 10);

  if (PLATFORM_AIMASTER) {
    const { data: can } = await supabase.rpc("mall_builder_ai_can_use", { p_store_id: storeId });
    if (can !== true) return { ok: false, error: "이 메뉴 권한이 있는 직원만 AI 도우미를 쓸 수 있습니다." };
    const apiKey = await ownerSharedKey(storeId, provider);
    if (!apiKey) return { ok: false, needKey: true, error: noKeyMessage(provider) };
    return { ok: true, provider, apiKey, model, minMargin };
  }

  const keyProvider: AiProviderId = isAiProvider(st.key_provider) ? st.key_provider : "anthropic";
  if (!st.has_key || keyProvider !== provider) return { ok: false, needKey: true, error: noKeyMessage(provider) };
  const { data: enc } = await supabase.rpc("mall_builder_ai_key_enc", { p_store_id: storeId });
  if (typeof enc !== "string" || !enc) return { ok: false, error: "이 메뉴 권한이 있는 직원만 AI 도우미를 쓸 수 있습니다." };
  try {
    return { ok: true, provider, apiKey: openSecret(enc, storeId), model, minMargin };
  } catch (e) {
    return { ok: false, needKey: true, error: e instanceof Error ? e.message : "키를 풀지 못했습니다." };
  }
}

/** 보낼 내용: 글(필수) + 사진 주소(선택, 이 몰 저장소 사진만 — 호출하는 쪽에서 확인) */
export type AiContent = string | { text: string; imageUrl?: string | null };
type Usage = { input_tokens: number; output_tokens: number };
type Ok<S extends z.ZodType> = { ok: true; data: z.infer<S>; usage: Usage; cost: { usd: number; krw: number } };

const TIMEOUT_MS = 120_000;

/** 구조화 응답 한 번 부르기 — 성공하면 읽은 값·사용량·대략 비용 */
export async function callStructured<S extends z.ZodType>(
  ai: AiSetup,
  opts: { system: string; content: AiContent; schema: S; maxTokens?: number },
): Promise<AiFail | Ok<S>> {
  const text = typeof opts.content === "string" ? opts.content : opts.content.text;
  const imageUrl = typeof opts.content === "string" ? null : opts.content.imageUrl ?? null;
  const maxTokens = opts.maxTokens ?? 8000;
  try {
    if (ai.provider === "anthropic") return await callClaude(ai, opts.system, text, imageUrl, opts.schema, maxTokens);
    if (ai.provider === "openai") return await callOpenAI(ai, opts.system, text, imageUrl, opts.schema, maxTokens);
    return await callGemini(ai, opts.system, text, imageUrl, opts.schema, maxTokens);
  } catch (e) {
    return { ok: false, ...aiErrorMessage(e, ai.provider) };
  }
}

function finish<S extends z.ZodType>(ai: AiSetup, schema: S, raw: unknown, usage: Usage): AiFail | Ok<S> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "AI 답을 읽지 못했습니다. 다시 눌러 주세요." };
  return { ok: true, data: parsed.data as z.infer<S>, usage, cost: estimateCost(ai.model, usage) };
}

/** zod → 제공자에 보낼 JSON 스키마 */
export function jsonSchemaOf(schema: z.ZodType): Record<string, unknown> {
  const js = z.toJSONSchema(schema) as Record<string, unknown>;
  delete js.$schema;
  return js;
}

async function callClaude<S extends z.ZodType>(ai: AiSetup, system: string, text: string, imageUrl: string | null, schema: S, maxTokens: number) {
  const client = new Anthropic({ apiKey: ai.apiKey, maxRetries: 0, timeout: TIMEOUT_MS });
  const content: Anthropic.ContentBlockParam[] = [
    ...(imageUrl ? [{ type: "image" as const, source: { type: "url" as const, url: imageUrl } }] : []),
    { type: "text", text },
  ];
  const response = await client.messages.parse({
    model: ai.model,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content }],
    output_config: { effort: "low", format: zodOutputFormat(schema) },
  });
  if (response.stop_reason === "refusal") return { ok: false as const, error: "AI가 이 요청에 답하지 않았습니다. 직접 입력해 주세요." };
  if (response.stop_reason === "max_tokens" || !response.parsed_output) return { ok: false as const, error: "AI 답을 읽지 못했습니다. 다시 눌러 주세요." };
  return finish(ai, schema, response.parsed_output, { input_tokens: response.usage.input_tokens, output_tokens: response.usage.output_tokens });
}

/** 제공자 HTTP 오류 — 상태 코드로 안내 문구를 고른다 */
export class AiHttpError extends Error {
  constructor(
    public provider: AiProviderId,
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function postJson(provider: AiProviderId, url: string, headers: Record<string, string>, body: unknown): Promise<Record<string, unknown>> {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body), signal: AbortSignal.timeout(TIMEOUT_MS) });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const err = json.error as { message?: string } | undefined;
    throw new AiHttpError(provider, res.status, String(err?.message ?? res.statusText).slice(0, 300));
  }
  return json;
}

async function callOpenAI<S extends z.ZodType>(ai: AiSetup, system: string, text: string, imageUrl: string | null, schema: S, maxTokens: number) {
  // Responses API 구조화 출력. GPT-6 계열(추론 모델)은 temperature를 받지 않으므로 넣지 않는다.
  const content: Record<string, unknown>[] = [{ type: "input_text", text }];
  if (imageUrl) content.unshift({ type: "input_image", image_url: imageUrl });
  const json = await postJson("openai", "https://api.openai.com/v1/responses", { authorization: `Bearer ${ai.apiKey}` }, {
    model: ai.model,
    instructions: system,
    input: [{ role: "user", content }],
    max_output_tokens: maxTokens,
    reasoning: { effort: "low" },
    text: { format: { type: "json_schema", name: "result", schema: jsonSchemaOf(schema), strict: false } },
  });
  if (json.status === "incomplete") return { ok: false as const, error: "AI 답이 길이 제한에 걸렸습니다. 다시 눌러 주세요." };
  const out = (json.output as { type?: string; content?: { type?: string; text?: string; refusal?: string }[] }[] | undefined) ?? [];
  const parts = out.flatMap((o) => o.content ?? []);
  if (parts.some((c) => c.type === "refusal")) return { ok: false as const, error: "AI가 이 요청에 답하지 않았습니다. 직접 입력해 주세요." };
  const outText = parts.filter((c) => c.type === "output_text").map((c) => c.text ?? "").join("");
  const usage = (json.usage ?? {}) as { input_tokens?: number; output_tokens?: number };
  let raw: unknown;
  try {
    raw = JSON.parse(outText);
  } catch {
    return { ok: false as const, error: "AI 답을 읽지 못했습니다. 다시 눌러 주세요." };
  }
  return finish(ai, schema, raw, { input_tokens: usage.input_tokens ?? 0, output_tokens: usage.output_tokens ?? 0 });
}

async function callGemini<S extends z.ZodType>(ai: AiSetup, system: string, text: string, imageUrl: string | null, schema: S, maxTokens: number) {
  const parts: Record<string, unknown>[] = [];
  if (imageUrl) {
    // Gemini는 일반 주소 사진을 바로 못 읽어 서버가 받아 base64로 넣는다(이 몰 저장소 사진만, 5MB 이하)
    const img = await fetch(imageUrl, { signal: AbortSignal.timeout(30_000) });
    if (img.ok) {
      const buf = Buffer.from(await img.arrayBuffer());
      if (buf.length <= 5 * 1024 * 1024) parts.push({ inline_data: { mime_type: img.headers.get("content-type")?.split(";")[0] || "image/jpeg", data: buf.toString("base64") } });
    }
  }
  parts.push({ text });
  const json = await postJson("gemini", `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(ai.model)}:generateContent`, { "x-goog-api-key": ai.apiKey }, {
    system_instruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts }],
    generationConfig: { maxOutputTokens: maxTokens, responseMimeType: "application/json", responseJsonSchema: jsonSchemaOf(schema) },
  });
  const cand = ((json.candidates as { finishReason?: string; content?: { parts?: { text?: string; thought?: boolean }[] } }[] | undefined) ?? [])[0];
  if (!cand) return { ok: false as const, error: "AI가 이 요청에 답하지 않았습니다. 직접 입력해 주세요." };
  if (cand.finishReason === "MAX_TOKENS") return { ok: false as const, error: "AI 답이 길이 제한에 걸렸습니다. 다시 눌러 주세요." };
  if (cand.finishReason && !["STOP", "FINISH_REASON_UNSPECIFIED"].includes(cand.finishReason)) return { ok: false as const, error: "AI가 이 요청에 답하지 않았습니다. 직접 입력해 주세요." };
  const outText = (cand.content?.parts ?? []).filter((p) => !p.thought).map((p) => p.text ?? "").join("");
  const meta = (json.usageMetadata ?? {}) as { promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number };
  let raw: unknown;
  try {
    raw = JSON.parse(outText);
  } catch {
    return { ok: false as const, error: "AI 답을 읽지 못했습니다. 다시 눌러 주세요." };
  }
  return finish(ai, schema, raw, { input_tokens: meta.promptTokenCount ?? 0, output_tokens: (meta.candidatesTokenCount ?? 0) + (meta.thoughtsTokenCount ?? 0) });
}

/** 오류 → 운영자 안내(제공자 이름을 붙여서) */
export function aiErrorMessage(e: unknown, provider: AiProviderId = "anthropic"): { error: string; needKey?: boolean } {
  const name = providerLabel(provider);
  let status: number | undefined;
  let msg = "";
  if (e instanceof AiHttpError) {
    status = e.status;
    msg = e.message;
  } else if (e instanceof Anthropic.APIError) {
    status = e.status;
    msg = e.message;
  } else if (e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError")) {
    return { error: `${name} 응답이 늦어 멈췄습니다. 잠시 뒤 다시 눌러 주세요.` };
  }
  if (status === 401 || (status === 400 && /api key|API_KEY_INVALID/i.test(msg))) return { needKey: true, error: `등록한 ${name} 키가 올바르지 않습니다. 키를 다시 등록해 주세요.` };
  if (status === 403) return { error: `이 키로는 선택한 모델을 쓸 수 없습니다. ${name} 콘솔에서 권한·결제를 확인해 주세요.` };
  if (status === 404) return { error: `${name}에서 이 모델을 찾지 못했습니다. 다른 모델을 골라 주세요.` };
  if (status === 429) return { error: `${name} 사용 한도(또는 잔액)에 걸렸습니다. 잠시 뒤 다시 누르거나 ${name} 콘솔에서 결제를 확인해 주세요.` };
  if (status === 400) return { error: `AI 요청이 거절됐습니다: ${msg.slice(0, 160)}` };
  if (status) return { error: `${name} 호출 실패(${status}): ${msg.slice(0, 160)}` };
  return { error: `${name} 호출에 실패했습니다. 잠시 뒤 다시 눌러 주세요.` };
}
