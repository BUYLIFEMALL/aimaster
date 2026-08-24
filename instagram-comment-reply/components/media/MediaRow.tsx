"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toggleMediaMonitorAction, setMediaLinkAction, hideMediaAction } from "@/lib/actions/media";

export interface MediaRowData {
  id: string;
  ig_media_id: string;
  caption: string | null;
  permalink: string | null;
  thumbnail_url: string | null;
  is_monitored: boolean;
  custom_link: string | null;
}

export function MediaRow({
  media,
  selected,
  onToggleSelect,
}: {
  media: MediaRowData;
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
      await toggleMediaMonitorAction(media.id, !media.is_monitored);
      router.refresh();
    } finally {
      setIsToggling(false);
    }
  }

  async function handleHide() {
    setIsHiding(true);
    try {
      await hideMediaAction(media.id);
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
      const result = await setMediaLinkAction(new FormData(e.currentTarget));
      if (result.error) setLinkError(result.error);
      else {
        setShowLinkForm(false);
        router.refresh();
      }
    } finally {
      setIsSavingLink(false);
    }
  }

  const caption = media.caption || "(캡션 없음)";

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex items-start gap-3">
      <input
        type="checkbox"
        checked={selected}
        onChange={() => onToggleSelect(media.id)}
        aria-label={`${caption} 선택`}
        className="mt-1.5 shrink-0"
      />
      {media.thumbnail_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={media.thumbnail_url} alt="" className="w-16 h-16 object-cover rounded-lg shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        {media.permalink ? (
          <a
            href={media.permalink}
            target="_blank"
            rel="noreferrer"
            className="font-bold text-gray-900 hover:underline line-clamp-2"
          >
            {caption}
          </a>
        ) : (
          <p className="font-bold text-gray-900 line-clamp-2">{caption}</p>
        )}
        <p className="text-xs text-gray-400 mt-0.5">
          {media.custom_link ? `링크: ${media.custom_link}` : "채널 기본 링크 사용"}
        </p>
        {showLinkForm && (
          <form onSubmit={handleSaveLink} className="mt-2 flex gap-2">
            <input type="hidden" name="mediaId" value={media.id} />
            <input
              name="link"
              type="text"
              defaultValue={media.custom_link ?? ""}
              placeholder="example.com (비우면 기본 링크 사용, https:// 생략 가능)"
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
            media.is_monitored
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-gray-100 text-gray-500 border border-gray-200"
          }`}
        >
          {media.is_monitored ? "✅ 모니터링 중" : "⏸ 꺼짐"}
        </button>
        <button
          type="button"
          onClick={() => setShowLinkForm((v) => !v)}
          className="text-xs text-blue-600 hover:underline"
        >
          링크 설정
        </button>
        <button
          type="button"
          onClick={handleHide}
          disabled={isHiding}
          className="text-xs text-gray-400 hover:text-red-600 hover:underline"
        >
          {isHiding ? "숨기는 중..." : "목록에서 숨기기"}
        </button>
      </div>
    </div>
  );
}
