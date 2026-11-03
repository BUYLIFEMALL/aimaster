import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { LyricModel, LyricProvider } from "@/lib/lyricModels";

// AI 작사 — 회원이 고른 공급사(OpenAI·Claude·Gemini)의 본인 키로 한 번 부른다(회원 키 이중 과금을 막으려고 재시도 없음).
// 결과는 화면 입력칸에만 채우고, 회원이 고친 뒤 직접 저장한다.
// OpenAI·Gemini 호출 형식은 music/lib/studio/ai.ts(음악 SUNO, 실호출 검증)와 같다.

export type LyricRequest = { theme: string; genre: string; mood: string; language: "ko" | "en"; durationSec: number };
export type LyricResult = { title: string; style_prompt: string; lyrics: string };

/** 공급사 오류 — 화면에 보여 줄 문장과 상태 번호 */
export class LyricError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

const SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    style_prompt: { type: "string" },
    lyrics: { type: "string" },
  },
  required: ["title", "style_prompt", "lyrics"],
  additionalProperties: false,
};

const TIMEOUT_MS = 90_000;

function systemPrompt(year: number) {
  return [
    "You write original song lyrics for a Korean user who will generate the music locally with ACE-Step 1.5.",
    `The current year is ${year}. Do not refer to earlier years as the present.`,
    "Return a JSON object with exactly three string fields:",
    "- title: a short song title in the lyric language.",
    "- style_prompt: English comma-separated music tags ACE-Step understands (genre, instruments, vocal type, mood, tempo in BPM), under 200 characters.",
    "- lyrics: the full lyrics with section tags on their own lines such as [Verse], [Pre-Chorus], [Chorus], [Bridge], [Outro].",
    "Fit the number of sections to the requested length (about 30 seconds per verse or chorus).",
    "Write natural, singable lines with consistent syllable counts. Never copy or imitate existing copyrighted lyrics or name real artists.",
  ].join("\n");
}

function userPrompt(req: LyricRequest) {
  return [
    `<theme>${req.theme}</theme>`,
    req.genre && `<genre>${req.genre}</genre>`,
    req.mood && `<mood>${req.mood}</mood>`,
    `<lyric_language>${req.language === "en" ? "English" : "Korean"}</lyric_language>`,
    `<length_seconds>${req.durationSec}</length_seconds>`,
  ]
    .filter(Boolean)
    .join("\n");
}

function parseResult(raw: string): LyricResult {
  let parsed: Partial<LyricResult>;
  try {
    parsed = JSON.parse(raw.trim().replace(/^```(?:json)?\s*|\s*```$/g, ""));
  } catch {
    throw new LyricError("AI 응답을 읽지 못했습니다. 다시 시도해 주세요.", 502);
  }
  const result = {
    title: String(parsed.title ?? "").trim(),
    style_prompt: String(parsed.style_prompt ?? "").trim(),
    lyrics: String(parsed.lyrics ?? "").trim(),
  };
  if (!result.lyrics) throw new LyricError("AI가 가사를 비워 보냈습니다. 다시 시도해 주세요.", 502);
  return result;
}

function httpError(provider: string, status: number): LyricError {
  if (status === 401 || status === 403) return new LyricError(`등록한 ${provider} API 키가 맞지 않거나 이 모델을 쓸 권한이 없습니다. 키를 확인해 주세요.`, 400);
  if (status === 402) return new LyricError(`${provider} 계정에 결제가 연결되어 있지 않아 이 모델을 쓸 수 없습니다. 다른 모델을 골라 주세요.`, 400);
  if (status === 429) return new LyricError(`${provider} 사용 한도에 걸렸습니다. 잠시 뒤 다시 시도해 주세요.`, 429);
  return new LyricError(`${provider} 요청이 실패했습니다(${status}). 잠시 뒤 다시 시도해 주세요.`, 502);
}

async function viaClaude(apiKey: string, model: LyricModel, system: string, user: string): Promise<string> {
  const client = new Anthropic({ apiKey, timeout: TIMEOUT_MS, maxRetries: 0 });
  try {
    const res = await client.beta.messages.create({
      model,
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
      system,
      messages: [{ role: "user", content: user }],
    });
    if (res.stop_reason === "refusal") throw new LyricError("AI가 이 주제로는 가사를 쓰지 않았습니다. 주제를 바꿔 주세요.", 400);
    const text = res.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") throw new LyricError("AI 응답이 비었습니다. 잠시 뒤 다시 시도해 주세요.", 502);
    return text.text;
  } catch (err) {
    if (err instanceof LyricError) throw err;
    const status = (err as { status?: number }).status;
    if (typeof status === "number") throw httpError("Claude", status);
    throw err;
  }
}

async function viaOpenAI(apiKey: string, model: LyricModel, system: string, user: string): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_schema", json_schema: { name: "song", strict: true, schema: SCHEMA } },
      max_completion_tokens: 4000,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw httpError("OpenAI", res.status);
  const data = (await res.json()) as { choices?: { finish_reason?: string; message?: { content?: string; refusal?: string } }[] };
  const choice = data.choices?.[0];
  if (choice?.message?.refusal) throw new LyricError("AI가 이 주제로는 가사를 쓰지 않았습니다. 주제를 바꿔 주세요.", 400);
  if (choice?.finish_reason === "length") throw new LyricError("가사가 너무 길어 끝까지 받지 못했습니다. 길이를 줄여 다시 시도해 주세요.", 502);
  return choice?.message?.content ?? "";
}

async function viaGemini(apiKey: string, model: LyricModel, system: string, user: string): Promise<string> {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: { responseMimeType: "application/json", maxOutputTokens: 8000 },
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw httpError("Gemini", res.status);
  const data = (await res.json()) as { candidates?: { finishReason?: string; content?: { parts?: { text?: string }[] } }[] };
  const c = data.candidates?.[0];
  if (c?.finishReason === "SAFETY") throw new LyricError("AI가 이 주제로는 가사를 쓰지 않았습니다. 주제를 바꿔 주세요.", 400);
  if (c?.finishReason === "MAX_TOKENS") throw new LyricError("가사가 너무 길어 끝까지 받지 못했습니다. 길이를 줄여 다시 시도해 주세요.", 502);
  return c?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
}

export async function writeLyrics(provider: LyricProvider, apiKey: string, model: LyricModel, req: LyricRequest): Promise<LyricResult> {
  const system = systemPrompt(new Date().getFullYear());
  const user = userPrompt(req);
  const raw =
    provider === "openai"
      ? await viaOpenAI(apiKey, model, system, user)
      : provider === "gemini"
        ? await viaGemini(apiKey, model, system, user)
        : await viaClaude(apiKey, model, system, user);
  if (!raw.trim()) throw new LyricError("AI 응답이 비었습니다. 잠시 뒤 다시 시도해 주세요.", 502);
  return parseResult(raw);
}
