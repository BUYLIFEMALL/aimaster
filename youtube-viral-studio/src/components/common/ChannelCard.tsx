"use client";

import { formatNumber, formatRelativeTime } from "@/lib/youtube/metrics";
import type { YouTubeChannelItem } from "@/lib/youtube/types";
import {
  ExternalLink,
  Sparkles,
  Users,
  Video,
  Eye,
  Bookmark,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";
import Link from "next/link";

interface ChannelCardProps {
  channel: YouTubeChannelItem;
  onBookmark?: (channel: YouTubeChannelItem) => void;
  isBookmarked?: boolean;
}

export function ChannelCard({ channel, onBookmark, isBookmarked: initialBookmarked = false }: ChannelCardProps) {
  const [bookmarked, setBookmarked] = useState(initialBookmarked);

  const handleBookmarkToggle = () => {
    const nextState = !bookmarked;
    setBookmarked(nextState);
    if (onBookmark) onBookmark(channel);
  };

  const channelUrl = channel.customUrl
    ? `https://www.youtube.com/${channel.customUrl}`
    : `https://www.youtube.com/channel/${channel.id}`;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs hover:shadow-md hover:border-gray-300 transition-all flex flex-col justify-between group">
      <div>
        {/* 상단 프로필 및 지표 */}
        <div className="flex items-start gap-3.5 mb-4">
          <img
            src={channel.thumbnailUrl || "/default-avatar.png"}
            alt={channel.title}
            className="w-14 h-14 rounded-full object-cover border border-gray-100 shrink-0 group-hover:scale-105 transition-transform"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <a
                href={channelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-base font-bold text-gray-900 hover:text-red-600 transition-colors truncate"
                title={channel.title}
              >
                {channel.title}
              </a>
            </div>
            {channel.customUrl && (
              <p className="text-xs text-gray-500 font-mono mb-1 truncate">
                {channel.customUrl}
              </p>
            )}
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                <Sparkles className="w-3 h-3 fill-amber-500" />
                <span>떡상지수 {channel.viralIndex ?? 85}점</span>
              </span>
            </div>
          </div>

          <button
            onClick={handleBookmarkToggle}
            className={`p-2 border rounded-lg transition-colors shrink-0 ${
              bookmarked
                ? "bg-amber-50 text-amber-600 border-amber-200"
                : "text-gray-500 hover:text-amber-600 hover:bg-amber-50 border-gray-200"
            }`}
            title="채널 즐겨찾기"
          >
            <Bookmark className={`w-4 h-4 ${bookmarked ? "fill-amber-500" : ""}`} />
          </button>
        </div>

        {/* 채널 소개 */}
        {channel.description && (
          <p className="text-xs text-gray-600 line-clamp-2 mb-4 leading-relaxed bg-gray-50/60 p-2.5 rounded-lg border border-gray-100">
            {channel.description}
          </p>
        )}

        {/* 4분할 핵심 지표 */}
        <div className="grid grid-cols-2 gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-gray-500">구독자수</div>
              <div className="text-xs font-bold text-gray-900">
                {formatNumber(channel.subscriberCount)}명
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-gray-500">평균 조회수</div>
              <div className="text-xs font-bold text-emerald-600">
                {formatNumber(channel.averageViews)}회
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
              <Video className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-gray-500">동영상 수</div>
              <div className="text-xs font-bold text-gray-900">
                {channel.videoCount}개
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
              <Eye className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-gray-500">총 조회수</div>
              <div className="text-xs font-bold text-gray-900">
                {formatNumber(channel.viewCount)}회
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 하단 버튼 */}
      <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
        <a
          href={channelUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium text-gray-700 bg-white hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
        >
          <span>유튜브 채널 방문</span>
          <ExternalLink className="w-3.5 h-3.5 text-gray-500" />
        </a>

        <Link
          href={`/viral-shorts?keyword=${encodeURIComponent(channel.title)}`}
          className="py-2 px-3 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors whitespace-nowrap"
        >
          <span>이 채널 쇼츠 찾기</span>
        </Link>
      </div>
    </div>
  );
}
