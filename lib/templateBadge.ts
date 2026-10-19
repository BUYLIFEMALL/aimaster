// 9대 디자인 템플릿 마스터 가이드(docs/DESIGN_TEMPLATE_GUIDE.md) 기반 뱃지 매퍼

export type TemplateType = "focus" | "neon" | "wizard" | "twocolumn" | "minimal";

export interface TemplateBadgeInfo {
  type: TemplateType;
  label: string;
  tone: string;
  icon: string;
}

const TEMPLATE_CONFIG: Record<TemplateType, TemplateBadgeInfo> = {
  focus: {
    type: "focus",
    label: "포커스",
    icon: "🎯",
    tone: "bg-amber-400/10 text-amber-300 border-amber-400/30",
  },
  neon: {
    type: "neon",
    label: "네온콘솔",
    icon: "⚡",
    tone: "bg-cyan-400/10 text-cyan-300 border-cyan-400/30",
  },
  wizard: {
    type: "wizard",
    label: "위저드",
    icon: "🧙",
    tone: "bg-purple-400/10 text-purple-300 border-purple-400/30",
  },
  twocolumn: {
    type: "twocolumn",
    label: "2-컬럼",
    icon: "📊",
    tone: "bg-emerald-400/10 text-emerald-300 border-emerald-400/30",
  },
  minimal: {
    type: "minimal",
    label: "미니멀",
    icon: "✨",
    tone: "bg-white/10 text-white/80 border-white/20",
  },
};

/**
 * 프로그램 slug 또는 카테고리명을 기반으로 디자인 템플릿 뱃지 정보를 돌려준다.
 */
export function getTemplateBadge(slug: string, categorySlug?: string): TemplateBadgeInfo {
  const s = slug.toLowerCase();

  // 1. 포커스 스튜디오
  if (
    s.includes("image-studio") ||
    s.includes("vinyl") ||
    s.includes("turntable") ||
    s.includes("pure-glow") ||
    s.includes("allinone-marketing-graphic") ||
    s.includes("style-dna") ||
    s.includes("thumbnail-pro") ||
    s.includes("spin-gen")
  ) {
    return TEMPLATE_CONFIG.focus;
  }

  // 2. 네온 콘솔
  if (
    s.includes("competitor") ||
    s.includes("threads") ||
    s.includes("viral") ||
    s.includes("ghost-scraper") ||
    s.includes("crawler") ||
    s.includes("analytics") ||
    s.includes("suno") ||
    s.includes("trend")
  ) {
    return TEMPLATE_CONFIG.neon;
  }

  // 3. 인터랙티브 위저드
  if (
    s.includes("shorts-creator") ||
    s.includes("shorts-video") ||
    s.includes("playlist") ||
    s.includes("cardnews") ||
    s.includes("webtoon") ||
    s.includes("stepmail") ||
    s.includes("script") ||
    s.includes("composer")
  ) {
    return TEMPLATE_CONFIG.wizard;
  }

  // 4. 미니멀 유틸리티
  if (
    s.includes("translator") ||
    s.includes("mbti") ||
    s.includes("converter") ||
    s.includes("calculator") ||
    s.includes("qr")
  ) {
    return TEMPLATE_CONFIG.minimal;
  }

  // 5. 기본 2-컬럼 워크스페이스 (블로그, 채널 컨설턴트, 마케팅 플래너 등)
  return TEMPLATE_CONFIG.twocolumn;
}
