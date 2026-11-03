import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { LyricModel } from "@/lib/lyricModels";

// AI 작사 — 회원 본인 Claude(Anthropic) 키로 한 번 부른다(회원 키 이중 과금을 막으려고 재시도 없음).
// 결과는 화면 입력칸에만 채우고, 회원이 고친 뒤 직접 저장한다.

export type LyricRequest = { theme: string; genre: string; mood: string; language: "ko" | "en"; durationSec: number };
export type LyricResult = { title: string; style_prompt: string; lyrics: string };

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

function systemPrompt(year: number) {
  return [
    "You write original song lyrics for a Korean user who will generate the music locally with ACE-Step 1.5.",
    `The current year is ${year}. Do not refer to earlier years as the present.`,
    "Return three fields:",
    "- title: a short song title in the lyric language.",
    "- style_prompt: English comma-separated music tags ACE-Step understands (genre, instruments, vocal type, mood, tempo in BPM), under 200 characters.",
    "- lyrics: the full lyrics with section tags on their own lines such as [Verse], [Pre-Chorus], [Chorus], [Bridge], [Outro].",
    "Fit the number of sections to the requested length (about 30 seconds per verse or chorus).",
    "Write natural, singable lines with consistent syllable counts. Never copy or imitate existing copyrighted lyrics or name real artists.",
  ].join("\n");
}

export async function writeLyrics(apiKey: string, model: LyricModel, req: LyricRequest): Promise<LyricResult> {
  const client = new Anthropic({ apiKey, timeout: 90_000, maxRetries: 0 });
  const user = [
    `<theme>${req.theme}</theme>`,
    req.genre && `<genre>${req.genre}</genre>`,
    req.mood && `<mood>${req.mood}</mood>`,
    `<lyric_language>${req.language === "en" ? "English" : "Korean"}</lyric_language>`,
    `<length_seconds>${req.durationSec}</length_seconds>`,
  ]
    .filter(Boolean)
    .join("\n");

  const res = await client.beta.messages.create({
    model,
    max_tokens: 4000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
    system: systemPrompt(new Date().getFullYear()),
    messages: [{ role: "user", content: user }],
  });
  if (res.stop_reason === "refusal") throw new Error("AI가 이 주제로는 가사를 쓰지 않았습니다. 주제를 바꿔 주세요.");
  const text = res.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") throw new Error("AI 응답이 비었습니다. 잠시 뒤 다시 시도해 주세요.");
  const parsed = JSON.parse(text.text) as Partial<LyricResult>;
  return {
    title: String(parsed.title ?? "").trim(),
    style_prompt: String(parsed.style_prompt ?? "").trim(),
    lyrics: String(parsed.lyrics ?? "").trim(),
  };
}
