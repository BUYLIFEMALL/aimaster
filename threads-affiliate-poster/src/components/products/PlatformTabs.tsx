"use client";

import { useState } from "react";
import { clsx } from "@/lib/clsx";
import { CoupangProductForm } from "./CoupangProductForm";
import { AliexpressProductForm } from "./AliexpressProductForm";
import { NaverProductForm } from "./NaverProductForm";
import { TossProductForm } from "./TossProductForm";
import type { DetailPageSummary } from "@/lib/detailPages";
import type { AffiliatePlatform } from "@/types/product";
import { PLATFORM_LABELS } from "@/types/product";

const PLATFORMS: AffiliatePlatform[] = ["coupang", "aliexpress", "naver", "toss"];

export type RegistrationMode = "link" | "analyze";

// (2026-08-28 개편) 등록 방식을 "링크로 빠르게" / "상품·상세페이지 분석으로" 두 가지 중
// 하나로 먼저 고르게 만들었다 — 예전엔 "상품정보 직접 입력"이 URL 등록 폼 안에 접힌 채로
// 숨어있어서 찾기 어렵다는 피드백을 받았다. 이제 최상단에서 명확한 선택지로 나눈다.
// 두 모드 모두 플랫폼(쿠팡/알리익스프레스/네이버)은 동일하게 고르지만, "분석" 모드에서는
// EnrichmentFields(이미지 업로드+소구점 분석)를 링크 입력란보다 먼저, 항상 펼친 채로 보여주고,
// "링크" 모드에서는 아예 렌더링하지 않아 빠르고 단순하게 유지한다.
export function PlatformTabs({
  detailPages,
  initialKeyword,
}: {
  detailPages: DetailPageSummary[];
  initialKeyword?: string;
}) {
  const [mode, setMode] = useState<RegistrationMode>("link");
  const [platform, setPlatform] = useState<AffiliatePlatform>("coupang");

  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setMode("link")}
          className={clsx(
            "rounded-lg border px-3 py-2 text-left text-xs",
            mode === "link" ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 text-neutral-600 hover:bg-neutral-50",
          )}
        >
          <p className="font-semibold">🔗 링크로 빠르게 등록</p>
          <p className={clsx("mt-0.5", mode === "link" ? "text-neutral-300" : "text-neutral-400")}>
            상품 URL/검색만으로 최소 정보로 등록
          </p>
        </button>
        <button
          type="button"
          onClick={() => setMode("analyze")}
          className={clsx(
            "rounded-lg border px-3 py-2 text-left text-xs",
            mode === "analyze" ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 text-neutral-600 hover:bg-neutral-50",
          )}
        >
          <p className="font-semibold">🔍 상품·상세페이지 분석으로 등록</p>
          <p className={clsx("mt-0.5", mode === "analyze" ? "text-neutral-300" : "text-neutral-400")}>
            이미지/설명을 분석해 더 풍부한 캡션 재료로 등록
          </p>
        </button>
      </div>

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

      {platform === "coupang" && (
        <CoupangProductForm detailPages={detailPages} mode={mode} initialKeyword={initialKeyword} />
      )}
      {platform === "aliexpress" && <AliexpressProductForm detailPages={detailPages} mode={mode} />}
      {platform === "naver" && <NaverProductForm detailPages={detailPages} mode={mode} />}
      {platform === "toss" && <TossProductForm detailPages={detailPages} mode={mode} />}
    </div>
  );
}
