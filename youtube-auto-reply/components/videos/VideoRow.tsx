"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toggleVideoMonitorAction, setVideoLinkAction, hideVideoAction } from "@/lib/actions/videos";

export interface VideoRowData {
  id: string;
  youtube_video_id: string;
  title: string;
  thumbnail_url: string | null;
  is_monitored: boolean;
  custom_link: string | null;
}

export function VideoRow({
  video,
  selected,
  onToggleSelect,
}: {
  video: VideoRowData;
  selected: boolean;
  onToggleSelect: (id: string) => void;
}) {
  const router = useRouter();
  const [isToggling, setIsToggling] = useState(false);
  const [isHiding, setIsHiding] = useState(false);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [isSavingLink, setIsSavingLink] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  async function handleToggle() {
    setIsToggling(true);
    try {
      await toggleVideoMonitorAction(video.id, !video.is_monitored);
      router.refresh();
    } finally {
      setIsToggling(false);
    }
  }

  async function handleHide() {
    setIsHiding(true);
    try {
      await hideVideoAction(video.id);
      router.refresh();
    } finally {
      setIsHiding(false);
    }
  }

  async function handleSaveLink(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSavingLink(true);
    setLinkError(null);
    try {
      const result = await setVideoLinkAction(new FormData(e.currentTarget));
      if (result.error) setLinkError(result.error);
      else {
        setShowLinkForm(false);
        router.refresh();
      }
    } finally {
      setIsSavingLink(false);
    }
  }

  return (
    <div className="flex flex-wrap items-start gap-3 rounded-xl border border-yt-border bg-yt-surface p-3 transition-colors hover:bg-yt-raised">
      <input
        type="checkbox"
        checked={selected}
        onChange={() => onToggleSelect(video.id)}
        aria-label={`${video.title} 선택`}
        className="mt-1.5 shrink-0 accent-[#ff0000]"
      />
      {video.thumbnail_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={video.thumbnail_url} alt="" className="aspect-video w-28 shrink-0 rounded-lg object-cover sm:w-40" />
      )}
      <div className="min-w-0 flex-1">
        <a
          href={`https://www.youtube.com/watch?v=${video.youtube_video_id}`}
          target="_blank"
          rel="noreferrer"
          className="font-bold text-yt-text hover:underline line-clamp-1"
        >
          {video.title}
        </a>
        <p className="text-xs text-yt-muted mt-0.5">
          {video.custom_link ? `링크: ${video.custom_link}` : "채널 기본 링크 사용"}
        </p>
        {showLinkForm && (
          <form onSubmit={handleSaveLink} className="mt-2 flex gap-2">
            <input type="hidden" name="videoId" value={video.id} />
            <input
              name="link"
              type="text"
              defaultValue={video.custom_link ?? ""}
              placeholder="example.com (비우면 기본 링크 사용, https:// 생략 가능)"
              className="input-sm flex-1"
            />
            <button
              type="submit"
              disabled={isSavingLink}
              className="rounded-full bg-yt-red px-4 py-1.5 text-xs font-semibold text-white hover:bg-yt-red-hover disabled:opacity-60"
            >
              저장
            </button>
          </form>
        )}
        {linkError && <p className="mt-1 text-xs text-yt-danger">{linkError}</p>}
      </div>
      <div className="flex w-full flex-row flex-wrap justify-end gap-2 shrink-0 sm:w-auto sm:flex-col sm:items-end">
        <button
          type="button"
          onClick={handleToggle}
          disabled={isToggling}
          className={`min-h-[32px] rounded-full px-3 py-1.5 text-xs font-semibold ${
            video.is_monitored
              ? "bg-yt-success/10 text-yt-success border border-yt-success/30"
              : "bg-yt-raised text-yt-muted border border-yt-border"
          }`}
        >
          {video.is_monitored ? "✅ 모니터링 중" : "⏸ 꺼짐"}
        </button>
        <button
          type="button"
          onClick={() => setShowLinkForm((v) => !v)}
          className="text-xs text-yt-link hover:underline"
        >
          링크 설정
        </button>
        <button
          type="button"
          onClick={handleHide}
          disabled={isHiding}
          className="text-xs text-yt-muted hover:text-yt-danger hover:underline"
        >
          {isHiding ? "숨기는 중..." : "목록에서 숨기기"}
        </button>
      </div>
    </div>
  );
}
