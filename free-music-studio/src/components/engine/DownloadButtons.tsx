"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { EngineError, downloadFromLibrary } from "@/lib/engine";

const btn =
  "inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:opacity-40";

/**
 * 내려받기 — 보관함 곡이면 「원음」(무손실 FLAC 등)과 「MP3 320k」(엔진이 원음에서 변환, ffmpeg 필요) 두 가지.
 * 보관함에 없는 곡(옛 엔진)은 받은 파일 그대로 하나.
 */
export function DownloadButtons({
  trackId,
  title,
  ext,
  fallbackUrl,
  ffmpeg,
  cover = false,
  onError,
}: {
  trackId: string | null;
  title: string;
  ext: string;
  fallbackUrl?: string;
  ffmpeg: boolean;
  /** 표지가 있는 곡(엔진 0.6.8+) — MP3를 받으면 엔진이 표지를 넣어 준다 */
  cover?: boolean;
  onError?: (message: string) => void;
}) {
  const [busy, setBusy] = useState<"" | "orig" | "mp3">("");

  if (!trackId) {
    return fallbackUrl ? (
      <a href={fallbackUrl} download={`${title}.${ext}`} className={`${btn} border-emerald-500/40 text-emerald-300 hover:bg-emerald-950/50`}>
        <Download className="h-3.5 w-3.5" /> {ext.toUpperCase()} 내려받기
      </a>
    ) : null;
  }

  const get = async (format?: "mp3") => {
    setBusy(format ? "mp3" : "orig");
    try {
      await downloadFromLibrary(trackId, title, format);
    } catch (e) {
      onError?.(e instanceof EngineError ? e.message : "내려받지 못했습니다.");
    } finally {
      setBusy("");
    }
  };

  const lossless = ext !== "mp3";
  // 원음이 이미 MP3인 곡도 표지가 있으면 엔진을 거쳐 표지를 넣어 받는다(ffmpeg 있을 때)
  const mp3WithCover = !lossless && cover && ffmpeg;
  return (
    <span className="inline-flex flex-wrap gap-1.5">
      <button
        type="button"
        onClick={() => get(mp3WithCover ? "mp3" : undefined)}
        disabled={!!busy}
        title={mp3WithCover ? "앨범 표지를 넣어 받습니다" : undefined}
        className={`${btn} border-emerald-500/40 text-emerald-300 hover:bg-emerald-950/50`}
      >
        {busy === "orig" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
        {lossless ? `원음 ${ext.toUpperCase()}` : "MP3"}
      </button>
      {lossless && (
        <button
          type="button"
          onClick={() => get("mp3")}
          disabled={!!busy || !ffmpeg}
          title={ffmpeg ? `무손실 원음에서 MP3 320kbps로 바꿔 받습니다${cover ? "(앨범 표지 포함)" : ""}` : "이 PC에 MP3 변환 도구(ffmpeg)가 없어 원음만 받을 수 있습니다"}
          className={`${btn} border-slate-700 text-slate-300 hover:bg-slate-900`}
        >
          {busy === "mp3" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} MP3 320k
        </button>
      )}
    </span>
  );
}
