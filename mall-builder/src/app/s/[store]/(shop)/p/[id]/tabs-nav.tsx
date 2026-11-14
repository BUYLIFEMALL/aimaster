"use client";

import { useEffect, useState } from "react";

export default function ProductTabsNav({
  reviewsCount,
  inquiriesCount,
}: {
  reviewsCount: number;
  inquiriesCount: number;
}) {
  const [activeTab, setActiveTab] = useState<string>("detail-description");

  const tabs = [
    { id: "detail-description", label: "상품 상세정보" },
    { id: "detail-shipping", label: "배송 · 교환 · 반품" },
    { id: "reviews", label: `구매 후기 (${reviewsCount})` },
    { id: "inquiries", label: `상품 문의 (${inquiriesCount})` },
  ];

  const scrollTo = (id: string) => {
    setActiveTab(id);
    const el = document.getElementById(id);
    if (el) {
      const yOffset = -90; // sticky header + tabs height
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY + 140;
      for (const tab of [...tabs].reverse()) {
        const el = document.getElementById(tab.id);
        if (el && el.offsetTop <= scrollPos) {
          setActiveTab(tab.id);
          break;
        }
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav className="sticky top-[61px] z-30 -mx-4 sm:-mx-6 mb-8 border-y border-slate-200/90 bg-white/95 px-4 backdrop-blur-md shadow-xs sm:px-6">
      <div className="mx-auto flex max-w-6xl items-center justify-between sm:justify-start sm:gap-8 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => scrollTo(tab.id)}
              className={`relative py-3.5 text-xs sm:text-sm font-bold transition-colors whitespace-nowrap ${
                active
                  ? "text-blue-600"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <span>{tab.label}</span>
              {active && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-blue-600" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
