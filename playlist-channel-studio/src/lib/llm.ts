import "server-only";
import { GoogleGenAI } from "@google/genai";
import {
  IMAGE_MODELS, PROVIDER_LABELS, TEXT_MODELS, imageModelById, textModelById,
  type Provider, type UsageInfo,
} from "@/lib/playlist/types";
import { extractJson } from "@/lib/playlist/validate";
import type { Prompt } from "@/lib/playlist/prompts";

export interface Ok<T> { ok: true; data: T; usage: UsageInfo }
export interface Fail { ok: false; error: string; status: number; needKey?: Provider }

/** 키가 없을 때의 안내 응답(다른 키로 대신하지 않는다) */
export const needKeyBody = (provider: Provider) => ({
  error: `등록된 ${PROVIDER_LABELS[provider]} API 키가 없습니다. 좌측 메뉴의 API키등록·플랫폼연동에서 본인 키를 먼저 등록해 주세요.`,
  needKey: true,
  provider,
});

/** 공급사 오류를 한국어 문구로 바꾼다 */
export function explainError(e: unknown, provider: Provider, imageModel?: string): Fail {
  const msg = e instanceof Error ? e.message : String(e);
  const name = PROVIDER_LABELS[provider];
  if (/SAFETY|blocked|prohibited|content_policy|moderation/i.test(msg)) return { ok: false, status: 422, error: "AI가 안전 정책으로 이 요청의 처리를 거부했습니다. 내용을 조금 바꿔 다시 시도해 주세요." };
  if (/quota|429|rate.?limit|RESOURCE_EXHAUSTED|insufficient_quota|overloaded/i.test(msg)) return { ok: false, status: 429, error: `${name} 사용 한도를 넘었거나 요청이 몰렸습니다. 잠시 후 다시 시도하거나 본인 키의 한도·결제 상태를 확인해 주세요.` };
  if (/PERMISSION_DENIED|403|must be verified|not allowed|access/i.test(msg)) {
    return {
      ok: false, status: 400,
      error: imageModel && /pro|gpt-image/i.test(imageModel)
        ? `선택한 이미지 모델(${imageModel}) 사용 권한이 없습니다. 본인 ${name} 계정의 결제 연결/조직 인증을 확인하거나 다른 이미지 모델을 선택해 주세요.`
        : `${name} 권한이 거부되었습니다. 키 제한 설정과 해당 모델 사용 권한을 확인해 주세요.`,
    };
  }
  if (/API key|API_KEY|invalid|401|authentication|unauthorized/i.test(msg)) return { ok: false, status: 400, error: `${name} API 키가 올바르지 않습니다. API키등록·플랫폼연동 메뉴에서 키를 확인해 주세요.` };
  if (/not.?found|404|does not exist|model/i.test(msg)) return { ok: false, status: 400, error: `선택한 모델을 ${name}에서 찾을 수 없습니다. 다른 모델을 선택해 주세요.` };
  return { ok: false, status: 502, error: "AI 처리에 실패했습니다. 잠시 후 다시 시도해 주세요." };
}

const t = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

async function callGemini(apiKey: string, model: string, p: Prompt, json: boolean) {
  const ai = new GoogleGenAI({ apiKey });
  const res = await ai.models.generateContent({
    model,
    contents: { parts: [{ text: p.user }] },
    config: {
      systemInstruction: p.system,
      ...(json ? { responseMimeType: "application/json" } : {}),
      thinkingConfig: { thinkingBudget: 0 },
    },
  });
  return { text: (res.text ?? "").trim(), inTok: t(res.usageMetadata?.promptTokenCount), outTok: t(res.usageMetadata?.candidatesTokenCount) };
}

async function callOpenAI(apiKey: string, model: string, p: Prompt, json: boolean) {
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: p.system }, { role: "user", content: p.user }],
      ...(json ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${r.status} ${d?.error?.code ?? ""} ${d?.error?.message ?? ""}`);
  return { text: String(d.choices?.[0]?.message?.content ?? "").trim(), inTok: t(d.usage?.prompt_tokens), outTok: t(d.usage?.completion_tokens) };
}

async function callClaude(apiKey: string, model: string, p: Prompt) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model, max_tokens: 8000, system: p.system, messages: [{ role: "user", content: p.user }] }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${r.status} ${d?.error?.type ?? ""} ${d?.error?.message ?? ""}`);
  const text = Array.isArray(d.content) ? d.content.map((c: { text?: string }) => c.text ?? "").join("") : "";
  return { text: text.trim(), inTok: t(d.usage?.input_tokens), outTok: t(d.usage?.output_tokens) };
}

