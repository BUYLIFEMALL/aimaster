"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toggleVideoMonitorAction, setVideoLinkAction } from "@/lib/actions/videos";

export interface VideoRowData {
  id: string;
  youtube_video_id: string;
  title: string;
  thumbnail_url: string | null;
  is_monitored: boolean;
  custom_link: string | null;
}

export function VideoRow({ video }: { video: VideoRowData }) {
  const router = useRouter();
  const [isToggling, setIsToggling] = useState(false);
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
    <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex items-start gap-3">
      {video.thumbnail_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={video.thumbnail_url} alt="" className="w-28 h-16 object-cover rounded-lg shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <a
          href={`https://www.youtube.com/watch?v=${video.youtube_video_id}`}
          target="_blank"
          rel="noreferrer"
          className="font-bold text-gray-900 hover:underline line-clamp-1"
        >
          {video.title}
        </a>
        <p className="text-xs text-gray-400 mt-0.5">
          {video.custom_link ? `링크: ${video.custom_link}` : "채널 기본 링크 사용"}
        </p>
        {showLinkForm && (
          <form onSubmit={handleSaveLink} className="mt-2 flex gap-2">
            <input type="hidden" name="videoId" value={video.id} />
            <input
              name="link"
              type="url"
              defaultValue={video.custom_link ?? ""}
              placeholder="이 영상 전용 링크 (비우면 기본 링크 사용)"
              className="input-sm flex-1"
            />
            <button
              type="submit"
              disabled={isSavingLink}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60"
            >
              저장
            </button>
          </form>
        )}
        {linkError && <p className="mt-1 text-xs text-red-600">{linkError}</p>}
      </div>
      <div className="flex flex-col items-end gap-2 shrink-0">
        <button
          type="button"
          onClick={handleToggle}
          disabled={isToggling}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
            video.is_monitored
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-gray-100 text-gray-500 border border-gray-200"
          }`}
        >
          {video.is_monitored ? "✅ 모니터링 중" : "⏸ 꺼짐"}
        </button>
        <button
          type="button"
          onClick={() => setShowLinkForm((v) => !v)}
          className="text-xs text-blue-600 hover:underline"
        >
          링크 설정
        </button>
      </div>
    </div>
  );
}
