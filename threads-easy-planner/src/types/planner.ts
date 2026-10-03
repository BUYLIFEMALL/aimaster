export interface TopicSuggestion {
  id: number;
  topic: string;
  hookPreview: string;
  whyItWorks: string;
}

export interface HookVariant {
  type: string; // 자책형 | 부정 명령형 | 리얼 썰형 | 논쟁형 | 반전형
  hook: string;
  whyItWorks: string;
  content: string;
}

export interface ThreadPlanResult {
  topic: string;
  hook: string;
  hookType?: string;
  whyHookWorks?: string;
  content: string;
  cta: string;
  followUpIdeas: string[];
  hookVariants?: HookVariant[];
}

/**
 * 실전 기획 템플릿 입력 데이터
 */
export interface ThreadPlannerTemplateInput {
  product?: string;          // 연결할 상품 / 핵심 소재
  experience?: string;       // 내 실제 경험 / 상황
  targetAudience?: string;   // 타깃 독자
  persona?: string;          // 나의 역할 / 페르소나
  benchmarkPost?: string;    // 참고할 터진 글 원문(선택)
}

/**
 * 원클릭 실전 템플릿 프리셋 3선
 */
export interface TemplatePreset {
  id: string;
  title: string;
  badge: string;
  emoji: string;
  data: ThreadPlannerTemplateInput;
}

export const TEMPLATE_PRESETS: TemplatePreset[] = [
  {
    id: "laundry",
    title: "52만 뷰 세탁조 청소 썰",
    badge: "조회수 52만 회 떡상",
    emoji: "🧺",
    data: {
      product: "LG 세탁기 관리제 (세탁조 클리너)",
      experience: "워싱소다 백식초 다 써봐도 효과 없길래 추천글 보고 주문. 물색깔 보고 기절함... 수건 쉰내 싹 없어짐",
      targetAudience: "살림하는 2030 자취생 및 주부, 수건 쉰내 고민자",
      persona: "솔직 담백한 30대 일상 살림러",
      benchmarkPost: "넘더러워서 안올리려고 했는데 추천해준 스치니한테 고마워서 올림\n\n워싱소다 백식초 이런거 다 써봐도 효과 없길래\n치니 추천글보고 마지막으로 주문했거든??\n\n물색깔 보고 기절함....\n얼마 안쓴건데 이래ㅠㅠ\n이거 하니까 바로 수건 쉰내 싹 없어지더라",
    },
  },
  {
    id: "shadow",
    title: "1.6만 뷰 섀도 가성비 종결템",
    badge: "1.6만 바이럴",
    emoji: "✨",
    data: {
      product: "엑셀 4구 아이섀도우 팔레트",
      experience: "비싼 건 줄 알았는데 가성비템이었음. 과하지 않고 엄청 자연스럽고 버릴 색이 1도 없음",
      targetAudience: "2030 출근러, 자연스러운 데일리 메이크업 찾는 여성",
      persona: "가성비 꿀템 밝혀내는 친근한 뷰티 언니",
      benchmarkPost: "이거 비싼건줄 알았는데;;\n가성비템이었다니...\n\n과하지도 않고 엄청 자연스러워\n중요한건 버릴색이 1도 없다...\n섀도는 이거 하나로 종결 땅땅!",
    },
  },
  {
    id: "steamer",
    title: "퇴근 후 설거지 탈출 찜기 썰",
    badge: "공감 폭발 자취템",
    emoji: "🍲",
    data: {
      product: "실리콘 전자레인지 찜기",
      experience: "퇴근 후 설거지가 너무 싫어서 저녁을 일주일에 4번 거르다가 샀음. 써 본 지 2주째인데 냄비 설거지 안 나와서 삶의 질 수직 상승",
      targetAudience: "20대 후반 퇴근길 자취 직장인",
      persona: "퇴근길 녹초가 된 3년차 자취 직장인",
      benchmarkPost: "",
    },
  },
];

export type RewriteMode =
  | "provocative" // 더 자극적으로
  | "natural"     // 더 자연스럽게
  | "shorter"     // 더 짧게
  | "expert"      // 더 전문적으로
  | "funny"       // 더 웃기게
  | "no_ad"       // 광고 느낌 빼기
  | "hooks_only"; // 후킹만 다시 만들기

export interface RewriteModeOption {
  mode: RewriteMode;
  label: string;
  icon: string;
  desc: string;
}

export const REWRITE_MODES: RewriteModeOption[] = [
  { mode: "provocative", label: "더 자극적으로", icon: "⚡", desc: "손해 회피·부정 명령 극대화, 궁금해서 미치겠는 어조" },
  { mode: "natural", label: "더 자연스럽게", icon: "🌿", desc: "친한 친구/언니에게 카톡하듯 날것의 리얼 반말" },
  { mode: "shorter", label: "더 짧게", icon: "✂️", desc: "군더더기 다 쳐내고 3~4줄 임팩트 압축" },
  { mode: "expert", label: "더 전문적으로", icon: "🎓", desc: "신뢰도 높은 인사이트와 논리적 구조" },
  { mode: "funny", label: "더 웃기게", icon: "🤣", desc: "자조적 유머, B급 드립과 피식하는 위트" },
  { mode: "no_ad", label: "광고 느낌 빼기", icon: "🛡️", desc: "제품명 100% 삭제, 내돈내산 찐경험담 톤" },
  { mode: "hooks_only", label: "후킹만 다시 만들기", icon: "🎯", desc: "5대 바이럴 훅 유형 집중 개선" },
];
