export interface TopicSuggestion {
  id: number;
  topic: string;
  hookPreview: string;
  whyItWorks: string;
}

export interface ThreadPlanResult {
  topic: string;
  hook: string;
  content: string;
  cta: string;
  followUpIdeas: string[];
}

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
  { mode: "provocative", label: "더 자극적으로", icon: "⚡", desc: "반전과 호기심, 강력한 의문 제기" },
  { mode: "natural", label: "더 자연스럽게", icon: "🌿", desc: "이웃이나 친구와 대화하듯 편안한 어조" },
  { mode: "shorter", label: "더 짧게", icon: "✂️", desc: "군더더기 없이 핵심만 3~4줄 압축" },
  { mode: "expert", label: "더 전문적으로", icon: "🎓", desc: "신뢰도 높은 인사이트와 논리적 구조" },
  { mode: "funny", label: "더 웃기게", icon: "🤣", desc: "자조적 유머, B급 드립과 위트" },
  { mode: "no_ad", label: "광고 느낌 빼기", icon: "🛡️", desc: "내돈내산 100% 찐경험 솔직 톤" },
  { mode: "hooks_only", label: "후킹만 다시 만들기", icon: "🎯", desc: "스크롤 멈추는 첫 문장 집중 개선" },
];
