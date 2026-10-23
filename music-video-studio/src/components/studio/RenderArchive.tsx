"use client";

// v1.22 보관한 완성본 — 최종 뮤직비디오 칸 아래 목록(재생·MP4 내려받기·지우기·남은 보관일). 30일 뒤 자동 삭제.
import { useEffect, useState } from "react";
import { Archive, Download, Loader2, Trash2 } from "lucide-react";
import { RETENTION_DAYS, MAX_RENDERS } from "@/lib/music/renderArchive";
import { BTN_GHOST } from "@/components/studio/ui";

export interface ArchivedRender { id: string; title: string; songTitle: string | null; mb: number; seconds: number | null; width: number | null; height: number | null; createdAt: string; daysLeft: number; url: string | null; downloadUrl: string | null }

export function RenderArchive({ reloadKey }: { reloadKey: number }) {
  const [items, setItems] = useState<ArchivedRender[] | null>(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [open, setOpen] = useState("");

  const load = async () => {
    try {
      const res = await fetch("/api/music/renders", { cache: "no-store" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "보관한 완성본을 불러오지 못했습니다.");
      setItems(d.renders); setError("");
    } catch (e) { setError((e as Error).message); setItems((cur) => cur ?? []); }
  };
  useEffect(() => { void load(); }, [reloadKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const remove = async (r: ArchivedRender) => {
    if (busyId) return;
    setBusyId(r.id); setError("");
    try {
      const res = await fetch(`/api/music/renders/${r.id}`, { method: "DELETE" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "지우지 못했습니다.");
      setItems((cur) => (cur ?? []).filter((x) => x.id !== r.id));
    } catch (e) { setError((e as Error).message); } finally { setBusyId(""); }
  };

  return (
    <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
      <p className="flex items-center gap-2 text-sm font-bold text-slate-100"><Archive className="h-4 w-4 text-cyan-300" aria-hidden="true" /> 보관한 완성본 {items ? <span className="text-xs font-normal text-slate-400">{items.length}/{MAX_RENDERS}개</span> : null}</p>
      <p className="text-[11px] text-slate-500">「보관함에 저장」한 완성본은 다른 PC에서도 다시 보고 내려받을 수 있습니다. 저장한 날부터 {RETENTION_DAYS}일 뒤 자동으로 지워집니다.</p>
      {error && <p role="alert" className="text-xs text-rose-300">{error}</p>}
      {!items ? (
        <p className="flex items-center gap-2 text-xs text-slate-400"><Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> 불러오는 중…</p>
      ) : items.length === 0 ? (
        <p className="text-xs text-slate-500">아직 보관한 완성본이 없습니다.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((r) => (
            <li key={r.id} className="rounded-lg border border-slate-800 bg-[#080c14] p-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-slate-100">{r.title}{r.songTitle ? <span className="font-normal text-slate-400"> · {r.songTitle}</span> : null}</p>
                  <p className="text-[11px] text-slate-500">{new Date(r.createdAt).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })} · {r.seconds ? `${Math.round(r.seconds)}초 · ` : ""}{r.mb}MB · <span className={r.daysLeft <= 3 ? "text-amber-300" : ""}>{r.daysLeft}일 뒤 삭제</span></p>
                </div>
                <button type="button" className={BTN_GHOST} disabled={!r.url} onClick={() => setOpen((v) => (v === r.id ? "" : r.id))}>{open === r.id ? "닫기" : "재생"}</button>
                {r.downloadUrl && <a href={r.downloadUrl} className={BTN_GHOST}><Download className="h-3.5 w-3.5" aria-hidden="true" /> <span>MP4</span></a>}
                <button type="button" aria-label="보관한 완성본 지우기" className={BTN_GHOST} disabled={busyId === r.id} onClick={() => void remove(r)}>
                  {busyId === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Trash2 className="h-3.5 w-3.5 text-rose-300" aria-hidden="true" />}
                </button>
              </div>
              {open === r.id && r.url && <video src={r.url} controls playsInline className={`mx-auto mt-2 w-full rounded-lg bg-black ${r.height && r.width && r.height > r.width ? "max-w-[280px]" : "max-w-[640px]"}`} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
