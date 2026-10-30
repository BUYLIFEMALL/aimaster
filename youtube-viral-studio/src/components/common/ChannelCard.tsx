"use client";

import { useFavorites } from "@/components/favorites/FavoritesProvider";
import { formatNumber } from "@/lib/youtube/metrics";
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
  const favorites = useFavorites();
  const [localBookmarked, setBookmarked] = useState(initialBookmarked);

  const bookmarked = favorites ? favorites.has("channel", channel.id) : localBookmarked;
  const bookmarkBusy = !!favorites && (favorites.loading || !!favorites.error || favorites.pending.has("channel:" + channel.id));
  const handleBookmarkToggle = () => {
    if (favorites) { void favorites.toggle("channel", channel); return; }
    const nextState = !bookmarked;
    setBookmarked(nextState);
    if (onBookmark) onBookmark(channel);
  };

  const channelUrl = channel.customUrl
    ? `https://www.youtube.com/${channel.customUrl}`
    : `https://www.youtube.com/channel/${channel.id}`;

  return (
    <div className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-red-200 hover:shadow-lg">
      <div>
        {/* 채널 헤더 */}
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {channel.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={channel.thumbnailUrl}
                alt={channel.title}
                className="h-12 w-12 rounded-full border border-slate-200 object-cover shadow-xs shrink-0"
                loading="lazy"
              />
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                CH
              </div>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="truncate text-sm font-black text-slate-900 group-hover:text-[#EA3323] transition-colors">
                  {channel.title}
                </h3>
                {(channel.viralIndex ?? 0) > 0 && (
                  <span className="inline-flex shrink-0 items-center gap-0.5 rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-black text-amber-800">
                    <Sparkles className="h-3 w-3 fill-amber-500 text-amber-600" />
                    황금 {channel.viralIndex}점
                  </span>
                )}
              </div>
              <p className="truncate text-[11px] font-medium text-slate-400">
                {channel.customUrl ? `@${channel.customUrl.replace(/^@/, '')}` : channel.id}
              </p>
            </div>
          </div>

          <button
            onClick={handleBookmarkToggle}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border shadow-xs transition-colors ${
              bookmarked
                ? "border-amber-300 bg-amber-50 text-amber-600"
                : "border-slate-200 bg-white text-slate-400 hover:border-amber-200 hover:bg-amber-50/50 hover:text-amber-500"
            }`}
            disabled={bookmarkBusy}
            aria-pressed={bookmarked}
            title={bookmarked ? "채널 즐겨찾기 해제" : "채널 즐겨찾기"}
          >
            <Bookmark className={`h-3.5 w-3.5 ${bookmarked ? "fill-amber-500" : ""}`} />
          </button>
        </div>

        {/* 채널 소개 */}
        {channel.description && (
          <p className="mb-3 line-clamp-2 rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 text-[11px] leading-relaxed text-slate-600">
            {channel.description}
          </p>
        )}

        {/* 4분할 핵심 지표 박스 */}
        <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-slate-50/80 p-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
              <Users className="h-3.5 w-3.5" />
            </div>
            <div>
              <div className="text-[10px] font-semibold text-slate-500">구독자수</div>
              <div className="text-xs font-black text-slate-800">
                {formatNumber(channel.subscriberCount)}명
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <TrendingUp className="h-3.5 w-3.5" />
            </div>
            <div>
              <div className="text-[10px] font-semibold text-slate-500">평균 조회수</div>
              <div className="text-xs font-black text-emerald-700">
                {formatNumber(channel.averageViews)}회
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
              <Video className="h-3.5 w-3.5" />
            </div>
            <div>
              <div className="text-[10px] font-semibold text-slate-500">영상 수</div>
              <div className="text-xs font-black text-slate-800">
                {channel.videoCount}개
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-100 text-[#EA3323]">
              <Eye className="h-3.5 w-3.5" />
            </div>
            <div>
              <div className="text-[10px] font-semibold text-slate-500">총 조회수</div>
              <div className="text-xs font-black text-slate-800">
                {formatNumber(channel.viewCount)}회
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 하단 버튼 */}
      <div className="flex items-center gap-2 border-t border-slate-100 pt-3">
        <a
          href={channelUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-2 text-xs font-bold text-slate-700 shadow-xs transition-colors hover:bg-slate-50 hover:text-slate-900"
        >
          <span>채널 방문</span>
          <ExternalLink className="h-3 w-3 text-slate-400" />
        </a>

        <Link
          href={`/viral-shorts?keyword=${encodeURIComponent(channel.title)}`}
          className="btn-3d-red py-2 px-3 text-xs whitespace-nowrap"
        >
          <span>이 채널 쇼츠 찾기</span>
        </Link>
      </div>
    </div>
  );
}
