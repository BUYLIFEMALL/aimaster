"use client";

import { VideoInput } from "@/types/product";

interface VideoUrlInputProps {
  videos: VideoInput[];
  onChange: (videos: VideoInput[]) => void;
  maxVideos?: number;
}

function isValidVideoUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return (
      u.hostname.includes("youtube.com") ||
      u.hostname.includes("youtu.be") ||
      u.hostname.includes("vimeo.com") ||
      url.endsWith(".mp4")
    );
  } catch {
    return false;
  }
}

export default function VideoUrlInput({
  videos,
  onChange,
  maxVideos = 2,
}: VideoUrlInputProps) {
  function updateVideo(index: number, field: keyof VideoInput, value: string) {
    const updated = videos.map((v, i) =>
      i === index ? { ...v, [field]: value } : v
    );
    onChange(updated);
  }

  function addVideo() {
    if (videos.length < maxVideos) {
      onChange([...videos, { url: "", caption: "" }]);
    }
  }

  function removeVideo(index: number) {
    onChange(videos.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3">
      {videos.map((video, i) => (
        <div key={i} className="bg-gray-50 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              영상 {i + 1}
            </span>
            <button
              type="button"
              onClick={() => removeVideo(i)}
              className="text-xs text-red-400 hover:text-red-600 transition-colors"
            >
              삭제
            </button>
          </div>
          <input
            type="url"
            placeholder="YouTube 또는 Vimeo URL을 입력하세요"
            value={video.url}
            onChange={(e) => updateVideo(i, "url", e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
          />
          {video.url && !isValidVideoUrl(video.url) && (
            <p className="text-xs text-red-500">
              YouTube, Vimeo 또는 .mp4 URL만 지원합니다.
            </p>
          )}
          <input
            type="text"
            placeholder="캡션 (선택) — 예: 언박싱 영상"
            value={video.caption || ""}
            onChange={(e) => updateVideo(i, "caption", e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
          />
        </div>
      ))}

      {videos.length < maxVideos && (
        <button
          type="button"
          onClick={addVideo}
          className="w-full border-2 border-dashed border-gray-300 rounded-xl py-3 text-sm text-gray-500 hover:border-yellow-400 hover:text-yellow-600 transition-colors"
        >
          + 영상 URL 추가 ({videos.length}/{maxVideos})
        </button>
      )}
    </div>
  );
}
