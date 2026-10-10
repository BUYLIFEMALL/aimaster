import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import type { AIProvider } from "@/lib/apiKeys";

export interface AIModelConfig {
  provider: AIProvider;
  apiKey: string;
  model?: string;
}

export function parseJsonSafe<T>(raw: string, fallback: T): T {
  if (!raw) return fallback;
  try {
    const cleaned = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
    return JSON.parse(cleaned) as T;
  } catch {
    const jsonMatch = raw.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]) as T;
      } catch {
        return fallback;
      }
    }
    return fallback;
  }
}

// 화면(contentModels.ts)에서 고른 모델 ID를 그대로 호출한다. 몰래 다른 모델로 바꾸지 않는다.
// 모델이 없을 때만 기본값을 쓰고, 잘못된 ID는 공급사 API 오류로 그대로 드러나게 한다.
export const DEFAULT_MODELS: Record<AIProvider, string> = {
  gemini: "gemini-3.7-flash",
  anthropic: "claude-sonnet-5",
  openai: "gpt-4.1",
};

export function resolveModel(provider: AIProvider, model?: string): string {
  return model?.trim() || DEFAULT_MODELS[provider] || DEFAULT_MODELS.openai;
}

export async function callAI(
  config: AIModelConfig,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const { provider, apiKey, model } = config;

  if (provider === "gemini") {
    const genAI = new GoogleGenerativeAI(apiKey);
    const selectedModel = resolveModel("gemini", model);
    const geminiModel = genAI.getGenerativeModel({
      model: selectedModel,
      systemInstruction: systemPrompt,
    });

    const result = await geminiModel.generateContent({
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    });
    return result.response.text();
  }

  if (provider === "anthropic") {
    const anthropic = new Anthropic({ apiKey });
    const selectedModel = resolveModel("anthropic", model);
    const msg = await anthropic.messages.create({
      model: selectedModel,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });
    const block = msg.content[0];
    return block && block.type === "text" ? block.text : "";
  }

  // 기본값: OpenAI
  const openai = new OpenAI({ apiKey });
  const selectedModel = resolveModel("openai", model);
  const res = await openai.chat.completions.create({
    model: selectedModel,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    // Supply sampling settings only to the established non-reasoning family.
    ...(/^gpt-4(?:[.o-]|$)/i.test(selectedModel) ? {temperature:0.7} : {}),
  });
  return res.choices[0]?.message?.content || "";
}

