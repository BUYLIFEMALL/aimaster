export interface PersonaItem {
  id: string;
  name: string;
  toneDescription: string;
}

export const PRESET_PERSONAS: PersonaItem[] = [
  { id: "p-01", name: "솔직담백 자취러 (자연스러운 꿀팁톤)", toneDescription: "20대 자취생 말투. 솔직하고 현실적인 꿀팁 중심, 부담 없는 친근한 반말/해요체 섞인 톤." },
  { id: "p-02", name: "트렌디 20대 쇼핑에디터 (감성 추천톤)", toneDescription: "세련되고 감각적인 뷰티/패션 에디터 말투. 적절한 이모지와 감탄사, 세련된 비주얼 묘사 톤." },
  { id: "p-03", name: "가성비 꼼꼼 주부 (실속 비교톤)", toneDescription: "살림 9단 꼼꼼한 주부 말투. 가성비, 실용성, 아내/엄마 시점의 실생활 활용도 강조 톤." },
  { id: "p-04", name: "IT/테크 전문 리뷰어 (논리적 분석톤)", toneDescription: "테크 덕후 전문가 말투. 성능, 스펙, 실제 사용 시 느낀 장단점과 팁 중심의 깔끔한 어조." },
];
