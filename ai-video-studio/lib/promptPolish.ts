// 영상 설명 AI 다듬기(v1.10) — 요청 본문 만들기·응답 해석과 「오래 걸림」 판단. 화면·서버 공용(서버 전용 코드 없음).
// 프롬프트는 이 프로그램 고유 문구다(다른 프로그램과 공유하지 않음 — docs/IMAGE_PROMPT_RULES.md).

export const POLISH_MODEL = "gemini-3.5-flash-lite";
export const POLISH_MAX = 1200;
/** 만드는 중 카드가 이 시간(초)을 넘기면 업체 사용량 확인 안내를 띄운다 */
export const SLOW_AFTER_SEC = 240;

export interface PolishInput {
  idea: string;
  style?: string | null;
  camera?: string | null;
  seconds: number;
  hasImage: boolean;
}

export interface PolishResult {
  prompt: string;
  note: string;
}

const SYSTEM = [
  "You rewrite a short Korean idea into ONE English prompt for an AI video model.",
  "Describe, in this order: subject and appearance, the action as it unfolds over the clip, setting, lighting and mood, camera movement.",
  "Fit the amount of action to the clip length; one clear continuous shot, no scene cuts.",
  "If people appear, depict them as Korean. Never ask for on-screen text, subtitles, captions or logos.",
  "Keep everything the user asked for; do not add new characters or brands. 60-120 words, plain prose, no lists.",
  "Also write `note`: one short Korean sentence (존댓말) telling the user what details you added.",
  "Reply as JSON only: {\"prompt\": string, \"note\": string}.",
].join(" ");

export function polishRequestBody(input: PolishInput) {
  const lines = [
    `Idea (Korean): ${input.idea.trim().slice(0, POLISH_MAX)}`,
    input.style ? `Visual style: ${input.style}` : null,
    input.camera ? `Camera: ${input.camera}` : null,
    `Clip length: about ${input.seconds} seconds`,
    input.hasImage ? "A start frame image is given; describe motion that starts from it rather than re-describing the whole picture." : null,
  ].filter(Boolean);
  return {
    systemInstruction: { parts: [{ text: SYSTEM }] },
    contents: [{ role: "user", parts: [{ text: lines.join("\n") }] }],
    generationConfig: { responseMimeType: "application/json", temperature: 0.7, maxOutputTokens: 600 },
  };
}

/** Gemini generateContent 응답 → 결과. 쓸 수 없으면 null */
export function parsePolishResponse(data: unknown): PolishResult | null {
  const parts = (data as { candidates?: { content?: { parts?: { text?: string }[] } }[] })?.candidates?.[0]?.content?.parts ?? [];
  const raw = parts.map((p) => p.text ?? "").join("").trim();
  if (!raw) return null;
  let obj: { prompt?: unknown; note?: unknown };
  try {
    obj = JSON.parse(raw.replace(/^```(?:json)?\s*|\s*```$/g, ""));
  } catch {
    return null;
  }
  const prompt = typeof obj.prompt === "string" ? obj.prompt.replace(/\s+/g, " ").trim().slice(0, POLISH_MAX) : "";
  if (prompt.length < 10) return null;
  const note = typeof obj.note === "string" ? obj.note.trim().slice(0, 200) : "";
  return { prompt, note };
}

export function isSlow(createdAt: string, now = Date.now()): boolean {
  return now - new Date(createdAt).getTime() >= SLOW_AFTER_SEC * 1000;
}
