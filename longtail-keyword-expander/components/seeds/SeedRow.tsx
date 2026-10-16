"use client";

import Link from "next/link";
import { SeedActions } from "@/components/seeds/SeedActions";

export interface SeedRowData {
  id: string;
  keyword: string;
  engine: "google" | "naver";
  is_active: boolean;
  runCount: number;
  lastRunAt: string | null;
}

export const ENGINE_LABEL: Record<"google" | "naver", string> = { google: "구글", naver: "네이버" };

// 카드 보기용 씨드 키워드 카드
export function SeedRow({ seed, lastRunLabel }: { seed: SeedRowData; lastRunLabel: string }) {
  return (
    <div className="mx-card flex flex-col gap-4 p-4">
      <Link href={`/seeds/${seed.id}`} className="min-w-0">
        <p className="flex items-center gap-1.5 truncate font-bold text-mx-text hover:text-[#93c5fd]">
          {seed.keyword}
          <span className={seed.engine === "naver" ? "mx-chip-green" : "mx-chip-blue"}>{ENGINE_LABEL[seed.engine]}</span>
        </p>
        <p className="mt-1 text-xs text-mx-muted">
          실행 {seed.runCount}회 · {lastRunLabel}
        </p>
      </Link>
      <SeedActions seedId={seed.id} />
    </div>
  );
}
