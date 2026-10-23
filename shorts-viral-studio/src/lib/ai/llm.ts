import "server-only";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import type { AIModelProvider } from "@/lib/ai/models";

export interface LlmConfig {
  provider: AIModelProvider;
  apiKey: string;
  model: string;
}

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

type GeminiPart = { text: string } | { fileData: { fileUri: string } };

async function geminiGenerate(config: LlmConfig, system: string, parts: GeminiPart[]): Promise<string> {
  const res = await fetch(`${GEMINI_BASE}/${config.model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": config.apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts }],
      generationConfig: { responseMimeType: "application/json" },
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(`Gemini 요청 실패 (${config.model}): ${body.error?.message ?? res.status}`);
  }
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  return data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
}

/** 텍스트만 보내고 JSON 문자열을 돌려받습니다. */
export async function callLLM(config: LlmConfig, system: string, user: string): Promise<string> {
  if (config.provider === "gemini") {
    return geminiGenerate(config, system, [{ text: user }]);
  }

  if (config.provider === "anthropic") {
    const anthropic = new Anthropic({ apiKey: config.apiKey });
    const res = await anthropic.messages.create({
      model: config.model,
      max_tokens: 8000,
      system,
      messages: [{ role: "user", content: user }],
    });
    const block = res.content[0];
    return block && "text" in block ? block.text : "";
  }

  const openai = new OpenAI({ apiKey: config.apiKey });
  const completion = await openai.chat.completions.create({
    model: config.model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    response_format: { type: "json_object" },
  });
  return completion.choices[0]?.message?.content ?? "";
}

/** Gemini에 공개 YouTube 영상 주소를 직접 넘겨 영상 내용을 보고 분석하게 합니다. */
export async function callGeminiWithVideos(
  config: LlmConfig,
  system: string,
  user: string,
  videoIds: string[],
): Promise<string> {
  const parts: GeminiPart[] = [
    ...videoIds.map((id) => ({ fileData: { fileUri: `https://www.youtube.com/watch?v=${id}` } })),
    { text: user },
  ];
  return geminiGenerate(config, system, parts);
}

export function parseJsonSafe<T>(raw: string, fallback: T): T {
  if (!raw || !raw.trim()) return fallback;
  const cleaned = raw
    .replace(/^\s*```(?:json)?/i, "")
    .replace(/```\s*$/, "")
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const match = raw.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (match) {
      try {
        return JSON.parse(match[0]) as T;
      } catch {
        // fall through
      }
    }
    return fallback;
  }
}
