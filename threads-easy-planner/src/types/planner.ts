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
