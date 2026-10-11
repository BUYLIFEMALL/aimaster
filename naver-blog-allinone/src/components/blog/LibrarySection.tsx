"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Archive, FileText, ImageIcon, Loader2, Sparkles, Trash2 } from "lucide-react";
import { deletePost, listPosts } from "@/lib/blog/postsApi";
import type { SavedPostSummary } from "@/lib/blog/types";

interface Props {
  onOpen: (id: string) => Promise<string | null>;
  onGoCreate: () => void;
}

const REVIEW_STYLE: Record<string, string> = {
  PASS: "bg-emerald-100 text-emerald-800",
  WARN: "bg-amber-100 text-amber-800",
  FAIL: "bg-red-100 text-red-800",
  UNKNOWN: "bg-slate-100 text-slate-600",
};
const REVIEW_LABEL: Record<string, string> = { PASS: "검수 통과", WARN: "확인 필요", FAIL: "수정 필요", UNKNOWN: "검수 전" };

export function LibrarySection({ onOpen, onGoCreate }: Props) {
  const [items, setItems] = useState<SavedPostSummary[] | null>(null);
  const [error, setError] = useState("");
  const [opening, setOpening] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setItems(await listPosts());
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
    setError("");
    const err = await onOpen(id);
    setOpening(null);
    if (err) setError(err);
  };

  const remove = async (id: string) => {
    setError("");
    try {
      await deletePost(id);
      setConfirmId(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "삭제하지 못했습니다.");
    }
  };

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600"><Archive className="w-5 h-5" /></span>
          <div>
            <h2 className="text-base font-black text-slate-900">내 보관함</h2>
            <p className="text-xs text-slate-500">생성한 글과 이미지는 자동으로 저장됩니다. 카드를 눌러 다시 열고 편집·복사·확장 전달을 이어가세요. (최대 100개)</p>
          </div>
        </div>
        <button type="button" onClick={onGoCreate} className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700">
          <Sparkles className="w-4 h-4" /> 새 글 만들기
        </button>
      </div>

      {error && <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">{error}</div>}

      {items === null ? (
        <p className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="w-4 h-4 animate-spin" /> 불러오는 중…</p>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center space-y-2">
          <FileText className="w-8 h-8 mx-auto text-slate-300" />
          <p className="text-sm font-bold text-slate-800">저장된 글이 없습니다.</p>
          <p className="text-xs text-slate-500">주제를 정해 [블로그 포스트 생성하기]를 누르면 이곳에 자동으로 보관됩니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((p) => (
            <div key={p.id} className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
              <button type="button" onClick={() => void open(p.id)} className="text-left">
                <div className="aspect-video bg-slate-100 flex items-center justify-center overflow-hidden">
                  {p.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.thumbnailUrl} alt={p.title} className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-slate-300" />
                  )}
                </div>
                <div className="p-4 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${REVIEW_STYLE[p.reviewStatus]}`}>{REVIEW_LABEL[p.reviewStatus]}</span>
                    <span className="text-[11px] text-slate-400">{new Date(p.updatedAt).toLocaleDateString("ko-KR")}</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2">{p.title}</h3>
                  {p.summary && <p className="text-[11px] text-slate-500 line-clamp-2">{p.summary}</p>}
                  <p className="text-[11px] text-slate-400">본문 {p.charCount.toLocaleString()}자 · 이미지 {p.imageCount}장</p>
                </div>
              </button>
              <div className="mt-auto flex items-center justify-between gap-2 px-4 pb-4">
                <button type="button" disabled={opening === p.id} onClick={() => void open(p.id)} className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-60">
                  {opening === p.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />} 열기
                </button>
                {confirmId === p.id ? (
                  <span className="flex items-center gap-2">
                    <button type="button" onClick={() => void remove(p.id)} className="px-3 py-2 text-xs font-bold rounded-lg bg-red-600 text-white hover:bg-red-700">삭제 확인</button>
                    <button type="button" onClick={() => setConfirmId(null)} className="text-xs text-slate-500 underline">취소</button>
                  </span>
                ) : (
                  <button type="button" onClick={() => setConfirmId(p.id)} className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50" aria-label="글 삭제" title="글과 이미지를 함께 삭제">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
