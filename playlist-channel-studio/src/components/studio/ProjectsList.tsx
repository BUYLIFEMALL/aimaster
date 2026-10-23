"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ListMusic, Loader2, Trash2 } from "lucide-react";
import { genreLabel } from "@/lib/playlist/types";

interface Item {
  id: string;
  genre: string;
  title: string | null;
  status: "created" | "titled" | "content";
  createdAt: string;
  thumb: string | null;
}
const STATUS: Record<Item["status"], string> = { created: "장르만 선택됨", titled: "제목 선택 단계", content: "콘텐츠 생성 중/완료" };

export function ProjectsList() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [limit, setLimit] = useState(30);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((d) => {
        if (d.projects) {
          setItems(d.projects);
          setLimit(d.limit ?? 30);
        } else setError(d.error ?? "불러오지 못했습니다.");
      })
      .catch(() => setError("네트워크 오류가 발생했습니다."));
  }, []);

  async function remove(id: string) {
    if (!confirm("이 프로젝트와 저장된 썸네일을 삭제합니다. 계속할까요?")) return;
    setBusyId(id);
    const r = await fetch(`/api/projects/${id}`, { method: "DELETE" });
    setBusyId(null);
    if (r.ok) setItems((prev) => (prev ? prev.filter((x) => x.id !== id) : prev));
    else setError("삭제하지 못했습니다.");
  }

  if (error) return <p className="rounded-xl border border-rose-900/60 bg-rose-950/40 px-4 py-3 text-sm text-rose-300">{error}</p>;
  if (items === null) return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-cyan-400" /></div>;

  return (
    <div>
      <p className="mb-4 text-xs font-mono text-slate-400">{items.length} / {limit}개 프로젝트</p>
      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-800 bg-[#0d1322] p-12 text-center shadow-sm">
          <ListMusic className="mx-auto mb-3 text-cyan-400" size={32} />
          <p className="mb-4 text-sm text-slate-400">아직 만든 플레이리스트가 없습니다.</p>
          <Link href="/studio" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-sm font-bold text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.35)] hover:shadow-[0_0_22px_rgba(6,182,212,0.5)] transition-all">
            새 플레이리스트 만들기
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => (
            <div key={p.id} className="group overflow-hidden rounded-2xl border border-slate-800/80 bg-[#0d1322] transition-all hover:border-cyan-500/50 hover:shadow-[0_0_15px_rgba(6,182,212,0.15)] flex flex-col justify-between">
              <Link href={`/studio?p=${p.id}`} className="block">
                <div className="aspect-video bg-[#060911] border-b border-slate-800 flex items-center justify-center overflow-hidden">
                  {p.thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.thumb} alt="" className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <span className="text-xs font-mono text-slate-400">썸네일 없음</span>
                  )}
                </div>
                <div className="p-4">
                  <p className="line-clamp-2 text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">{p.title ?? `${genreLabel(p.genre)} (제목 미선택)`}</p>
                  <p className="mt-1 text-[11px] text-slate-400 font-mono">
                    {genreLabel(p.genre)} · {STATUS[p.status]} · {new Date(p.createdAt).toLocaleDateString("ko-KR")}
                  </p>
                </div>
              </Link>
              <div className="flex justify-end border-t border-slate-800/60 bg-[#0a0f1d] px-3 py-2">
                <button
                  type="button"
                  onClick={() => remove(p.id)}
                  disabled={busyId === p.id}
                  aria-label="삭제"
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-950/40 hover:text-rose-400 disabled:opacity-50 transition-colors"
                >
                  {busyId === p.id ? <Loader2 size={15} className="animate-spin text-rose-400" /> : <Trash2 size={15} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
