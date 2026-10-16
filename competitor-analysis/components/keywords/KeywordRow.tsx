"use client";

import Link from "next/link";
import { KeywordActions } from "@/components/keywords/KeywordActions";

export interface KeywordRowData {
  id: string;
  keyword: string;
  location: string;
  engine: "google" | "naver";
  is_active: boolean;
  analysisCount: number;
  lastAnalyzedAt: string | null;
}

export const ENGINE_LABEL: Record<"google" | "naver", string> = { google: "구글", naver: "네이버" };

// 카드 보기용 키워드 카드
export function KeywordRow({ keyword, lastLabel }: { keyword: KeywordRowData; lastLabel: string }) {
  return (
    <div className="mx-card flex flex-col gap-4 p-4">
      <Link href={`/keywords/${keyword.id}`} className="min-w-0">
        <p className="flex items-center gap-1.5 truncate font-bold text-mx-text hover:text-[#93c5fd]">
          {keyword.keyword}
          <span className={keyword.engine === "naver" ? "mx-chip-green" : "mx-chip-blue"}>{ENGINE_LABEL[keyword.engine]}</span>
        </p>
        <p className="mt-1 text-xs text-mx-muted">
          {keyword.location} · 분석 {keyword.analysisCount}회 · {lastLabel}
        </p>
      </Link>
      <KeywordActions keywordId={keyword.id} />
    </div>
  );
}
