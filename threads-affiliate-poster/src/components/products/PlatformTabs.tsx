"use client";

import { useState } from "react";
import { clsx } from "@/lib/clsx";
import { CoupangProductForm } from "./CoupangProductForm";
import { AliexpressProductForm } from "./AliexpressProductForm";
import { NaverProductForm } from "./NaverProductForm";
import type { DetailPageSummary } from "@/lib/detailPages";
import type { AffiliatePlatform } from "@/types/product";
import { PLATFORM_LABELS } from "@/types/product";

const PLATFORMS: AffiliatePlatform[] = ["coupang", "aliexpress", "naver"];

export function PlatformTabs({ detailPages }: { detailPages: DetailPageSummary[] }) {
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

      {platform === "coupang" && <CoupangProductForm detailPages={detailPages} />}
      {platform === "aliexpress" && <AliexpressProductForm detailPages={detailPages} />}
      {platform === "naver" && <NaverProductForm detailPages={detailPages} />}
    </div>
  );
}
