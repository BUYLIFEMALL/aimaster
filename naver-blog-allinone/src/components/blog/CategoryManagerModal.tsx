"use client";

import React, { useState } from "react";
import { Check, ChevronDown, ChevronUp, Edit2, Loader2, Plus, Trash2, X } from "lucide-react";
import { makeSlug, MAX_CATEGORIES, newCategoryId, type BlogCategory } from "@/lib/blog/categories";

interface Props {
  categories: BlogCategory[];
  /** 글 개수(보관함에서 열었을 때만 전달) */
  counts?: Record<string, number>;
  onSave: (next: BlogCategory[]) => Promise<string | null>;
  onClose: () => void;
}

export function CategoryManagerModal({ categories, counts, onSave, onClose }: Props) {
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const commit = async (next: BlogCategory[]): Promise<boolean> => {
    setBusy(true);
    const err = await onSave(next.map((c, i) => ({ ...c, sort_order: i + 1 })));
    setBusy(false);
    setError(err ?? "");
    return !err;
  };
  const dup = (name: string, exceptId?: string) => categories.some((c) => c.id !== exceptId && c.name.toLowerCase() === name.toLowerCase());

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    if (dup(name)) return setError("이미 같은 이름의 카테고리가 있습니다.");
    if (categories.length >= MAX_CATEGORIES) return setError(`카테고리는 ${MAX_CATEGORIES}개까지 만들 수 있습니다.`);
    if (await commit([...categories, { id: newCategoryId(), name, slug: makeSlug(name), sort_order: categories.length + 1 }])) setNewName("");
  };
  const saveEdit = async (id: string) => {
    const name = editingName.trim();
    if (!name) return;
    if (dup(name, id)) return setError("이미 같은 이름의 다른 카테고리가 있습니다.");
    if (await commit(categories.map((c) => (c.id === id ? { ...c, name, slug: makeSlug(name) } : c)))) setEditingId(null);
  };
  const remove = async (id: string) => {
    if (categories.length <= 1) return setError("카테고리는 최소 1개는 남겨야 합니다.");
    if (await commit(categories.filter((c) => c.id !== id))) setConfirmId(null);
  };
  const move = async (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= categories.length) return;
    const next = [...categories];
    [next[i], next[j]] = [next[j], next[i]];
    await commit(next);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="aio-cat-title">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[85vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-sm">🗂</span>
            <div>
              <h3 id="aio-cat-title" className="text-base font-extrabold text-slate-900">카테고리 관리</h3>
              <p className="text-[11px] text-slate-500">글 만들기·맛집/카페/여행·보관함이 같은 목록을 함께 씁니다</p>
            </div>
          </div>
          <button type="button" aria-label="닫기" onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"><X size={16} /></button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {error && <div className="p-3 text-xs bg-rose-50 text-rose-700 border border-rose-200 rounded-xl font-medium">{error}</div>}

          <form onSubmit={add} className="space-y-2">
            <label className="text-xs font-bold text-slate-700">➕ 새 카테고리 추가</label>
            <div className="flex gap-2">
              <input value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={40} placeholder="예: 뷰티/패션, 육아, 반려동물…" className="flex-1 text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900 focus:bg-white" />
              <button type="submit" disabled={!newName.trim() || busy} className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-bold text-xs rounded-xl">
                {busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} 추가
              </button>
            </div>
          </form>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">📋 등록된 카테고리 ({categories.length}개)</label>
              <span className="text-[11px] text-slate-400">▲▼ 버튼으로 순서 변경</span>
            </div>
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
              {categories.map((cat, i) => (
                <div key={cat.id} className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50/60">
                  {editingId === cat.id ? (
                    <div className="flex-1 flex items-center gap-2">
                      <input autoFocus value={editingName} onChange={(e) => setEditingName(e.target.value)} maxLength={40} className="flex-1 text-xs px-3 py-1.5 bg-white border border-slate-900 rounded-lg focus:outline-none" />
                      <button type="button" disabled={busy} onClick={() => void saveEdit(cat.id)} className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-900 text-white font-bold text-xs rounded-lg"><Check size={12} /> 저장</button>
                      <button type="button" onClick={() => setEditingId(null)} className="px-3 py-1.5 bg-slate-100 text-slate-600 font-semibold text-xs rounded-lg">취소</button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex flex-col items-center gap-0.5">
                          <button type="button" disabled={i === 0 || busy} onClick={() => void move(i, -1)} className="text-slate-400 hover:text-slate-900 disabled:opacity-20" title="위로"><ChevronUp size={14} /></button>
                          <button type="button" disabled={i === categories.length - 1 || busy} onClick={() => void move(i, 1)} className="text-slate-400 hover:text-slate-900 disabled:opacity-20" title="아래로"><ChevronDown size={14} /></button>
                        </div>
                        <span className="flex h-5 w-5 items-center justify-center rounded bg-slate-100 text-[10px] font-bold text-slate-600">{i + 1}</span>
                        <span className="text-xs font-bold text-slate-900 truncate">{cat.name}</span>
                        {counts && <span className="text-[10px] text-slate-400">글 {counts[cat.id] ?? 0}개</span>}
                      </div>
                      {confirmId === cat.id ? (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-[11px] text-rose-700">글은 미분류로 남습니다</span>
                          <button type="button" disabled={busy} onClick={() => void remove(cat.id)} className="px-2.5 py-1 text-[11px] font-bold text-white bg-rose-600 rounded-lg">삭제 확인</button>
                          <button type="button" onClick={() => setConfirmId(null)} className="text-[11px] text-slate-500 underline">취소</button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button type="button" onClick={() => { setEditingId(cat.id); setEditingName(cat.name); setError(""); }} className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"><Edit2 size={11} /> 수정</button>
                          <button type="button" onClick={() => { setConfirmId(cat.id); setError(""); }} className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg"><Trash2 size={11} /> 삭제</button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
            <p className="text-[11px] text-slate-400">카테고리를 지워도 글은 삭제되지 않고 &quot;미분류&quot;로 남습니다.</p>
          </div>
        </div>

        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/70 flex justify-end">
          <button type="button" onClick={onClose} className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl">완료 및 닫기</button>
        </div>
      </div>
    </div>
  );
}