/** 선택한 텍스트 모델로 JSON 결과를 받는다 */
export async function generateJson(modelId: string, apiKey: string, p: Prompt): Promise<Ok<unknown> | Fail> {
  const model = textModelById(modelId);
  if (!model) return { ok: false, status: 400, error: "지원하지 않는 텍스트 모델입니다." };
  const started = Date.now();
  try {
    const r =
      model.provider === "gemini" ? await callGemini(apiKey, model.id, p, true)
      : model.provider === "openai" ? await callOpenAI(apiKey, model.id, p, true)
      : await callClaude(apiKey, model.id, p);
    if (!r.text) return { ok: false, status: 502, error: "AI가 빈 결과를 돌려주었습니다. 다시 시도해 주세요." };
    const data = extractJson(r.text);
    if (data === null) return { ok: false, status: 502, error: "AI 응답을 해석하지 못했습니다. 다시 시도해 주세요." };
    return { ok: true, data, usage: { model: model.id, inputTokens: r.inTok, outputTokens: r.outTok, ms: Date.now() - started } };
  } catch (e) {
    return explainError(e, model.provider);
  }
}

export interface RefImage { buffer: Buffer; mime: string }

/** 썸네일 배경 이미지를 만든다(16:9). 글자는 화면에서 따로 얹는다. */
export async function generateImage(modelId: string, apiKey: string, prompt: string, ref?: RefImage): Promise<Ok<{ buffer: Buffer; mime: string }> | Fail> {
  const model = imageModelById(modelId);
  if (!model) return { ok: false, status: 400, error: "지원하지 않는 이미지 모델입니다." };
  const started = Date.now();
  const usage = (): UsageInfo => ({ model: model.id, inputTokens: 0, outputTokens: 0, ms: Date.now() - started, images: 1 });
  try {
    if (model.provider === "gemini") {
      const ai = new GoogleGenAI({ apiKey });
      const parts: ({ text: string } | { inlineData: { mimeType: string; data: string } })[] = [{ text: prompt }];
      if (ref) parts.push({ inlineData: { mimeType: ref.mime, data: ref.buffer.toString("base64") } });
      const res = await ai.models.generateContent({
        model: model.id,
        contents: { parts },
        config: { imageConfig: { aspectRatio: "16:9" } as never },
      });
      for (const p of res.candidates?.[0]?.content?.parts ?? []) {
        if (p.inlineData?.data) return { ok: true, data: { buffer: Buffer.from(p.inlineData.data, "base64"), mime: p.inlineData.mimeType ?? "image/png" }, usage: usage() };
      }
      return { ok: false, status: 502, error: "이미지가 생성되지 않았습니다. 스타일이나 수정 요청을 바꿔 다시 시도해 주세요." };
    }
    // OpenAI gpt-image-1: 참조 이미지가 있으면 edits, 없으면 generations (가로형 1536x1024 → 화면에서 16:9로 맞춤)
    let r: Response;
    if (ref) {
      const form = new FormData();
      form.append("model", model.id);
      form.append("prompt", prompt);
      form.append("size", "1536x1024");
      form.append("image", new Blob([new Uint8Array(ref.buffer)], { type: ref.mime }), "persona.jpg");
      r = await fetch("https://api.openai.com/v1/images/edits", { method: "POST", headers: { Authorization: `Bearer ${apiKey}` }, body: form });
    } else {
      r = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model: model.id, prompt, size: "1536x1024", quality: "medium", n: 1 }),
      });
    }
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`${r.status} ${d?.error?.code ?? ""} ${d?.error?.message ?? ""}`);
    const b64 = d.data?.[0]?.b64_json;
    if (!b64) return { ok: false, status: 502, error: "이미지가 생성되지 않았습니다. 다시 시도해 주세요." };
    return { ok: true, data: { buffer: Buffer.from(b64, "base64"), mime: "image/png" }, usage: usage() };
  } catch (e) {
    return explainError(e, model.provider, model.id);
  }
}

export { TEXT_MODELS, IMAGE_MODELS };
