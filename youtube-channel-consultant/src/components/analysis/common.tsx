"use client";

import Link from "next/link";
import { AlertCircle } from "lucide-react";
import type { AnalyzedVideo } from "@/lib/youtube/types";
import { formatNumber } from "@/lib/youtube/metrics";
import { BarChart } from "./Charts";

export const INPUT_CLASS =
  "w-full rounded-xl border border-yt-border bg-yt-raised px-3.5 py-2.5 text-sm text-yt-text focus:bg-yt-surface focus:outline-hidden focus:ring-2 focus:ring-yt-red";
export const SELECT_CLASS =
  "rounded-xl border border-yt-border bg-yt-surface px-3 py-2.5 text-sm text-yt-text focus:outline-hidden focus:ring-2 focus:ring-yt-red";

export function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[90px] flex-1 text-center">
      <p className="text-xs text-yt-muted">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-yt-danger">{value}</p>
    </div>
  );
}

export function ErrorBanner({ message, needApiKey }: { message: string; needApiKey?: boolean }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-yt-red/40 bg-yt-red/10 p-4 text-sm text-yt-danger">
      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-yt-danger" />
      <div>
        <p>{message}</p>
        {needApiKey && (
          <Link href="/settings" className="mt-1 inline-block font-bold underline">
            API키등록·플랫폼연동으로 이동
          </Link>
        )}
      </div>
    </div>
  );
}

export function QuotaNote({ used, fetchedAt }: { used: number; fetchedAt: string }) {
  return (
    <p className="text-[11px] text-yt-muted">
      이번 분석에 쓴 YouTube 쿼터: 약 {used.toLocaleString()}유닛 (하루 기본 10,000유닛) · 조회 시각 {new Date(fetchedAt).toLocaleString("ko-KR")}
    </p>
  );
}

export const POPULARITY_NOTE =
  "인기 점수 = 조회수 60% + 좋아요 25% + 댓글 15%를, 조회된 영상 중 각 항목의 최고값 대비 0~100으로 환산해 합친 값입니다. 조회된 영상끼리의 상대 점수이므로 다른 검색 결과와 직접 비교하지 마세요.";

/** 지표별 Top 20 막대 차트 */
export function MetricTopChart({
  videos,
  pick,
  formatValue,
}: {
  videos: AnalyzedVideo[];
  pick: (v: AnalyzedVideo) => number | null;
  formatValue?: (n: number) => string;
}) {
  const top = [...videos]
    .map((v) => ({ v, value: pick(v) ?? 0 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 20);
  const format = formatValue ?? ((n: number) => formatNumber(n));
  return (
    <BarChart
      formatValue={format}
      items={top.map((t, i) => ({ label: String(i + 1), value: t.value, title: `${i + 1}. ${t.v.title} (${format(t.value)})` }))}
    />
  );
}
