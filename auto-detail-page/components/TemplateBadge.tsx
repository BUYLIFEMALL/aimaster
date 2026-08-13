"use client";

import { TemplateType } from "@/types/product";

interface TemplateBadgeProps {
  template: TemplateType;
}

const TEMPLATE_META: Record<
  TemplateType,
  { label: string; emoji: string; color: string; bg: string }
> = {
  coupang: {
    label: "쿠팡 스타일",
    emoji: "🛒",
    color: "#cc0000",
    bg: "#fff5f5",
  },
  smartstore: {
    label: "스마트스토어 스타일",
    emoji: "🌿",
    color: "#03c75a",
    bg: "#f0fff6",
  },
  premium: {
    label: "프리미엄 스타일",
    emoji: "✨",
    color: "#b8960c",
    bg: "#fdfaf0",
  },
};

export default function TemplateBadge({ template }: TemplateBadgeProps) {
  const meta = TEMPLATE_META[template];
  return (
    <div
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold"
      style={{ backgroundColor: meta.bg, color: meta.color, border: `1.5px solid ${meta.color}40` }}
    >
      <span>{meta.emoji}</span>
      <span>{meta.label}</span>
    </div>
  );
}
