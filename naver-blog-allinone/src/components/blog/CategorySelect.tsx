"use client";

import React, { useState } from "react";
import { Settings2 } from "lucide-react";
import { CategoryManagerModal } from "./CategoryManagerModal";
import { useCategories } from "./useCategories";

interface Props {
  value: string | null;
  onChange: (id: string | null) => void;
}

/** 글 만들기 폼의 카테고리 선택 + 관리 버튼(보관함과 같은 목록) */
export function CategorySelect({ value, onChange }: Props) {
  const { categories, saveCategories } = useCategories();
  const [open, setOpen] = useState(false);
  const known = categories.some((c) => c.id === value);

  return (
    <div>
      <label className="block text-xs font-bold text-slate-700 mb-1.5">카테고리 (보관함 분류)</label>
      <div className="flex items-center gap-2">
        <select value={known ? (value as string) : ""} onChange={(e) => onChange(e.target.value || null)} className="flex-1 text-xs px-3 py-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500">
          <option value="">미분류</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <button type="button" onClick={() => setOpen(true)} className="flex items-center gap-1 px-3 py-2.5 text-xs font-bold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 whitespace-nowrap">
          <Settings2 className="w-3.5 h-3.5" /> 카테고리 관리
        </button>
      </div>
      {open && <CategoryManagerModal categories={categories} onSave={saveCategories} onClose={() => setOpen(false)} />}
    </div>
  );
}
