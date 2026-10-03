export interface CategoryPreset {
  id: string;
  name: string;
  emoji: string;
  description: string;
}

export const TARGET_CATEGORIES: CategoryPreset[] = [
  { id: "tips", name: "자취 / 생활꿀팁", emoji: "🏠", description: "일상 속 돈 아끼는 꿀팁, 살림 노하우, 자취생 필수템" },
  { id: "office", name: "직장인 / 이직", emoji: "💼", description: "월요병 극복, 퇴근길 단상, 직장 생활 처세, 이직 고민" },
  { id: "money", name: "부업 / N잡 / 재테크", emoji: "💰", description: "월 50만원 더 벌기, 앱테크, 절약 습관, 1인 비즈니스" },
  { id: "tech", name: "IT / AI / 테크", emoji: "🤖", description: "ChatGPT 실전 활용, 유용한 생산성 앱, 최신 IT 트렌드" },
  { id: "beauty", name: "뷰티 / 패션 / 다이어트", emoji: "✨", description: "가성비 스타일링, 올리브영 꿀템, 현실적인 감량 팁" },
  { id: "growth", name: "자기계발 / 루틴", emoji: "🔥", description: "미라클 모닝, 독서 인사이트, 멘탈 관리, 동기부여" },
  { id: "food", name: "맛집 / 카페 / 여행", emoji: "☕", description: "숨은 핫플, 혼카페 추천, 가성비 국내 여행 코스" },
  { id: "parenting", name: "육아 / 살림", emoji: "👶", description: "엄마/아빠 현실 육아 일기, 아이 밥상, 육아 꿀템" },
  { id: "relation", name: "인간관계 / 연애", emoji: "💌", description: "손절해야 할 사람 특징, 건강한 대화법, 솔직한 연애관" },
  { id: "marketing", name: "1인사업 / 브랜딩", emoji: "📈", description: "SNS 계정 키우기, 팔로워 모으는 법, 퍼스널 브랜딩" },
];
