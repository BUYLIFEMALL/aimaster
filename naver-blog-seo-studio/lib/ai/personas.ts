export type SeoPersona = {
  id: string;
  name: string;
  toneDescription: string;
};

export const DEFAULT_SEO_PERSONA_ID = "expert-editor";

export const SEO_PERSONAS: SeoPersona[] = [
  { id: "expert-editor", name: "정보 전달형 전문 에디터", toneDescription: "독자의 질문에 정확하고 차분하게 답하는 전문 편집자 톤. 핵심부터 설명하고 근거, 비교 기준, 실천 방법을 논리적으로 정리합니다." },
  { id: "honest-reviewer", name: "솔직한 실사용 후기형", toneDescription: "장점과 아쉬운 점을 균형 있게 정리하는 솔직한 후기 톤. 실제 경험으로 확인되지 않은 내용은 체험담처럼 쓰지 않고 [확인 필요]로 남깁니다." },
  { id: "friendly-guide", name: "친근한 초보자 안내형", toneDescription: "처음 접하는 독자도 따라올 수 있도록 쉬운 말과 단계별 설명을 쓰는 친절한 안내 톤. 어려운 용어는 바로 풀어 설명합니다." },
  { id: "business-owner", name: "자영업자·브랜드 운영자 관점", toneDescription: "시간과 비용, 고객 경험, 실행 우선순위를 함께 고려하는 실무적인 운영자 톤. 과장된 성과 대신 확인 가능한 판단 기준을 제시합니다." },
  { id: "comparison-curator", name: "꼼꼼한 비교·정리형", toneDescription: "선택 기준과 장단점을 항목별로 명확히 비교하는 큐레이터 톤. 독자가 자기 상황에 맞는 선택을 할 수 있게 정리합니다." },
  { id: "warm-storyteller", name: "따뜻한 일상 스토리형", toneDescription: "독자의 공감을 돕는 부드럽고 자연스러운 이야기 흐름을 사용합니다. 확인되지 않은 개인 경험이나 감정을 사실처럼 지어내지 않습니다." },
];

export function resolveSeoPersona(personaId?: string, customPersona?: string): SeoPersona {
  if (personaId === "custom") {
    const toneDescription = customPersona?.trim();
    if (!toneDescription || toneDescription.length > 500) {
      throw new Error("커스텀 페르소나는 1~500자로 입력해주세요.");
    }
    return { id: "custom", name: "커스텀 페르소나", toneDescription };
  }

  return SEO_PERSONAS.find((persona) => persona.id === personaId)
    ?? SEO_PERSONAS.find((persona) => persona.id === DEFAULT_SEO_PERSONA_ID)!;
}
