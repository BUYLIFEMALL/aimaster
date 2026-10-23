"use client";

// v1.05 작업 결과 갤러리 「편집본」 — 영상 합치기에서 저장한 편집(완성 영상이 있으면 재생·내려받기). 저장된 편집이 없으면 숨긴다.
import { useEffect, useState } from "react";
import Link from "next/link";
import { Download, Layers, Trash2 } from "lucide-react";

type EditItem = { id: string; title: string; clips: number; aspect: string; outputBytes: number | null; durationS: number | null; url: string | null; downloadUrl: string | null; updatedAt: string; expiresAt: string };

export function EditsSection() {
  const [items, setItems] = useState<EditItem[] | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/edit/projects", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setItems(j.edits ?? []))
      .catch(() => setItems([]));
  }, []);

  async function remove(id: string) {
    setError("");
    const res = await fetch(`/api/edit/projects/${id}`, { method: "DELETE" });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { setError(j.error ?? "지우지 못했습니다."); return; }
    setItems((cur) => (cur ?? []).filter((x) => x.id !== id));
    setConfirm(null);
  }

  if (!items || items.length === 0) return null;
  const days = (iso: string) => Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));

  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-sm font-bold text-zinc-200"><Layers className="h-4 w-4 text-sky-300" aria-hidden="true" /> 편집본 ({items.length})</h2>
      {error && <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((e) => (
          <article key={e.id} className="flex flex-col gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3">
            <p className="truncate text-sm font-bold text-zinc-100" title={e.title}>{e.title}</p>
            {e.url ? (
              <video src={e.url} controls playsInline preload="metadata" className={`w-full rounded-lg bg-black ${e.aspect === "9:16" ? "mx-auto max-w-[220px]" : ""}`} />
            ) : (
              <p className="rounded-lg border border-dashed border-zinc-800 p-4 text-center text-xs text-zinc-500">완성 영상은 아직 저장하지 않았습니다(편집 내용만 저장).</p>
            )}
            <p className="text-[11px] text-zinc-500">영상 {e.clips}개{e.durationS ? ` · ${e.durationS}초` : ""}{e.outputBytes ? ` · ${(e.outputBytes / 1_048_576).toFixed(1)}MB` : ""} · 자동 삭제 D-{days(e.expiresAt)}</p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <Link href={`/edit?edit=${e.id}`} className="inline-flex items-center gap-1 text-xs font-medium text-sky-300 hover:underline"><Layers className="h-3.5 w-3.5" aria-hidden="true" /> 편집 열기</Link>
              {e.downloadUrl && <a href={e.downloadUrl} className="inline-flex items-center gap-1 text-xs font-medium text-sky-300 hover:underline"><Download className="h-3.5 w-3.5" aria-hidden="true" /> 내려받기</a>}
              {confirm === e.id ? (
                <span className="flex items-center gap-2 text-xs">
                  <button type="button" onClick={() => void remove(e.id)} className="font-bold text-rose-300">정말 지우기</button>
                  <button type="button" onClick={() => setConfirm(null)} className="text-zinc-400">취소</button>
                </span>
              ) : (
                <button type="button" onClick={() => setConfirm(e.id)} className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-rose-300"><Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> 삭제</button>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
