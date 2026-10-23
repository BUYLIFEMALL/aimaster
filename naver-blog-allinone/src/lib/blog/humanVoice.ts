// "사람이 쓴 글처럼 쓰기" 공용 도우미(아이디어·키워드·맛집 탭이 함께 쓴다).
//  · 작성자 페르소나 직접 입력(자기소개 한 줄)을 프리셋 페르소나와 합치기
//  · 실제 경험을 떠올리게 하는 질문 만들기(경험 내용은 만들지 않는다 — 본문에는 회원이 적은 경험만 들어간다)
import { callLlm, type InlineImage } from "./llm";
import { parseJsonLoose } from "./gemini";
import type { PipelinePersona } from "./pipeline";
import type { TextProvider } from "./llm";

export const MAX_CUSTOM_PERSONA = 200;
export const MAX_EXPERIENCE = 1500;

/** 직접 입력한 작성자 소개가 있으면 프리셋과 합쳐 하나의 페르소나로 만든다. 둘 다 없으면 null. */
export function buildCustomPersona(chosen: PipelinePersona | null, custom: string): PipelinePersona | null {
  const text = custom.trim().slice(0, MAX_CUSTOM_PERSONA);
  if (!text) return chosen;
  return {
    name: chosen?.name ?? "직접 입력한 작성자",
    badge: chosen?.badge ?? "직접 입력",
    tonePrompt: `작성자 소개: ${text} — 이 사람의 직업·관심사·말투·관점으로 쓴다.${chosen ? " " + chosen.tonePrompt : ""}`,
  };
}

export interface ExperienceQuestionInput {
  engine: { provider: TextProvider; model: string; apiKey: string };
  /** 글 주제·장소 등 질문의 바탕이 되는 정보(여러 줄 가능) */
  context: string;
  /** 사진이 있으면 함께 보고 질문한다(최대 4장) */
  photos?: InlineImage[];
  /** 안내 문구: "방문한 사람이 실제 경험을 떠올릴 수 있는" 등 */
  audience?: string;
}

/** 경험을 떠올릴 질문 최대 6개. 정답·경험을 만들지 않고 본인이 직접 답할 질문만 낸다. */
export async function requestExperienceQuestions(input: ExperienceQuestionInput): Promise<string[]> {
  const sample = (input.photos ?? []).slice(0, 4);
  const text = await callLlm({
    provider: input.engine.provider,
    model: input.engine.model,
    apiKey: input.engine.apiKey,
    system: "너는 글을 쓰려는 사람이 자기 실제 경험을 떠올리도록 돕는 인터뷰어다. 경험·감정·후기 내용을 대신 만들어 주지 않고, 본인이 직접 답할 수 있는 짧은 질문만 낸다. 반드시 JSON 객체 하나만 응답한다.",
    user: `${input.context}\n\n${sample.length ? "첨부한 사진에 보이는 것을 참고해" : "위 정보를 참고해"} ${input.audience ?? "글쓴이가 실제 경험을 떠올릴 수 있는"} 한국어 질문 5개를 만들어줘. 각 질문은 40자 안팎이고, 정답이나 경험을 암시·창작하지 않는다.\n형식: {"questions":["질문1","질문2","질문3","질문4","질문5"]}`,
    images: sample.length ? sample : undefined,
    json: true,
    temperature: 0.6,
    maxTokens: 1024,
  });
  const parsed = parseJsonLoose<{ questions?: unknown }>(text);
  const list = Array.isArray(parsed?.questions)
    ? parsed.questions.filter((q): q is string => typeof q === "string").map((q) => q.trim().slice(0, 80)).filter(Boolean).slice(0, 6)
    : [];
  if (list.length === 0) throw new Error("질문 응답을 읽지 못했습니다.");
  return list;
}
