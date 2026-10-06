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

export async function callAI(
  config: AIModelConfig,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const { provider, apiKey, model } = config;

  if (provider === "gemini") {
    const genAI = new GoogleGenerativeAI(apiKey);
    const selectedModel = model || "gemini-2.0-flash";
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
    const selectedModel = model || "claude-3-5-sonnet-20241022";
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
  const selectedModel = model || "gpt-4o";
  const res = await openai.chat.completions.create({
    model: selectedModel,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.7,
  });
  return res.choices[0]?.message?.content || "";
}
