"use client";

import Image from "next/image";
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
  Clock,
  Eye,
  Users,
  Bookmark,
  Sparkles,
  Link2,
} from "lucide-react";
import { useState } from "react";

interface VideoCardProps {
  video: YouTubeVideoItem;
  onBookmark?: (video: YouTubeVideoItem) => void;
  isBookmarked?: boolean;
}

export function VideoCard({ video, onBookmark, isBookmarked: initialBookmarked = false }: VideoCardProps) {
  const [bookmarked, setBookmarked] = useState(initialBookmarked);

  const getBadgeStyle = (badge: string) => {
    switch (badge) {
      case "SUPER_VIRAL":
        return "bg-gradient-to-r from-red-600 to-rose-600 text-white font-bold shadow-md shadow-red-500/20";
      case "VIRAL":
        return "bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold";
      case "RISING":
        return "bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold";
      default:
        return "bg-gray-100 text-gray-700 font-medium";
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
    const nextState = !bookmarked;
    setBookmarked(nextState);
    if (onBookmark) onBookmark(video);
  };

  const youtubeUrl = `https://www.youtube.com/watch?v=${video.id}`;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs hover:shadow-md hover:border-gray-300 transition-all flex flex-col group">
      {/* 썸네일 영역 */}
      <div className="relative aspect-video bg-gray-100 overflow-hidden">
        {video.thumbnailUrl ? (
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
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
          <div className="absolute top-2.5 right-2.5 bg-red-600/95 backdrop-blur-xs text-white text-xs font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-sm">
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
            <img
              src={video.channelThumbnailUrl}
              alt={video.channelTitle}
              className="w-5 h-5 rounded-full object-cover"
            />
          )}
          <span className="text-xs font-medium text-gray-600 truncate flex-1" title={video.channelTitle}>
            {video.channelTitle}
          </span>
          <div className="flex items-center gap-1 text-[11px] text-gray-500 font-medium">
            <Users className="w-3 h-3 text-gray-500" />
            <span>{formatNumber(video.channelSubscriberCount)}명</span>
          </div>
        </div>

        {/* 영상 제목 */}
        <a
          href={youtubeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-semibold text-gray-900 line-clamp-2 hover:text-red-600 transition-colors mb-3 leading-snug"
          title={video.title}
        >
          {video.title}
        </a>

        {/* 핵심 바이럴 지표 박스 */}
        <div className="grid grid-cols-3 gap-1.5 py-2.5 px-3 bg-gray-50 rounded-lg border border-gray-100 text-center mb-3 mt-auto">
          <div>
            <div className="text-[10px] text-gray-500 mb-0.5 flex items-center justify-center gap-0.5">
              <Eye className="w-3 h-3 text-gray-500" />
              <span>조회수</span>
            </div>
            <div className="text-xs font-bold text-gray-900">
              {formatNumber(video.viewCount)}
            </div>
          </div>
          <div className="border-x border-gray-200">
            <div className="text-[10px] text-gray-500 mb-0.5 flex items-center justify-center gap-0.5">
              <TrendingUp className="w-3 h-3 text-gray-500" />
              <span>구독대비</span>
            </div>
            <div className="text-xs font-bold text-red-600">
              {video.vsRatio > 0 ? `${video.vsRatio}배` : "-"}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-gray-500 mb-0.5 flex items-center justify-center gap-0.5">
              <Flame className="w-3 h-3 text-gray-500" />
              <span>속도/h</span>
            </div>
            <div className="text-xs font-bold text-gray-900">
              {video.vph > 0 ? formatNumber(video.vph) : "-"}
            </div>
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="flex items-center gap-1.5 pt-1 border-t border-gray-100">
          <a
            href={youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs font-medium text-gray-700 bg-white hover:bg-gray-100 border border-gray-200 rounded-md transition-colors"
          >
            <span>유튜브 보기</span>
            <ExternalLink className="w-3.5 h-3.5 text-gray-500" />
          </a>

          <Link
            href={`/source-finder?url=${encodeURIComponent(youtubeUrl)}`}
            className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 border border-gray-200 rounded-md transition-colors"
            title="쇼츠 원본(롱폼) 추적"
          >
            <Link2 className="w-4 h-4" />
          </Link>

          <button
            onClick={handleBookmarkToggle}
            className={`p-1.5 border rounded-md transition-colors ${
              bookmarked
                ? "bg-amber-50 text-amber-600 border-amber-200"
                : "text-gray-500 hover:text-amber-600 hover:bg-amber-50 border-gray-200"
            }`}
            title="즐겨찾기 보관"
          >
            <Bookmark className={`w-4 h-4 ${bookmarked ? "fill-amber-500" : ""}`} />
          </button>
        </div>
      </div>
    </div>
  );
}
