"use client";

import { useFavorites } from "@/components/favorites/FavoritesProvider";
import { PlaylistReference } from './PlaylistReference';
import Link from "next/link";
import {
  formatNumber,
  formatVPH,
  formatRelativeTime,
} from "@/lib/youtube/metrics";
import type { YouTubeVideoItem } from "@/lib/youtube/types";
import {
  ExternalLink,
  Flame,
  TrendingUp,
  Eye,
  Users,
  Bookmark,
  Sparkles,
  Link2,
} from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const [localBookmarked, setBookmarked] = useState(initialBookmarked);
  const bookmarked = favorites ? favorites.has("video", video.id) : localBookmarked;
  const bookmarkBusy = !!favorites && (favorites.loading || !!favorites.error || favorites.pending.has("video:" + video.id));
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<ScriptAnalysisResult | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const handleAnalyzeScript = async () => {
    setAnalyzing(true);
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
        if (data.needAiKey) {
          if (confirm(`${data.error}\n\n지금 설정 페이지로 이동하여 API 키를 등록하시겠습니까?`)) {
            router.push("/settings"); // v1.15: Next 방식 이동(도착 화면 동일)
          }
        } else {
          alert(data.error || "대본 분석 중 오류가 발생했습니다.");
        }
        return;
      }

      setAnalysisResult(data.analysis);
      setModalOpen(true);
    } catch (err: unknown) {
      alert(errorMessage(err) || "네트워크 오류가 발생했습니다.");
    } finally {
      setAnalyzing(false);
    }
  };

  const getBadgeStyle = (badge: string) => {
    switch (badge) {
      case "SUPER_VIRAL":
        return "bg-yt-red text-white font-bold";
      case "VIRAL":
        return "bg-yt-warn text-black font-bold";
      case "RISING":
        return "bg-yt-success text-white font-semibold";
      default:
        return "bg-black/70 text-white font-medium";
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
    <div className="bg-yt-surface rounded-xl border border-yt-border overflow-hidden hover:border-yt-muted hover:bg-yt-raised transition-all flex flex-col group">
      {/* 썸네일 영역 */}
      <div className="relative aspect-video bg-yt-raised overflow-hidden">
        {video.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- 외부 유튜브 썸네일(i.ytimg.com 등): next/image로 바꾸면 이미지 최적화 비용·원격 주소 설정이 필요해 원본 <img> 유지
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-yt-muted">
            썸네일 없음
          </div>
        )}

        {/* 떡상 뱃지 */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
          <span className={`text-xs px-2 py-0.5 rounded-full ${getBadgeStyle(video.viralBadge)}`}>
            {getBadgeLabel(video.viralBadge)}
          </span>
          {video.viralScore > 0 && (
            <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-black/70 text-white backdrop-blur-xs">
              {video.viralScore}점
            </span>
          )}
        </div>

        {/* VPH (시간당 속도) 뱃지 */}
        {video.vph > 0 && (
          <div className="absolute top-2.5 right-2.5 bg-yt-red backdrop-blur-xs text-white text-xs font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-sm">
            <Flame className="w-3.5 h-3.5 fill-white" />
            <span>{formatVPH(video.vph)}</span>
          </div>
        )}

        {/* 재생 시간 / 상대 시간 */}
        <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
          <span className="bg-black/75 backdrop-blur-xs text-white text-[11px] px-1.5 py-0.5 rounded font-mono">
            {formatRelativeTime(video.publishedAt)}
          </span>
        </div>
      </div>

      {/* 본문 정보 */}
      <div className="p-4 flex-1 flex flex-col">
        {/* 채널 정보 */}
        <div className="flex items-center gap-2 mb-2">
          {video.channelThumbnailUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- 외부 유튜브 썸네일(i.ytimg.com 등): next/image로 바꾸면 이미지 최적화 비용·원격 주소 설정이 필요해 원본 <img> 유지
            <img
              src={video.channelThumbnailUrl}
              alt={video.channelTitle}
              className="w-5 h-5 rounded-full object-cover"
            />
          )}
          <span className="text-xs font-medium text-yt-muted truncate flex-1" title={video.channelTitle}>
            {video.channelTitle}
          </span>
          <div className="flex items-center gap-1 text-[11px] text-yt-muted font-medium">
            <Users className="w-3 h-3 text-yt-muted" />
            <span>{formatNumber(video.channelSubscriberCount)}명</span>
          </div>
        </div>

        {/* 영상 제목 */}
        <a
          href={youtubeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-semibold text-yt-text line-clamp-2 hover:text-yt-danger transition-colors mb-3 leading-snug"
          title={video.title}
        >
          {video.title}
        </a>

        {/* 핵심 바이럴 지표 박스 */}
        <div className="grid grid-cols-3 gap-1.5 py-2.5 px-3 bg-yt-raised rounded-lg border border-yt-border text-center mb-3 mt-auto">
          <div>
            <div className="text-[10px] text-yt-muted mb-0.5 flex items-center justify-center gap-0.5">
              <Eye className="w-3 h-3 text-yt-muted" />
              <span>조회수</span>
            </div>
            <div className="text-xs font-bold text-yt-text">
              {formatNumber(video.viewCount)}
            </div>
          </div>
          <div className="border-x border-yt-border">
            <div className="text-[10px] text-yt-muted mb-0.5 flex items-center justify-center gap-0.5">
              <TrendingUp className="w-3 h-3 text-yt-muted" />
              <span>구독대비</span>
            </div>
            <div className="text-xs font-bold text-yt-danger">
              {video.vsRatio > 0 ? `${video.vsRatio}배` : "-"}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-yt-muted mb-0.5 flex items-center justify-center gap-0.5">
              <Flame className="w-3 h-3 text-yt-muted" />
              <span>평균/h</span>
            </div>
            <div className="text-xs font-bold text-yt-text">
              {video.vph > 0 ? formatNumber(video.vph) : "-"}
            </div>
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="space-y-1.5 pt-2 border-t border-yt-border">
          {/* AI 떡상 분석 실행 버튼 */}
          <button
            onClick={handleAnalyzeScript}
            disabled={analyzing}
            className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold text-white bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 rounded-lg transition-all shadow-xs disabled:opacity-50"
          >
            {analyzing ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>대본 3단 구조 AI 분석 중...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 fill-white" />
                <span>✨ AI 떡상 대본 분석</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-1.5">
            <a
              href={youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs font-medium text-yt-text bg-yt-surface hover:bg-yt-hover border border-yt-border rounded-md transition-colors"
            >
              <span>유튜브 보기</span>
              <ExternalLink className="w-3.5 h-3.5 text-yt-muted" />
            </a>

            <Link
              href={`/source-finder?url=${encodeURIComponent(youtubeUrl)}`}
              className="p-1.5 text-yt-muted hover:text-yt-violet hover:bg-yt-violet/20 border border-yt-border rounded-md transition-colors"
              title="쇼츠 원본(롱폼) 추적"
            >
              <Link2 className="w-4 h-4" />
            </Link>

            <button
              onClick={handleBookmarkToggle}
              className={`p-1.5 border rounded-md transition-colors ${
                bookmarked
                  ? "bg-yt-warn/10 text-yt-warn border-yt-warn/40"
                  : "text-yt-muted hover:text-yt-warn hover:bg-yt-warn/20 border-yt-border"
              }`}
              disabled={bookmarkBusy}
              aria-pressed={bookmarked}
              title={bookmarked ? "즐겨찾기 해제" : "즐겨찾기 보관"}
            >
              <Bookmark className={`w-4 h-4 ${bookmarked ? "fill-amber-500" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* AI 대본 분석 모달 */}
      <div className="px-4 pb-3"><PlaylistReference id={video.id} title={video.title} /></div>
      <ScriptAnalysisModal
        analysis={analysisResult}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
