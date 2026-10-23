"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Dna, Loader2, Trash2 } from "lucide-react";
import type { AnalysisSummary } from "@/lib/dna/types";
import { useDna } from "@/components/dna/AnalysisProvider";
import { BTN_GHOST, BTN_PRIMARY, Card, ErrorNote } from "@/components/dna/ui";

export default function DashboardPage() {
  const router = useRouter();
  const { openRecord, record, setRecord } = useDna();
  const [items, setItems] = useState<AnalysisSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/analyses", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "보관함을 불러오지 못했습니다.");
      setItems(data.analyses as AnalysisSummary[]);
    } catch (e) {
      setItems([]);
      setError(e instanceof Error ? e.message : "보관함을 불러오지 못했습니다.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const open = async (id: string) => {
    setOpening(id);
    setError(null);
    const err = await openRecord(id);
    setOpening(null);
    if (err) setError(err);
    else router.push("/analyze");
  };

  const remove = async (id: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/analyses/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error || "삭제하지 못했습니다.");
      if (record?.id === id) setRecord(null);
      setConfirmId(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "삭제하지 못했습니다.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight">보관함</h1>
          <p className="mt-1 text-xs md:text-sm text-slate-400">
            분석한 이미지는 자동으로 저장됩니다. 카드를 눌러 다시 열고 보정·테스트를 이어가세요.
          </p>
        </div>
        <Link href="/analyze" className={BTN_PRIMARY}>
          <Dna className="h-4 w-4" /> <span>새 이미지 분석</span>
        </Link>
      </div>

      {error && <ErrorNote message={error} />}

      {items === null ? (
        <p className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin text-cyan-400" /> 불러오는 중…
        </p>
      ) : items.length === 0 ? (
        <Card className="space-y-3 text-sm text-slate-300">
          <p className="font-bold text-white text-base">아직 분석한 이미지가 없습니다.</p>
          <p className="text-slate-400 leading-relaxed">
            1단계에서 이미지를 올리면 카메라·조명·색상·스타일을 분석해 마스터 프롬프트를 만들어 드립니다. 먼저 [🔑 API키등록·플랫폼연동]에서 본인 Gemini(또는 OpenAI·Claude) 키를 등록해주세요.
          </p>
          <div className="pt-2">
            <Link href="/analyze" className={BTN_PRIMARY}>
              <span>첫 이미지 분석하기</span>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((a) => (
            <Card key={a.id} className="space-y-3 p-4 hover:border-cyan-500/40 transition-colors">
              <button type="button" onClick={() => void open(a.id)} className="block w-full text-left group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={a.imageUrl}
                  alt={a.title}
                  className="aspect-4/3 w-full rounded-xl border border-[#222d42] bg-[#0c0f17] object-cover transition-transform group-hover:scale-[1.01]"
                />
                <div className="mt-2.5 flex h-2 overflow-hidden rounded-full border border-[#222d42]/50">
                  {a.palette.map((c) => (
                    <span key={c.hex} style={{ background: c.hex, width: `${c.percent}%` }} />
                  ))}
                </div>
                <p className="mt-2.5 truncate text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                  {a.title}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  <span className="font-semibold text-cyan-400">{a.mode === "mutate" ? "스타일 변형" : "스타일 복제"}</span> ·{" "}
                  {new Date(a.createdAt).toLocaleDateString("ko-KR")}
                </p>
              </button>
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#222d42]">
                <button type="button" disabled={opening === a.id} onClick={() => void open(a.id)} className={BTN_GHOST}>
                  {opening === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" /> : null} <span>열기</span>
                </button>
                {confirmId === a.id ? (
                  <span className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void remove(a.id)}
                      className="rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-500 transition-colors"
                    >
                      삭제 확인
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmId(null)}
                      className="text-xs text-slate-400 hover:text-slate-200 underline"
                    >
                      취소
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    aria-label="분석 삭제"
                    onClick={() => setConfirmId(a.id)}
                    className="rounded-lg p-2 text-slate-400 hover:bg-rose-950/40 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
