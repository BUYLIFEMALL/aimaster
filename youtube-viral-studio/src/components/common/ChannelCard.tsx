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
    <div className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-amber-500/25 bg-[#131B2A] p-5 shadow-lg shadow-black/40 transition-all duration-200 hover:-translate-y-1 hover:border-amber-500/50 hover:shadow-amber-500/10">
      <div>
        {/* 채널 헤더 */}
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {channel.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={channel.thumbnailUrl}
                alt={channel.title}
                className="h-12 w-12 rounded-full border border-amber-500/30 object-cover shadow-xs shrink-0"
                loading="lazy"
              />
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-800 border border-slate-700 text-xs font-bold text-slate-400">
                CH
              </div>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="truncate text-sm font-black text-slate-100 group-hover:text-[#FBBF24] transition-colors">
                  {channel.title}
                </h3>
                {(channel.viralIndex ?? 0) > 0 && (
                  <span className="inline-flex shrink-0 items-center gap-0.5 rounded-md bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-black text-[#FBBF24] border border-amber-500/40">
                    <Sparkles className="h-3 w-3 fill-amber-500 text-amber-400" />
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
                ? "border-amber-500/50 bg-amber-500/20 text-[#FBBF24]"
                : "border-slate-700 bg-slate-800/80 text-slate-400 hover:border-amber-500/40 hover:bg-amber-950/40 hover:text-amber-300"
            }`}
            disabled={bookmarkBusy}
            aria-pressed={bookmarked}
            title={bookmarked ? "채널 즐겨찾기 해제" : "채널 즐겨찾기"}
          >
            <Bookmark className={`h-3.5 w-3.5 ${bookmarked ? "fill-amber-400" : ""}`} />
          </button>
        </div>

        {/* 채널 소개 */}
        {channel.description && (
          <p className="mb-3 line-clamp-2 rounded-xl border border-slate-800 bg-[#0B0F17]/70 p-2.5 text-[11px] leading-relaxed text-slate-300">
            {channel.description}
          </p>
        )}

        {/* 4분할 핵심 지표 박스 */}
        <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl border border-slate-800 bg-[#0B0F17]/90 p-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-950/60 text-blue-400 border border-blue-800/40">
              <Users className="h-3.5 w-3.5" />
            </div>
            <div>
              <div className="text-[10px] font-semibold text-slate-400">구독자수</div>
              <div className="text-xs font-black text-slate-100">
                {formatNumber(channel.subscriberCount)}명
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
              <TrendingUp className="h-3.5 w-3.5" />
            </div>
            <div>
              <div className="text-[10px] font-semibold text-slate-400">평균 조회수</div>
              <div className="text-xs font-black text-emerald-400">
                {formatNumber(channel.averageViews)}회
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-950/60 text-indigo-400 border border-indigo-800/40">
              <Video className="h-3.5 w-3.5" />
            </div>
            <div>
              <div className="text-[10px] font-semibold text-slate-400">영상 수</div>
              <div className="text-xs font-black text-slate-100">
                {channel.videoCount}개
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-950/60 text-red-400 border border-red-800/40">
              <Eye className="h-3.5 w-3.5" />
            </div>
            <div>
              <div className="text-[10px] font-semibold text-slate-400">총 조회수</div>
              <div className="text-xs font-black text-slate-100">
                {formatNumber(channel.viewCount)}회
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 하단 버튼 */}
      <div className="flex items-center gap-2 border-t border-slate-800/80 pt-3">
        <a
          href={channelUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 py-2 text-xs font-bold text-slate-200 shadow-xs transition-colors hover:bg-slate-700 hover:text-white"
        >
          <span>채널 방문</span>
          <ExternalLink className="h-3 w-3 text-slate-400" />
        </a>

        <Link
          href={`/viral-shorts?keyword=${encodeURIComponent(channel.title)}`}
          className="btn-3d-gold py-2 px-3 text-xs whitespace-nowrap"
        >
          <span>이 채널 쇼츠 찾기</span>
        </Link>
      </div>
    </div>
  );
}
