"use client";

import { useState } from "react";
import { ViralPostDetector } from "./ViralPostDetector";
import { TrendExplorer } from "./TrendExplorer";
import { MarketResearch } from "./MarketResearch";
import { Flame, BarChart2 } from "lucide-react";

export function TrendsContainer() {
  const [activeTab, setActiveTab] = useState<"viral" | "naver">("viral");

  return (
    <div className="space-y-8">
      {/* 2대 메인 탭 셀렉터 */}
      <div className="flex border-b border-neutral-200">
        <button
          onClick={() => setActiveTab("viral")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-bold transition-all ${
            activeTab === "viral"
              ? "border-neutral-900 text-neutral-900"
              : "border-transparent text-neutral-500 hover:text-neutral-700"
          }`}
        >
          <Flame className={`h-4 w-4 ${activeTab === "viral" ? "text-amber-500 fill-amber-500" : ""}`} />
          <span>🔥 Threads 바이럴 떡상 탐지기</span>
        </button>

        <button
          onClick={() => setActiveTab("naver")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-bold transition-all ${
            activeTab === "naver"
              ? "border-neutral-900 text-neutral-900"
              : "border-transparent text-neutral-500 hover:text-neutral-700"
          }`}
        >
          <BarChart2 className="h-4 w-4" />
          <span>📊 네이버 상품 검색 트렌드</span>
        </button>
      </div>

      {/* 탭 콘텐츠 영역 */}
      {activeTab === "viral" ? (
        <ViralPostDetector />
      ) : (
        <div className="space-y-10">
          <TrendExplorer />
          <hr className="border-neutral-200" />
          <MarketResearch />
        </div>
      )}
    </div>
  );
}
