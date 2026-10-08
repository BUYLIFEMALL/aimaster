"use client";

import { useState } from "react";
import { clsx } from "@/lib/clsx";
import { CoupangProductForm } from "./CoupangProductForm";
import { AliexpressProductForm } from "./AliexpressProductForm";
import { NaverProductForm } from "./NaverProductForm";
import { TossProductForm } from "./TossProductForm";
import type { AffiliatePlatform } from "@/types/product";
import { PLATFORM_LABELS } from "@/types/product";

const PLATFORMS: AffiliatePlatform[] = ["coupang", "aliexpress", "naver", "toss"];

// (2026-10-08) "상품·상세페이지 분석으로 등록" 모드를 삭제했다 — 링크/검색 기반 등록 한 가지만 남긴다.
export function PlatformTabs({ initialKeyword }: { initialKeyword?: string }) {
  const [platform, setPlatform] = useState<AffiliatePlatform>("coupang");

  return (
    <div>
      <div className="mb-4 flex gap-2">
        {PLATFORMS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPlatform(p)}
            className={clsx(
              "rounded-full px-3 py-1.5 text-xs font-medium",
              platform === p ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200",
            )}
          >
            {PLATFORM_LABELS[p]}
          </button>
        ))}
      </div>

      {platform === "coupang" && <CoupangProductForm initialKeyword={initialKeyword} />}
      {platform === "aliexpress" && <AliexpressProductForm />}
      {platform === "naver" && <NaverProductForm />}
      {platform === "toss" && <TossProductForm />}
    </div>
  );
}
