// 답글 톤 기본 선택지. value는 DB(ytreply_settings.tone_preset)에 저장되고,
// instruction은 AI 프롬프트(lib/ai/reply.ts)에 그대로 들어간다.

export interface TonePreset {
  value: string;
  label: string;
  instruction: string;
}

export const TONE_PRESETS: TonePreset[] = [
  {
    value: "friendly",
    label: "친근하고 편안한 톤",
    instruction: "친구처럼 편하고 다정한 말투로 답하세요. 딱딱한 존댓말보다는 부드럽고 다정한 표현을 쓰세요.",
  },
  {
    value: "professional",
    label: "전문가적이고 정중한 톤",
    instruction: "전문가답게 신뢰감 있고 정중한 존댓말로 답하세요. 근거나 이유를 짧게라도 함께 언급하면 좋습니다.",
  },
  {
    value: "humorous",
    label: "유머러스하고 재치있는 톤",
    instruction: "재치있고 유머러스하게, 웃음을 주는 표현을 섞어서 답하세요. 과하지 않게 적당한 선을 지키세요.",
  },
  {
    value: "formal",
    label: "격식있는 존댓말",
    instruction: "격식을 갖춘 정중한 존댓말(-습니다체)로, 예의를 최우선으로 답하세요.",
  },
  {
    value: "concise",
    label: "짧고 담백한 톤",
    instruction: "군더더기 없이 짧고 담백하게, 핵심만 한 문장으로 답하세요.",
  },
];

export function getTonePresetInstruction(value: string | null): string | null {
  if (!value) return null;
  return TONE_PRESETS.find((p) => p.value === value)?.instruction ?? null;
}
