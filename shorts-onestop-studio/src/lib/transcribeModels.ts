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
