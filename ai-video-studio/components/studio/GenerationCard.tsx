"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Download, Loader2, Trash2 } from "lucide-react";
import type { ClientGeneration } from "@/lib/generationTypes";

function elapsed(from: string) {
  const s = Math.max(0, Math.floor((Date.now() - new Date(from).getTime()) / 1000));
  return s < 60 ? `${s}초` : `${Math.floor(s / 60)}분 ${s % 60}초`;
}

function daysLeft(iso: string) {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));
}

export function GenerationCard({ gen, onDeleted }: { gen: ClientGeneration; onDeleted?: (id: string) => void }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, tick] = useState(0);

  useEffect(() => {
    if (gen.status !== "running") return;
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [gen.status]);

  const left = daysLeft(gen.expiresAt);
  const video = gen.outputs[0];

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
          <p className="truncate text-sm font-bold text-white" title={gen.prompt}>{gen.prompt.slice(0, 48)}</p>
          <p className="mt-0.5 text-xs text-sky-300">
            {gen.modelName} · {gen.duration_s}초{gen.aspect_ratio ? ` · ${gen.aspect_ratio}` : ""}
          </p>
        </div>
        {gen.status === "running" && (
          <span className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[11px] font-bold text-sky-200">
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

      {video?.url ? (
        <video controls preload="metadata" playsInline src={video.url} poster={gen.startImageUrl ?? undefined} className="aspect-video w-full rounded-xl bg-black object-contain" />
      ) : gen.startImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={gen.startImageUrl} alt="시작 장면" className={`aspect-video w-full rounded-xl bg-black object-contain ${gen.status === "running" ? "opacity-60" : ""}`} />
      ) : null}

      {gen.status === "running" && (
        <p className="rounded-xl bg-zinc-950/60 p-3 text-xs leading-relaxed text-zinc-400">
          보통 1~5분 걸립니다. 이 화면을 닫아도 계속 만들어지며, 완성되면 작업 결과 갤러리에 저장됩니다.
        </p>
      )}
      {gen.status === "failed" && gen.error_message && (
        <p role="alert" className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-xs leading-relaxed text-red-300">{gen.error_message}</p>
      )}

      {video?.downloadUrl && (
        <a href={video.downloadUrl} className="inline-flex w-fit items-center gap-1 whitespace-nowrap text-xs font-medium text-sky-300 hover:underline">
          <Download className="h-3.5 w-3.5" aria-hidden="true" /> 내려받기 MP4 ({(video.bytes / 1_048_576).toFixed(1)}MB)
        </a>
      )}

      <footer className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800/80 pt-3 text-[11px] text-zinc-500">
        <span className="whitespace-nowrap">
          {gen.est_cost_usd != null ? `예상 약 $${Number(gen.est_cost_usd).toFixed(2)}` : ""}
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
