"use client";

import { useFavorites } from "@/components/favorites/FavoritesProvider";
import { PlaylistReference } from "./PlaylistReference";
import Link from "next/link";
import { formatNumber } from "@/lib/youtube/metrics";
import type { YouTubeVideoItem } from "@/lib/youtube/types";
import {
  ExternalLink,
  Flame,
  TrendingUp,
  Eye,
  Bookmark,
  Sparkles,
  Link2,
} from "lucide-react";
import { useState } from "react";
import { ScriptAnalysisModal } from "@/components/analysis/ScriptAnalysisModal";
import type { ScriptAnalysisResult } from "@/lib/ai/scriptAnalyzer";
import { errorMessage } from "@/lib/errors";

interface VideoCardProps {
  video: YouTubeVideoItem;
  onBookmark?: (video: YouTubeVideoItem) => void;
  isBookmarked?: boolean;
}

export function VideoCard({ video, onBookmark, isBookmarked: initialBookmarked = false }: VideoCardProps) {
  const favorites = useFavorites();
  const [localBookmarked, setBookmarked] = useState(initialBookmarked);
  const bookmarked = favorites ? favorites.has("video", video.id) : localBookmarked;
  const bookmarkBusy = !!favorites && (favorites.loading || !!favorites.error || favorites.pending.has("video:" + video.id));
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<ScriptAnalysisResult | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<{ message: string; needKey?: boolean } | null>(null);

  const handleAnalyzeScript = async () => {
    setAnalyzing(true);
    setAnalyzeError(null);
    try {
      const res = await fetch("/api/youtube/analyze-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId: video.id,
          title: video.title,
          description: video.description,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setAnalyzeError({ message: data.error || "대본 분석 중 오류가 발생했습니다.", needKey: !!data.needAiKey });
        return;
      }

      setAnalysisResult(data.analysis);
      setModalOpen(true);
    } catch (err: unknown) {
      setAnalyzeError({ message: errorMessage(err) || "네트워크 오류가 발생했습니다." });
    } finally {
      setAnalyzing(false);
    }
  };

  const getBadgeStyle = (badge: string) => {
    switch (badge) {
      case "SUPER_VIRAL":
        return { backgroundColor: "rgb(255, 0, 0)", color: "#FFFFFF" };
      case "VIRAL":
        return { backgroundColor: "rgb(249, 171, 0)", color: "#000000" };
      case "RISING":
        return { backgroundColor: "rgb(43, 166, 64)", color: "#FFFFFF" };
      default:
        return { backgroundColor: "rgba(0, 0, 0, 0.7)", color: "#FFFFFF" };
    }
  };

  const getBadgeLabel = (badge: string) => {
    switch (badge) {
      case "SUPER_VIRAL":
        return "🚀 초대박";
      case "VIRAL":
        return "🔥 대박";
      case "RISING":
        return "📈 떡상";
      default:
        return "양호";
    }
  };

  const handleBookmarkToggle = () => {
    if (favorites) { void favorites.toggle("video", video); return; }
    const nextState = !bookmarked;
    setBookmarked(nextState);
    if (onBookmark) onBookmark(video);
  };

  const youtubeUrl = `https://www.youtube.com/watch?v=${video.id}`;

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-red-200 hover:shadow-xl">
      {/* 썸네일 영역 */}
      <div className="relative aspect-video w-full overflow-hidden bg-slate-900">
        {video.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
            썸네일 없음
          </div>
        )}

        {/* 떡상 뱃지 & VPH 오버레이 */}
        <div className="absolute left-2.5 top-2.5 flex items-center gap-1.5">
          <span
            style={getBadgeStyle(video.viralBadge)}
            className="rounded-md px-2 py-0.5 text-[11px] font-bold shadow-xs"
          >
            {getBadgeLabel(video.viralBadge)}
          </span>
          {video.vph > 0 && (
            <span className="rounded-md bg-slate-900/85 px-2 py-0.5 text-[11px] font-bold text-red-400 backdrop-blur-xs">
              ⚡ {formatNumber(video.vph)}/h
            </span>
          )}
        </div>

        {/* 구독자 대비 배수 오버레이 */}
        {video.vsRatio > 0 && (
          <div className="absolute bottom-2.5 right-2.5 rounded-md bg-slate-950/85 px-2 py-0.5 text-[11px] font-black text-amber-400 backdrop-blur-xs shadow-xs">
            {video.vsRatio}배
          </div>
        )}
      </div>

      {/* 정보 영역 */}
      <div className="flex flex-1 flex-col p-4">
        {/* 채널명 */}
        <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
          <span className="truncate font-semibold text-slate-700">{video.channelTitle}</span>
          {typeof video.channelSubscriberCount === "number" && video.channelSubscriberCount > 0 && (
            <span className="shrink-0 text-[11px] text-slate-400">
              구독자 {formatNumber(video.channelSubscriberCount)}
            </span>
          )}
        </div>

        {/* 영상 제목 */}
        <h3 className="mb-3 line-clamp-2 text-sm font-bold leading-snug text-slate-900 transition-colors group-hover:text-[#EA3323]">
          {video.title}
        </h3>

        {/* 핵심 바이럴 지표 박스 */}
        <div className="mb-3 mt-auto grid grid-cols-3 gap-1 rounded-xl border border-slate-200 bg-slate-50/80 p-2.5 text-center">
          <div>
            <div className="mb-0.5 flex items-center justify-center gap-0.5 text-[10px] font-semibold text-slate-500">
              <Eye className="h-3 w-3 text-slate-400" />
              <span>조회수</span>
            </div>
            <div className="text-xs font-black text-slate-800">
              {formatNumber(video.viewCount)}
            </div>
          </div>
          <div className="border-x border-slate-200">
            <div className="mb-0.5 flex items-center justify-center gap-0.5 text-[10px] font-semibold text-slate-500">
              <TrendingUp className="h-3 w-3 text-slate-400" />
              <span>구독대비</span>
            </div>
            <div className="text-xs font-black text-[#EA3323]">
              {video.vsRatio > 0 ? `${video.vsRatio}배` : "-"}
            </div>
          </div>
          <div>
            <div className="mb-0.5 flex items-center justify-center gap-0.5 text-[10px] font-semibold text-slate-500">
              <Flame className="h-3 w-3 text-slate-400" />
              <span>평균/h</span>
            </div>
            <div className="text-xs font-black text-slate-800">
              {video.vph > 0 ? formatNumber(video.vph) : "-"}
            </div>
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="space-y-2 border-t border-slate-100 pt-3">
          <button
            onClick={handleAnalyzeScript}
            disabled={analyzing}
            className="btn-3d-red w-full py-2.5 text-xs"
          >
            {analyzing ? (
              <>
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>대본 11대 심리 AI 분석 중...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5 fill-white" />
                <span>✨ AI 떡상 대본 공식 분석</span>
              </>
            )}
          </button>

          {analyzeError && (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-2 text-[11px] leading-relaxed text-red-700">
              {analyzeError.message}
              {analyzeError.needKey && (
                <>
                  {" "}
                  <Link href="/settings" className="font-bold text-blue-600 underline">
                    API 키 등록하러 가기 →
                  </Link>
                </>
              )}
            </p>
          )}

          <div className="flex items-center gap-1.5">
            <a
              href={youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-2 text-xs font-bold text-slate-700 shadow-xs transition-colors hover:bg-slate-50 hover:text-slate-900"
            >
              <span>유튜브 보기</span>
              <ExternalLink className="h-3 w-3 text-slate-400" />
            </a>

            <Link
              href={`/source-finder?url=${encodeURIComponent(youtubeUrl)}`}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-xs transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600"
              title="쇼츠 원본(롱폼) 추적"
            >
              <Link2 className="h-3.5 w-3.5" />
            </Link>

            <button
              onClick={handleBookmarkToggle}
              className={`flex h-8 w-8 items-center justify-center rounded-lg border shadow-xs transition-colors ${
                bookmarked
                  ? "border-amber-300 bg-amber-50 text-amber-600"
                  : "border-slate-200 bg-white text-slate-400 hover:border-amber-200 hover:bg-amber-50/50 hover:text-amber-500"
              }`}
              disabled={bookmarkBusy}
              aria-pressed={bookmarked}
              title={bookmarked ? "즐겨찾기 해제" : "즐겨찾기 보관"}
            >
              <Bookmark className={`h-3.5 w-3.5 ${bookmarked ? "fill-amber-500" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* 플레이리스트 연계 */}
      <div className="px-4 pb-3">
        <PlaylistReference id={video.id} title={video.title} />
      </div>

      <ScriptAnalysisModal
        analysis={analysisResult}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
