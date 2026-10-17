"use client";

import { useEffect, useState } from "react";

// 즐겨찾기는 이 브라우저(localStorage)에만 저장되므로 개수도 브라우저에서 읽는다.
export function FavoriteCounts() {
  const [counts, setCounts] = useState<{ videos: number; channels: number } | null>(null);

  useEffect(() => {
    const read = (key: string) => {
      try {
        const raw = localStorage.getItem(key);
        const arr = raw ? JSON.parse(raw) : [];
        return Array.isArray(arr) ? arr.length : 0;
      } catch {
        return 0;
      }
    };
    setCounts({ videos: read("yvs_fav_videos"), channels: read("yvs_fav_channels") });
  }, []);

  return (
    <span className="tabular-nums">
      {counts ? `영상 ${counts.videos} · 채널 ${counts.channels}` : "…"}
    </span>
  );
}
