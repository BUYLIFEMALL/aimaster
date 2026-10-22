"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, RefreshCw } from "lucide-react";
import type { ClientGeneration } from "@/lib/generationTypes";
import { GenerationCard } from "./GenerationCard";

type Filter = "all" | "completed" | "running" | "failed";

export function LibraryView() {
  const [items, setItems] = useState<ClientGeneration[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/generations", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "보관함을 불러오지 못했습니다.");
      const gens = data.generations as ClientGeneration[];
      setItems(gens);
      setError(null);
      if (timer.current) clearTimeout(timer.current);
      if (gens.some((g) => g.status === "running")) timer.current = setTimeout(load, 8000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "보관함을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [load]);

  const shown = (items ?? []).filter((g) => filter === "all" || g.status === filter);
  const counts = {
    all: items?.length ?? 0,
    completed: items?.filter((g) => g.status === "completed").length ?? 0,
    running: items?.filter((g) => g.status === "running").length ?? 0,
    failed: items?.filter((g) => g.status === "failed").length ?? 0,
  };
  const FILTERS: { key: Filter; label: string }[] = [
    { key: "all", label: `전체 ${counts.all}` },
    { key: "completed", label: `완성 ${counts.completed}` },
    { key: "running", label: `만드는 중 ${counts.running}` },
    { key: "failed", label: `실패 ${counts.failed}` },
  ];

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col gap-3 border-b border-zinc-800/80 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-black tracking-tight text-white">📁 내 보관함</h1>
          <p className="text-sm text-zinc-300">만든 곡을 듣고 내려받습니다. 곡은 만든 지 30일 뒤 자동 삭제되니 오래 둘 곡은 내려받아 주세요.</p>
        </div>
        <button type="button" onClick={load} disabled={loading}
          className="flex w-fit items-center gap-1.5 whitespace-nowrap rounded-full border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-900 disabled:opacity-60">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />} 새로고침
        </button>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="상태 거르기">
        {FILTERS.map((f) => (
          <button key={f.key} type="button" onClick={() => setFilter(f.key)} aria-pressed={filter === f.key}
            className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-bold ${filter === f.key ? "border-violet-500/50 bg-violet-500/15 text-violet-200" : "border-zinc-800 text-zinc-400 hover:text-zinc-200"}`}>
            {f.label}
          </button>
        ))}
      </div>

      {error && <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
      {items === null && !error && <p className="text-sm text-zinc-500">불러오는 중…</p>}
      {items !== null && shown.length === 0 && (
        <div className="rounded-2xl border border-dashed border-zinc-800 p-10 text-center text-sm text-zinc-400">
          아직 곡이 없습니다. <Link href="/create" className="font-bold text-violet-300 underline">음악 만들기</Link>에서 첫 곡을 만들어 보세요.
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {shown.map((g) => (
          <div key={g.id} className="flex flex-col gap-1">
            {g.compare_group && <span className="w-fit rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-400">⚖️ 비교 생성 · {g.compare_group.slice(0, 4)}</span>}
            <GenerationCard gen={g} onDeleted={(id) => setItems((prev) => (prev ?? []).filter((r) => r.id !== id))} />
          </div>
        ))}
      </div>
    </div>
  );
}
