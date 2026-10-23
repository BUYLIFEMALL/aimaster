"use client";

import { useState } from "react";
import { Check, ChevronDown, ChevronUp, Pencil, Plus, Trash2, X } from "lucide-react";
import { createViralCategory, deleteViralCategory, renameViralCategory, reorderViralCategories } from "./web-actions";

export type ViralCategory = { id: string; name: string };

const inputClass = "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400";

/** 글감 카테고리 관리 창 — 등록·이름 수정·삭제·▲▼ 순서 변경. naver-blog-agent 글감 수집소의 같은 기능을 이식. */
export default function ViralCategoryManager({ categories, counts, onClose }: { categories: ViralCategory[]; counts: Record<string, number>; onClose: () => void }) {
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (action: () => Promise<{ ok: true } | { ok: false; error: string }>, after?: () => void) => {
    setBusy(true);
    setError(null);
    try {
      const result = await action();
      if (result.ok) after?.(); else setError(result.error);
    } catch {
      setError("요청을 처리하지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= categories.length) return;
    const ids = categories.map((item) => item.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    void run(() => reorderViralCategories(ids));
  };

  return <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-neutral-900/60 p-4" role="dialog" aria-modal="true" aria-label="글감 카테고리 관리">
    <div className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b border-neutral-100 bg-neutral-50 px-5 py-4">
        <div>
          <h3 className="text-base font-extrabold text-neutral-900">🗂 글감 카테고리 관리</h3>
          <p className="text-xs text-neutral-500">카테고리 추가·이름 수정·삭제·순서 변경 (직접 추가 최대 30개)</p>
        </div>
        <button type="button" onClick={onClose} aria-label="닫기" className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 hover:bg-neutral-200"><X size={16} /></button>
      </div>
      <div className="flex-1 space-y-5 overflow-y-auto p-5">
        {error && <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700" role="alert">{error}</p>}
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-neutral-900">📁 미분류</span>
            <span className="text-xs text-neutral-500">{counts.none ?? 0}건</span>
            <span className="ml-auto rounded-full bg-neutral-200 px-2 py-0.5 text-[10px] font-semibold text-neutral-600">기본 카테고리</span>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-neutral-500">카테고리를 선택하지 않은 콘텐츠는 자동으로 이곳에 들어갑니다. 미분류는 이름을 바꾸거나 삭제할 수 없습니다.</p>
        </div>
        <form className="space-y-2" onSubmit={(event) => { event.preventDefault(); if (name.trim()) void run(() => createViralCategory(name), () => setName("")); }}>
          <label className="text-xs font-bold text-neutral-700" htmlFor="viral-cat-new">➕ 새 카테고리 추가</label>
          <div className="flex gap-2">
            <input id="viral-cat-new" className={inputClass} maxLength={20} value={name} onChange={(event) => setName(event.target.value)} placeholder="예: 재테크, 육아, 맛집, 다이어트" />
            <button type="submit" disabled={busy || !name.trim()} className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-bold text-[#ffffff] hover:bg-neutral-700 disabled:cursor-not-allowed disabled:bg-neutral-300"><Plus size={14} />추가</button>
          </div>
        </form>
        <div className="space-y-2">
          <p className="text-xs font-bold text-neutral-700">📋 직접 추가한 카테고리 ({categories.length}개) <span className="font-normal text-neutral-400">▲▼로 순서 변경</span></p>
          {!categories.length
            ? <p className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-5 text-center text-xs text-neutral-500">직접 추가한 카테고리가 없습니다. 위에서 추가해 보세요. 모든 콘텐츠는 기본 &quot;미분류&quot; 카테고리에서 확인할 수 있습니다.</p>
            : <ul className="divide-y divide-neutral-100 overflow-hidden rounded-xl border border-neutral-200">{categories.map((item, index) => <li key={item.id} className="flex items-center justify-between gap-3 p-3">
              {editingId === item.id
                ? <form className="flex flex-1 items-center gap-2" onSubmit={(event) => { event.preventDefault(); if (editingName.trim()) void run(() => renameViralCategory({ id: item.id, name: editingName }), () => setEditingId(null)); }}>
                  <input className={inputClass} maxLength={20} autoFocus value={editingName} onChange={(event) => setEditingName(event.target.value)} aria-label="카테고리 이름" />
                  <button type="submit" disabled={busy || !editingName.trim()} className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-bold text-[#ffffff] hover:bg-neutral-700 disabled:bg-neutral-300"><Check size={12} />저장</button>
                  <button type="button" onClick={() => setEditingId(null)} className="shrink-0 rounded-lg bg-neutral-100 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-200">취소</button>
                </form>
                : <>
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="flex flex-col"><button type="button" aria-label="위로" disabled={busy || index === 0} onClick={() => move(index, -1)} className="text-neutral-400 hover:text-neutral-900 disabled:opacity-20"><ChevronUp size={14} /></button><button type="button" aria-label="아래로" disabled={busy || index === categories.length - 1} onClick={() => move(index, 1)} className="text-neutral-400 hover:text-neutral-900 disabled:opacity-20"><ChevronDown size={14} /></button></span>
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-neutral-100 text-[10px] font-bold text-neutral-600">{index + 1}</span>
                    <span className="truncate text-sm font-bold text-neutral-900">{item.name}</span>
                    <span className="shrink-0 text-xs text-neutral-400">{counts[item.id] ?? 0}건</span>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <button type="button" disabled={busy} onClick={() => { setEditingId(item.id); setEditingName(item.name); setError(null); }} className="inline-flex items-center gap-1 rounded-lg bg-neutral-100 px-2.5 py-1 text-xs font-bold text-neutral-700 hover:bg-neutral-200"><Pencil size={11} />수정</button>
                    <button type="button" disabled={busy} onClick={() => { if (window.confirm(`"${item.name}" 카테고리를 삭제할까요?\n이 카테고리의 글감 ${counts[item.id] ?? 0}건은 삭제되지 않고 "미분류"로 바뀝니다.`)) void run(() => deleteViralCategory(item.id)); }} className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-600 hover:bg-rose-100"><Trash2 size={11} />삭제</button>
                  </div>
                </>}
            </li>)}</ul>}
        </div>
      </div>
      <div className="flex justify-end border-t border-neutral-100 bg-neutral-50 px-5 py-3"><button type="button" onClick={onClose} className="rounded-lg bg-neutral-900 px-5 py-2 text-sm font-bold text-[#ffffff] hover:bg-neutral-700">완료 및 닫기</button></div>
    </div>
  </div>;
}
