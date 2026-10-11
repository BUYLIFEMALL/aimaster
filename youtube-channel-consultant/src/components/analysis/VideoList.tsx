"use client";

import { useMemo, useState } from "react";
import { Download, ExternalLink } from "lucide-react";
import type { AnalyzedVideo } from "@/lib/youtube/types";
import { formatDate, formatDuration, formatNumber } from "@/lib/youtube/metrics";
import { downloadCsv, downloadJson } from "@/lib/export";

type FormatFilter = "all" | "long" | "short";
type SortKey = "popularity" | "viewCount" | "likeCount" | "commentCount" | "date";

const SORT_LABELS: Record<SortKey, string> = {
  popularity: "인기순",
  viewCount: "조회수순",
  likeCount: "좋아요순",
  commentCount: "댓글순",
  date: "최신순",
};

function sortValue(v: AnalyzedVideo, key: SortKey): number {
  switch (key) {
    case "popularity":
      return v.popularity;
    case "viewCount":
      return v.viewCount;
    case "likeCount":
      return v.likeCount ?? -1;
    case "commentCount":
      return v.commentCount ?? -1;
    case "date":
      return new Date(v.publishedAt).getTime();
  }
}

interface Props {
  videos: AnalyzedVideo[];
  /** 키워드 분석처럼 여러 채널이 섞인 목록이면 채널명을 보여주고 채널 분석 버튼을 둔다 */
  showChannel?: boolean;
  onAnalyzeChannel?: (channelId: string) => void;
  /** 영상 카드의 AI 영상 요약 버튼. 없으면 버튼을 숨긴다 */
  onSummarize?: (video: AnalyzedVideo) => void;
  summarizeDisabled?: boolean;
  /** 내보내기 파일 이름과 JSON 전체 데이터 */
  exportName: string;
  exportJson: unknown;
}

export function VideoList({ videos, showChannel, onAnalyzeChannel, onSummarize, summarizeDisabled, exportName, exportJson }: Props) {
  const [format, setFormat] = useState<FormatFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("popularity");
  const [limit, setLimit] = useState<number>(20);

  const shown = useMemo(() => {
    const filtered = videos.filter((v) => (format === "all" ? true : format === "short" ? v.isShort : !v.isShort));
    return [...filtered].sort((a, b) => sortValue(b, sortKey) - sortValue(a, sortKey));
  }, [videos, format, sortKey]);
  const visible = limit > 0 ? shown.slice(0, limit) : shown;

  const exportCsv = () => {
    const header = ["순위", "제목", "채널", "게시일", "길이(초)", "형식", "조회수", "좋아요", "댓글", "인기점수", "주소"];
    const rows = shown.map((v, i) => [
      i + 1,
      v.title,
      v.channelTitle,
      v.publishedAt.slice(0, 10),
      v.durationSeconds,
      v.isShort ? "쇼츠(추정)" : "일반",
      v.viewCount,
      v.likeCount,
      v.commentCount,
      v.popularity,
      `https://www.youtube.com/watch?v=${v.id}`,
    ]);
    downloadCsv(`${exportName}.csv`, header, rows);
  };

  const exportJson_ = () => downloadJson(`${exportName}.json`, exportJson);

  const selectClass = "rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-800 focus:outline-hidden focus:ring-2 focus:ring-red-500";

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-xs">
        <div className="flex rounded-lg bg-gray-100 p-0.5">
          {([["all", "전체"], ["long", "일반 영상"], ["short", "쇼츠"]] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFormat(key)}
              className={`rounded-md px-3 py-1.5 text-xs font-bold ${format === key ? "bg-red-600 text-white" : "text-gray-600 hover:bg-white"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-1.5 text-xs text-gray-600">
          정렬
          <select className={selectClass} value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}>
            {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
              <option key={k} value={k}>
                {SORT_LABELS[k]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-xs text-gray-600">
          표시
          <select className={selectClass} value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
            <option value={10}>상위 10개</option>
            <option value={20}>상위 20개</option>
            <option value={50}>상위 50개</option>
            <option value={0}>전체</option>
          </select>
        </label>
        <span className="text-xs text-gray-500">
          {shown.length}개 중 {visible.length}개
        </span>
        <div className="ml-auto flex gap-2">
          <button type="button" onClick={exportJson_} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700">
            <Download size={13} /> JSON 내보내기
          </button>
          <button type="button" onClick={exportCsv} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700">
            <Download size={13} /> CSV 내보내기
          </button>
        </div>
      </div>

      <p className="text-[11px] text-gray-500">
        쇼츠 구분은 YouTube가 알려주지 않아 추정합니다(60초 이하, 또는 3분 이하이면서 #shorts 표기). 좋아요·댓글이 비공개이면 &quot;비공개&quot;로 표시합니다.
      </p>

      {visible.length === 0 ? (
        <p className="rounded-2xl border border-gray-200 bg-white py-12 text-center text-sm text-gray-500">조건에 맞는 영상이 없습니다.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {visible.map((v, i) => (
            <article key={v.id} className="flex gap-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-xs">
              <a href={`https://www.youtube.com/watch?v=${v.id}`} target="_blank" rel="noopener noreferrer" className="relative block h-24 w-40 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={v.thumbnailUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                <span className="absolute left-1 top-1 rounded bg-black/70 px-1.5 text-[11px] font-bold text-white">{i + 1}</span>
                <span className="absolute bottom-1 right-1 rounded bg-black/75 px-1 text-[10px] font-medium text-white">{formatDuration(v.durationSeconds)}</span>
              </a>
              <div className="min-w-0 flex-1">
                <a href={`https://www.youtube.com/watch?v=${v.id}`} target="_blank" rel="noopener noreferrer" className="line-clamp-2 text-sm font-bold text-gray-900 hover:text-red-700">
                  {v.title}
                  <ExternalLink size={11} className="ml-1 inline text-gray-400" />
                </a>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-gray-500">
                  {showChannel && (
                    <button type="button" className="font-semibold text-gray-700 hover:text-red-700 hover:underline" onClick={() => onAnalyzeChannel?.(v.channelId)} title="이 채널 분석하기">
                      {v.channelTitle}
                    </button>
                  )}
                  <span>{formatDate(v.publishedAt)}</span>
                  {v.isShort && <span className="rounded bg-red-50 px-1 font-bold text-red-600">쇼츠(추정)</span>}
                  {showChannel && v.channelSubscriberCount !== undefined && <span>구독자 {formatNumber(v.channelSubscriberCount)}</span>}
                </p>
                {v.tags.length > 0 && (
                  <p className="mt-1 line-clamp-1 text-[11px] text-sky-700">{v.tags.slice(0, 5).map((t) => `#${t.replace(/\s+/g, "")}`).join(" ")}</p>
                )}
                <div className="mt-2 flex items-center gap-3 text-xs text-gray-600">
                  <span title="조회수">👁 {formatNumber(v.viewCount)}</span>
                  <span title="좋아요">👍 {formatNumber(v.likeCount)}</span>
                  <span title="댓글">💬 {formatNumber(v.commentCount)}</span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[11px] font-bold text-gray-700">인기 점수</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200">
                    <div className="h-full rounded-full bg-red-500" style={{ width: `${Math.min(100, v.popularity)}%` }} />
                  </div>
                  <span className="text-xs font-bold text-gray-900">{v.popularity.toFixed(1)}</span>
                </div>
                {onSummarize && (
                  <button
                    type="button"
                    disabled={summarizeDisabled}
                    onClick={() => onSummarize(v)}
                    className="mt-2 w-full rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-bold text-purple-700 hover:bg-purple-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    ✨ AI로 영상 요약하기
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
