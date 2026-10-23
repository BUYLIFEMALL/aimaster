"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Clapperboard, Loader2, Trash2, ArrowRight } from "lucide-react";

interface Item {
  id: string;
  title: string;
  topic: string;
  status: "created" | "analyzed" | "rendered" | "prompts";
  createdAt: string;
  thumb: string | null;
}
const STATUS: Record<Item["status"], { label: string; color: string }> = {
  created: { label: "이미지만 저장됨", color: "text-slate-400" },
  analyzed: { label: "분석 완료", color: "text-sky-400" },
  rendered: { label: "9컷 시트 완성", color: "text-amber-400" },
  prompts: { label: "영상 프롬프트 완성", color: "text-emerald-400" },
};

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
    if (!confirm("이 프로젝트와 저장된 이미지를 삭제합니다. 계속할까요?")) return;
    setBusyId(id);
    const r = await fetch(`/api/projects/${id}`, { method: "DELETE" });
    setBusyId(null);
    if (r.ok) setItems((prev) => (prev ? prev.filter((x) => x.id !== id) : prev));
    else setError("삭제하지 못했습니다.");
  }

  if (error)
    return (
      <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-300">
        {error}
      </div>
    );
  if (items === null) return <Loader2 className="animate-spin text-amber-400" />;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs text-slate-400">
          보관 용량: <span className="font-bold text-slate-200">{items.length}</span> / {limit}개
        </p>
        <Link
          href="/studio"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 transition"
        >
          <span>새 프로젝트 만들기</span>
          <ArrowRight size={13} />
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-700 bg-[#131926] p-12 text-center shadow-xl">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0e131f] text-amber-400">
            <Clapperboard size={24} />
          </div>
          <h3 className="mb-1 text-base font-bold text-slate-200">아직 생성된 스토리보드가 없습니다</h3>
          <p className="mb-6 text-xs text-slate-400">
            레퍼런스 이미지 1장을 업로드하여 9컷 마스터 시트와 영상 프롬프트를 만들어보세요.
          </p>
          <Link
            href="/studio"
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.25)] transition hover:from-amber-400 hover:to-amber-500"
          >
            <Clapperboard size={15} />
            <span>새 스토리보드 만들기</span>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => {
            const statusInfo = STATUS[p.status] || { label: p.status, color: "text-slate-400" };
            return (
              <div
                key={p.id}
                className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-800 bg-[#131926] transition hover:border-slate-700 hover:shadow-2xl"
              >
                <Link href={`/studio?p=${p.id}`} className="block">
                  <div className="relative aspect-[3/2] overflow-hidden bg-[#0e131f]">
                    {p.thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.thumb}
                        alt=""
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-slate-600">
                        <Clapperboard size={32} />
                      </div>
                    )}
                    <span className="absolute bottom-2 left-2 rounded-lg bg-black/70 px-2 py-0.5 text-[10px] font-bold backdrop-blur text-white">
                      3:2 마스터
                    </span>
                  </div>
                  <div className="p-4">
                    <p className="line-clamp-2 text-sm font-bold text-slate-100 group-hover:text-amber-400 transition">
                      {p.title || "제목 없는 프로젝트"}
                    </p>
                    <div className="mt-2 flex items-center justify-between text-[11px]">
                      <span className={`font-semibold ${statusInfo.color}`}>{statusInfo.label}</span>
                      <span className="text-slate-500">
                        {new Date(p.createdAt).toLocaleDateString("ko-KR")}
                      </span>
                    </div>
                  </div>
                </Link>
                <div className="flex items-center justify-between border-t border-slate-800 bg-[#0e131f]/60 px-4 py-2.5">
                  <Link
                    href={`/studio?p=${p.id}`}
                    className="text-xs font-bold text-slate-400 hover:text-amber-400 transition flex items-center gap-1"
                  >
                    <span>열기</span>
                    <ArrowRight size={12} />
                  </Link>
                  <button
                    type="button"
                    onClick={() => remove(p.id)}
                    disabled={busyId === p.id}
                    aria-label="삭제"
                    className="rounded-lg p-1.5 text-slate-500 transition hover:bg-rose-500/10 hover:text-rose-400 disabled:opacity-50"
                  >
                    {busyId === p.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
