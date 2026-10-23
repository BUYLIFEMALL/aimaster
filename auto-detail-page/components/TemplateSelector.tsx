"use client";

import { TemplateType } from "@/types/product";

interface TemplateSelectorProps {
  onSelect: (template: TemplateType) => void;
}

const TEMPLATES = [
  {
    type: "coupang" as TemplateType,
    emoji: "🛒",
    title: "쿠팡 스타일",
    subtitle: "Coupang Marketplace",
    accentColor: "#cc0000",
    bgLight: "#fff5f5",
    borderColor: "#ffcccc",
    bullets: [
      "원가 · 할인율 · 판매가 강조",
      "로켓배송 뱃지",
      "긴박감 & 재고 경고",
      "고객 리뷰 하이라이트",
    ],
  },
  {
    type: "smartstore" as TemplateType,
    emoji: "🌿",
    title: "스마트스토어 스타일",
    subtitle: "Naver SmartStore",
    accentColor: "#03c75a",
    bgLight: "#f0fff6",
    borderColor: "#b3f0d2",
    bullets: [
      "브랜드 스토리 · 원산지",
      "해시태그 클라우드",
      "Q&A 아코디언",
      "성분 · 소재 상세",
    ],
  },
  {
    type: "premium" as TemplateType,
    emoji: "✨",
    title: "프리미엄 스타일",
    subtitle: "Luxury Brand",
    accentColor: "#b8960c",
    bgLight: "#fdfaf0",
    borderColor: "#e8d97a",
    bullets: [
      "브랜드 헤리티지 스토리",
      "영상 URL 임베드",
      "언박싱 경험",
      "인플루언서 추천",
    ],
  },
];

export default function TemplateSelector({ onSelect }: TemplateSelectorProps) {
  return (
    <div>
      <div className="text-center mb-8">
        <h2 className="text-xl font-bold text-gray-800 mb-1">템플릿 선택</h2>
        <p className="text-sm text-gray-500">
          어떤 플랫폼에 최적화된 상세페이지를 만들까요?
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {TEMPLATES.map((t) => (
          <button
            key={t.type}
            type="button"
            onClick={() => onSelect(t.type)}
            className="group w-full text-left rounded-2xl border-2 p-5 transition-all duration-200 hover:shadow-lg hover:scale-[1.01] active:scale-[0.99]"
            style={{
              backgroundColor: t.bgLight,
              borderColor: t.borderColor,
            }}
          >
            <div className="flex items-start gap-4">
              <div
                className="text-3xl w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: t.accentColor + "20" }}
              >
                {t.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-black text-lg text-gray-900">
                    {t.title}
                  </span>
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: t.accentColor + "20",
                      color: t.accentColor,
                    }}
                  >
                    {t.subtitle}
                  </span>
                </div>
                <ul className="mt-2 space-y-1">
                  {t.bullets.map((b, i) => (
                    <li key={i} className="flex items-center gap-1.5 text-sm text-gray-600">
                      <span
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: t.accentColor }}
                      />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex-shrink-0 self-center">
                <svg
                  className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
