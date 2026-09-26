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
  { id: "p-05", name: "위트만발 유머 짤방꾼 (B급 감성 유머톤)", toneDescription: "재치 있고 신선한 B급 드립과 위트 있는 어조. 배꼽 잡는 반전 드립과 호기심 유발 스토리텔링 톤." },
  { id: "p-06", name: "트래블/오프라인 탐방가 (현장감 탐방톤)", toneDescription: "핫플 & 신상 발품 탐방가. 실제 매장에서 직접 체험한 듯 생생하고 디테일한 현장 후기 어조." },
  { id: "p-07", name: "감성 브이로그 자취 일기 (포근한 힐링톤)", toneDescription: "잔잔하고 차분한 감성 브이로그 캡션 어조. 일상의 소소한 행복, 감성적인 여운과 따뜻한 힐링 추천 어조." },
  { id: "p-08", name: "직설적 팩트폭격 리뷰어 (NO협찬 솔직 후기톤)", toneDescription: "'좋은 건 좋다, 아쉬운 건 아쉽다' 팩트 위주 평가. 광고 느낌 zero의 장단점 명시 및 솔직 담백 톤." },
  { id: "p-09", name: "직장인 퇴근길 힐링 쇼퍼 (공감대 직장인톤)", toneDescription: "'월요병 극복 내돈내산', 퇴근길 지른 꿀템. 2030 직장인들의 깊은 공감과 스트레스 해소용 친근 어조." },
  { id: "p-10", name: "취향집중 매니아 큐레이터 (디테일 큐레이팅톤)", toneDescription: "소재, 성분, 디테일에 집중하는 매니아 큐레이터. 깊이 있는 제품 스토리와 추천 이유를 차분히 짚어주는 톤." },
];

