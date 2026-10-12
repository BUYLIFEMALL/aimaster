"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Clapperboard, Loader2, Trash2 } from "lucide-react";

interface Item {
  id: string;
  title: string;
  topic: string;
  status: "created" | "analyzed" | "rendered" | "prompts";
  createdAt: string;
  thumb: string | null;
}
const STATUS: Record<Item["status"], string> = { created: "이미지만 저장됨", analyzed: "분석 완료", rendered: "9컷 시트 완성", prompts: "영상 프롬프트 완성" };

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

  if (error) return <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>;
  if (items === null) return <Loader2 className="animate-spin text-neutral-400" />;

  return (
    <div>
      <p className="mb-4 text-xs text-neutral-500">
        {items.length} / {limit}개
      </p>
      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-10 text-center">
          <Clapperboard className="mx-auto mb-2 text-neutral-400" />
          <p className="mb-3 text-sm text-neutral-500">아직 만든 스토리보드가 없습니다.</p>
          <Link href="/studio" className="inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700">새 스토리보드 만들기</Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => (
            <div key={p.id} className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
              <Link href={`/studio?p=${p.id}`} className="block">
                <div className="aspect-[3/2] bg-neutral-100">
                  {p.thumb && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.thumb} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="p-3">
                  <p className="line-clamp-2 text-sm font-bold text-neutral-900">{p.title}</p>
                  <p className="mt-1 text-[11px] text-neutral-400">
                    {STATUS[p.status]} · {new Date(p.createdAt).toLocaleDateString("ko-KR")}
                  </p>
                </div>
              </Link>
              <div className="flex justify-end border-t border-neutral-100 px-3 py-2">
                <button type="button" onClick={() => remove(p.id)} disabled={busyId === p.id} aria-label="삭제" className="rounded-md p-1 text-neutral-400 hover:bg-rose-50 hover:text-rose-500 disabled:opacity-50">
                  {busyId === p.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
