"use client";

// 곡 표지 작은 그림(엔진 0.6.8+, 2026-11-05 주인님 「모든 음악에 표지 보이기」) — 내 PC 노래 폴더의 「곡 제목.png」를
// 화면에 보일 때만 엔진에서 받아 온다. 표지가 없으면 음표 자리표시.
import { useEffect, useRef, useState } from "react";
import { Music2 } from "lucide-react";
import { fetchLibraryArt } from "@/lib/engine";

export function CoverThumb({ trackId, has, title }: { trackId: string; has: boolean; title: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [src, setSrc] = useState("");

  useEffect(() => {
    if (!has || !box.current) return;
    let url = "";
    let cancelled = false;
    const seen = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      seen.disconnect();
      fetchLibraryArt(trackId)
        .then((u) => {
          if (cancelled) URL.revokeObjectURL(u);
          else setSrc((url = u));
        })
        .catch(() => {});
    });
    seen.observe(box.current);
    return () => {
      cancelled = true;
      seen.disconnect();
      if (url) URL.revokeObjectURL(url);
      setSrc("");
    };
  }, [trackId, has]);

  return (
    <div ref={box} className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-800 bg-slate-900">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={`${title} 표지`} className="h-full w-full object-cover" />
      ) : (
        <Music2 className="h-5 w-5 text-slate-600" aria-hidden />
      )}
    </div>
  );
}
