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
    <div className="bg-yt-surface rounded-xl border border-yt-border p-5 shadow-xs hover:shadow-md hover:border-yt-muted transition-all flex flex-col justify-between group">
      <div>
        {/* 상단 프로필 및 지표 */}
        <div className="flex items-start gap-3.5 mb-4">
          <img
            src={channel.thumbnailUrl || "/default-avatar.png"}
            alt={channel.title}
            className="w-14 h-14 rounded-full object-cover border border-yt-border shrink-0 group-hover:scale-105 transition-transform"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <a
                href={channelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-base font-bold text-yt-text hover:text-yt-danger transition-colors truncate"
                title={channel.title}
              >
                {channel.title}
              </a>
            </div>
            {channel.customUrl && (
              <p className="text-xs text-yt-muted font-mono mb-1 truncate">
                {channel.customUrl}
              </p>
            )}
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-yt-warn/10 text-yt-warn border border-yt-warn/40">
                <Sparkles className="w-3 h-3 fill-amber-500" />
                <span>떡상지수 {channel.viralIndex ?? 85}점</span>
              </span>
            </div>
          </div>

          <button
            onClick={handleBookmarkToggle}
            className={`p-2 border rounded-lg transition-colors shrink-0 ${
              bookmarked
                ? "bg-yt-warn/10 text-yt-warn border-yt-warn/40"
                : "text-yt-muted hover:text-yt-warn hover:bg-yt-warn/20 border-yt-border"
            }`}
            title="채널 즐겨찾기"
          >
            <Bookmark className={`w-4 h-4 ${bookmarked ? "fill-amber-500" : ""}`} />
          </button>
        </div>

        {/* 채널 소개 */}
        {channel.description && (
          <p className="text-xs text-yt-muted line-clamp-2 mb-4 leading-relaxed bg-yt-raised p-2.5 rounded-lg border border-yt-border">
            {channel.description}
          </p>
        )}

        {/* 4분할 핵심 지표 */}
        <div className="grid grid-cols-2 gap-2 p-3 bg-yt-raised rounded-xl border border-yt-border mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-yt-link/10 text-yt-link">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-yt-muted">구독자수</div>
              <div className="text-xs font-bold text-yt-text">
                {formatNumber(channel.subscriberCount)}명
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-yt-success/10 text-yt-success">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-yt-muted">평균 조회수</div>
              <div className="text-xs font-bold text-yt-success">
                {formatNumber(channel.averageViews)}회
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-yt-violet/15 text-yt-violet">
              <Video className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-yt-muted">동영상 수</div>
              <div className="text-xs font-bold text-yt-text">
                {channel.videoCount}개
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-yt-red/10 text-yt-danger">
              <Eye className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-yt-muted">총 조회수</div>
              <div className="text-xs font-bold text-yt-text">
                {formatNumber(channel.viewCount)}회
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 하단 버튼 */}
      <div className="flex items-center gap-2 pt-2 border-t border-yt-border">
        <a
          href={channelUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium text-yt-text bg-yt-surface hover:bg-yt-hover border border-yt-border rounded-lg transition-colors"
        >
          <span>유튜브 채널 방문</span>
          <ExternalLink className="w-3.5 h-3.5 text-yt-muted" />
        </a>

        <Link
          href={`/viral-shorts?keyword=${encodeURIComponent(channel.title)}`}
          className="py-2 px-3 text-xs font-medium text-yt-danger bg-yt-red/10 hover:bg-yt-red/20 border border-yt-red/40 rounded-lg transition-colors whitespace-nowrap"
        >
          <span>이 채널 쇼츠 찾기</span>
        </Link>
      </div>
    </div>
  );
}
