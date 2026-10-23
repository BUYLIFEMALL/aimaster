// v1.16(2026-10-21, 이커머스 병합 E1): 상세페이지 규격. AI 12단 상세페이지(detail-page-12p)의 쿠팡 12단·스마트스토어 9단을 옮겨 왔다.
// 섹션 구성은 DB shop_prompt_templates.layout_preset 행이 기준이다(supabase/migrations/20261021_layout_presets_v1_16.sql).

export type LayoutPreset = "shop15" | "coupang12" | "smartstore9";

export const DEFAULT_LAYOUT_PRESET: LayoutPreset = "shop15";

export const LAYOUT_PRESETS: Record<LayoutPreset, { label: string; short: string; sections: number; description: string }> = {
  shop15: {
    label: "기본 15섹션",
    short: "15단",
    sections: 15,
    description: "헤더부터 FAQ·배송·CTA까지 15개 섹션 — 정보가 많은 상품",
  },
  coupang12: {
    label: "쿠팡 로켓배송형 12단",
    short: "쿠팡 12단",
    sections: 12,
    description: "프로모션 배너 → 공감 후킹 → 스펙 → 특장점 3개 → 비교 → 활용 팁 → 구성품·FAQ",
  },
  smartstore9: {
    label: "스마트스토어 감성 후기형 9단",
    short: "스토어 9단",
    sections: 9,
    description: "감성 후킹 → 브랜드 스토리 → 특장점 2개 → 라이프스타일 → 팩트체크 → 구성품",
  },
};

export function toLayoutPreset(value: unknown): LayoutPreset {
  return value === "coupang12" || value === "smartstore9" || value === "shop15" ? value : DEFAULT_LAYOUT_PRESET;
}
