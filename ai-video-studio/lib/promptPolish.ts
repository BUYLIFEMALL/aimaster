// 영상 설명 AI 다듬기(v1.10, v1.11부터 3안) — 요청 본문 만들기·응답 해석과 「오래 걸림」 판단. 화면·서버 공용(서버 전용 코드 없음).
// 프롬프트는 이 프로그램 고유 문구다(다른 프로그램과 공유하지 않음 — docs/IMAGE_PROMPT_RULES.md).

export const POLISH_MODEL = "gemini-3.5-flash-lite";
export const POLISH_MAX = 1200;
/** 만드는 중 카드가 이 시간(초)을 넘기면 업체 사용량 확인 안내를 띄운다 */
export const SLOW_AFTER_SEC = 240;
/** 영상 설명 끝에 붙이는 안전 문구(인물은 한국인, 화면 글자 금지 — 루트 CLAUDE.md 핵심 원칙 3) */
export const SAFETY = "If people appear, depict them as Korean. No on-screen text, no subtitles, no logos.";
export const POLISH_OPTIONS = 3;

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
  "You rewrite a short Korean idea into English prompts for an AI video model; each prompt describes one clip.",
  "Describe, in this order: subject and appearance, the action as it unfolds over the clip, setting, lighting and mood, camera movement.",
  "Fit the amount of action to the clip length; one clear continuous shot, no scene cuts.",
  "Only include people if the idea mentions a person; never add people, hands or characters to a scene that has none.",
  "If people appear, depict them as Korean. Never ask for on-screen text, subtitles, captions or logos.",
  "Keep everything the user asked for; do not add new characters or brands. 60-120 words, plain prose, no lists.",
  "Write 3 clearly different versions (for example calm and detailed, dynamic with more motion, mood and lighting focused).",
  "For each, also write `note`: one short Korean sentence (존댓말) telling the user what that version emphasizes.",
  "Reply as JSON only: {\"options\": [{\"prompt\": string, \"note\": string}, ...]}.",
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
    generationConfig: { responseMimeType: "application/json", temperature: 0.7, maxOutputTokens: 1500 },
  };
}

function clean(obj: { prompt?: unknown; note?: unknown } | null | undefined): PolishResult | null {
  if (!obj || typeof obj !== "object") return null;
  const prompt = typeof obj.prompt === "string" ? obj.prompt.replace(/\s+/g, " ").trim().slice(0, POLISH_MAX) : "";
  if (prompt.length < 10) return null;
  const note = typeof obj.note === "string" ? obj.note.trim().slice(0, 200) : "";
  return { prompt, note };
}

/** Gemini generateContent 응답 → 다듬은 안 목록(최대 3개, 같은 설명은 하나만). 쓸 수 없으면 빈 배열. 1안 형식({prompt, note})도 받는다 */
export function parsePolishResponse(data: unknown): PolishResult[] {
  const parts = (data as { candidates?: { content?: { parts?: { text?: string }[] } }[] })?.candidates?.[0]?.content?.parts ?? [];
  const raw = parts.map((p) => p.text ?? "").join("").trim();
  if (!raw) return [];
  let obj: { options?: unknown; prompt?: unknown; note?: unknown };
  try {
    obj = JSON.parse(raw.replace(/^```(?:json)?\s*|\s*```$/g, ""));
  } catch {
    return [];
  }
  const list = Array.isArray(obj?.options) ? (obj.options as { prompt?: unknown; note?: unknown }[]) : [obj];
  const out: PolishResult[] = [];
  for (const item of list) {
    const r = clean(item);
    if (r && !out.some((x) => x.prompt === r.prompt)) out.push(r);
    if (out.length >= POLISH_OPTIONS) break;
  }
  return out;
}

export function isSlow(createdAt: string, now = Date.now()): boolean {
  return now - new Date(createdAt).getTime() >= SLOW_AFTER_SEC * 1000;
}
