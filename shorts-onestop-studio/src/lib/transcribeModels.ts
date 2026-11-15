// 레퍼런스 쇼츠 받아쓰기 모델 선택(2026-11-10, 주인님 「openai도 모델 있으면 사용자가 선택」·「쇼츠 원스톱도 함께」).
// 여기 받아쓰기는 시각 없이 글만 필요 → OpenAI는 추천 모델 gpt-transcribe(종료 예정 없음). Claude는 음성 입력이 없어 후보가 아니다.
// 시험(node --test)에서 그대로 불러오려고 다른 파일을 가져오지 않는다. 기준 설계: ai-video-studio/lib/clip/transcribe.ts(v1.31)
export type TranscribeModelId = "gemini-3.8-flash" | "gemini-3.5-flash-lite" | "gpt-transcribe";

export const TRANSCRIBE_MODELS: { id: TranscribeModelId; provider: "gemini" | "openai"; name: string; note: string }[] = [
  { id: "gemini-3.8-flash", provider: "gemini", name: "Gemini 3.8 Flash", note: "추천" },
  { id: "gemini-3.5-flash-lite", provider: "gemini", name: "Gemini 3.5 Flash Lite", note: "저가" },
  { id: "gpt-transcribe", provider: "openai", name: "OpenAI gpt-transcribe", note: "OpenAI 추천 받아쓰기" },
];

export const isTranscribeModel = (v: unknown): v is TranscribeModelId => TRANSCRIBE_MODELS.some((m) => m.id === v);
export const transcribeModelOf = (id: TranscribeModelId) => TRANSCRIBE_MODELS.find((m) => m.id === id)!;

/** 기본값: 기억한 선택(키가 있을 때) → 가진 키 중 목록 순서(Gemini 먼저) → 목록 첫째 */
export function defaultTranscribeModel(registered: readonly string[], saved?: unknown): TranscribeModelId {
  if (isTranscribeModel(saved) && registered.includes(transcribeModelOf(saved).provider)) return saved;
  return (TRANSCRIBE_MODELS.find((m) => registered.includes(m.provider)) ?? TRANSCRIBE_MODELS[0]).id;
}

export const GEMINI_TRANSCRIPT_PROMPT = [
  "이 소리의 말을 한국어로 받아쓰세요. 말한 그대로 쓰고 고치거나 요약하지 마세요.",
  "받아쓴 글만 답하세요(설명·제목·따옴표·시간 표시 없이). 문장마다 줄을 바꾸세요.",
  "말소리가 전혀 없으면 아무것도 쓰지 마세요.",
].join("\n");

/** Gemini 답 정리: 코드 울타리·「받아쓰기:」 같은 머리말 제거, 공백 정리, 8000자 */
export function cleanTranscript(raw: unknown): string {
  let t = typeof raw === "string" ? raw : "";
  t = t.replace(/^```[a-z]*\s*/i, "").replace(/```\s*$/, "");
  t = t.replace(/^\s*(받아쓰기|받아쓴 글|transcript)\s*[:：]\s*/i, "");
  return t.split(/\r?\n/).map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean).join("\n").slice(0, 8000);
}

// v1.59 Gemini 낱말 시각(PLAN_20261111_WORD_TIMING_AFTER_WHISPER.md B안): whisper-1(2027-02-26 종료) 대신·보조로
// 만든 음성 + 대본을 Gemini에 주고 「낱말마다 시작 초」를 JSON으로 받는다. 화면 자막 시각에만 쓰므로 실패하면 null(글자 수 비율로 동작).
export const GEMINI_WORD_MODEL = "gemini-3.8-flash";

export function geminiWordPrompt(script: string): string {
  return [
    "이 소리는 아래 대본을 읽은 한국어 음성입니다. 소리에서 말한 낱말(띄어쓰기 단위)마다 말하기 시작한 시각을 초 단위로 적어 주세요.",
    "낱말은 말한 순서대로, 대본의 낱말을 그대로 쓰세요. 시각은 소리 맨 앞을 0초로 하고 소수 둘째 자리까지 쓰세요.",
    "설명 없이 JSON 배열만 답하세요.",
    "대본:",
    script.slice(0, 1000),
  ].join("\n");
}

/** Gemini generationConfig.responseSchema — [{ word, start }] */
export const GEMINI_WORD_SCHEMA = {
  type: "ARRAY",
  items: { type: "OBJECT", properties: { word: { type: "STRING" }, start: { type: "NUMBER" } }, required: ["word", "start"] },
} as const;

/** Gemini 답 → 낱말 시각. 숫자가 아니거나 음수·너무 큰 값은 버리고, 거꾸로 가는 시각이 많거나(4분의 1 넘게) 2개 미만이면 믿지 않는다(null) */
export function parseGeminiWords(raw: unknown, maxSec = 120): { word: string; start: number }[] | null {
  let v: unknown = raw;
  if (typeof raw === "string") {
    try { v = JSON.parse(raw.replace(/^```[a-z]*\s*/i, "").replace(/```\s*$/, "").trim()); } catch { return null; }
  }
  if (!Array.isArray(v)) return null;
  const out = v
    .map((x) => ({ word: String((x as { word?: unknown })?.word ?? "").trim(), start: Number((x as { start?: unknown })?.start) }))
    .filter((x) => x.word && Number.isFinite(x.start) && x.start >= 0 && x.start <= maxSec);
  if (out.length < 2) return null;
  let back = 0; for (let i = 1; i < out.length; i++) if (out[i].start < out[i - 1].start) back++;
  if (back > (out.length - 1) / 4) return null;
  return out;
}
