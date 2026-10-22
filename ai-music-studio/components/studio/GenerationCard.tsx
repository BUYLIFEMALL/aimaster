"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Download, FileText, Loader2, Trash2 } from "lucide-react";
import type { ClientGeneration } from "@/lib/generationTypes";

export const LYRIC_VIDEO_URL = "https://lyric-video-studio.buylife.xyz/source";
export const PLAYLIST_URL = "https://playlist-channel-studio.buylife.xyz/video";

function elapsed(from: string) {
  const s = Math.max(0, Math.floor((Date.now() - new Date(from).getTime()) / 1000));
  return s < 60 ? `${s}초` : `${Math.floor(s / 60)}분 ${s % 60}초`;
}

function daysLeft(iso: string) {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));
}

export function GenerationCard({ gen, onDeleted }: { gen: ClientGeneration; onDeleted?: (id: string) => void }) {
  const [showLyrics, setShowLyrics] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, tick] = useState(0);

  useEffect(() => {
    if (gen.status !== "running") return;
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [gen.status]);

  const lyrics = (gen.lyrics || gen.lyrics_out || "").trim();
  const left = daysLeft(gen.expiresAt);

  async function remove() {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/generations/${gen.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "삭제하지 못했습니다.");
      onDeleted?.(gen.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "삭제하지 못했습니다.");
      setDeleting(false);
      setConfirming(false);
    }
  }

  return (
    <article data-generation={gen.id} className="flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-white" title={gen.title || gen.prompt}>{gen.title || gen.prompt.slice(0, 40)}</p>
          <p className="mt-0.5 text-xs text-violet-300">{gen.modelName}</p>
        </div>
        {gen.status === "running" && (
          <span className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[11px] font-bold text-violet-200">
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> 만드는 중 {elapsed(gen.created_at)}
          </span>
        )}
        {gen.status === "completed" && (
          <span className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-300">
            <CheckCircle2 className="h-3 w-3" aria-hidden="true" /> 완성
          </span>
        )}
        {gen.status === "failed" && (
          <span className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[11px] font-bold text-red-300">
            <AlertCircle className="h-3 w-3" aria-hidden="true" /> 실패
          </span>
        )}
      </header>

      <p className="line-clamp-2 text-xs leading-relaxed text-zinc-400">{gen.prompt}</p>

      {gen.status === "running" && (
        <p className="rounded-xl bg-zinc-950/60 p-3 text-xs leading-relaxed text-zinc-400">
          보통 30초~3분 걸립니다. 이 화면을 닫아도 계속 만들어지며, 완성되면 내 보관함에 저장됩니다.
        </p>
      )}
      {gen.status === "failed" && gen.error_message && (
        <p role="alert" className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-xs leading-relaxed text-red-300">{gen.error_message}</p>
      )}

      {gen.outputs.map((o, i) => (
        <div key={o.path} className="space-y-1.5">
          {gen.outputs.length > 1 && <p className="text-[11px] font-medium text-zinc-500">{o.title ? `${o.title} · ` : ""}{i + 1}번 곡</p>}
          {o.url ? <audio controls preload="none" src={o.url} className="w-full" /> : <p className="text-xs text-zinc-500">재생 주소를 만들지 못했습니다.</p>}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {o.downloadUrl && (
              <a href={o.downloadUrl} className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium text-violet-300 hover:underline">
                <Download className="h-3.5 w-3.5" aria-hidden="true" /> 내려받기 ({(o.bytes / 1_048_576).toFixed(1)}MB)
              </a>
            )}
            {/* 다른 프로그램으로 보내기 — 그쪽이 회원 본인 행만 읽어 음악·제목·가사(Lyria 시간 가사 포함)를 넣는다 */}
            <a href={`${LYRIC_VIDEO_URL}?ams=${gen.id}&i=${i}`} target="_blank" rel="noreferrer" className="whitespace-nowrap text-xs font-medium text-zinc-400 hover:text-violet-200">
              🎬 가사 영상 →
            </a>
          </div>
        </div>
      ))}

      {gen.outputs.length > 0 && (
        <a href={`${PLAYLIST_URL}?ams=${gen.outputs.map((_, n) => `${gen.id}:${n}`).join(",")}`} target="_blank" rel="noreferrer"
          className="w-fit whitespace-nowrap rounded-full border border-zinc-700 px-3 py-1 text-[11px] font-medium text-zinc-300 hover:border-violet-500/40 hover:text-violet-200">
          🎞️ 플레이리스트 영상으로 보내기 →
        </a>
      )}

      {lyrics && (
        <div>
          <button type="button" onClick={() => setShowLyrics((v) => !v)} className="inline-flex items-center gap-1 text-xs font-medium text-zinc-400 hover:text-zinc-200">
            <FileText className="h-3.5 w-3.5" aria-hidden="true" /> {showLyrics ? "가사 접기" : "가사 보기"}
          </button>
          {showLyrics && <pre className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap rounded-xl bg-zinc-950/60 p-3 font-sans text-xs leading-relaxed text-zinc-300">{lyrics}</pre>}
        </div>
      )}

      <footer className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800/80 pt-3 text-[11px] text-zinc-500">
        <span className="whitespace-nowrap">
          {gen.instrumental ? "연주곡" : "보컬곡"}
          {gen.est_cost_usd != null ? ` · 예상 약 $${Number(gen.est_cost_usd).toFixed(2)}` : ""}
          {gen.status !== "running" ? ` · 자동 삭제 D-${left}` : ""}
        </span>
        {gen.status !== "running" &&
          (confirming ? (
            <span className="flex items-center gap-2">
              <button type="button" disabled={deleting} onClick={remove} className="whitespace-nowrap rounded-lg bg-red-500/15 px-2 py-1 font-bold text-red-300 hover:bg-red-500/25">
                {deleting ? "삭제 중…" : "정말 삭제"}
              </button>
              <button type="button" disabled={deleting} onClick={() => setConfirming(false)} className="whitespace-nowrap text-zinc-400 hover:text-zinc-200">취소</button>
            </span>
          ) : (
            <button type="button" onClick={() => setConfirming(true)} className="inline-flex items-center gap-1 whitespace-nowrap text-zinc-500 hover:text-red-300">
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> 삭제
            </button>
          ))}
      </footer>
      {error && <p role="alert" className="text-xs text-red-300">{error}</p>}
    </article>
  );
}
