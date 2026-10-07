"use client";

import { useState } from "react";
import { X, Plus, Edit2, Trash2, ChevronUp, ChevronDown, Check } from "lucide-react";
import type { CollectorCategory } from "@/types/collector";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  categories: CollectorCategory[];
  onUpdateCategories: (updated: CollectorCategory[]) => void;
  onCategoryDeleted?: (deletedCategoryName: string) => void;
}

function generateSlug(name: string): string {
  const clean = name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s가-힣-]/g, "")
    .replace(/\s+/g, "-");
  return clean || `cat-${Date.now().toString(36)}`;
}

export function CategoryManagementModal({
  isOpen,
  onClose,
  categories,
  onUpdateCategories,
  onCategoryDeleted,
}: Props) {
  const [newCatName, setNewCatName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // 1. 카테고리 추가
  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCatName.trim();
    if (!trimmed) return;

    if (categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
      setErrorMsg("이미 동일한 이름의 카테고리가 존재합니다.");
      return;
    }

    const nextOrder =
      categories.length > 0 ? Math.max(...categories.map((c) => c.sort_order || 0)) + 1 : 1;

    const newCat: CollectorCategory = {
      id: `cat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      name: trimmed,
      slug: generateSlug(trimmed),
      sort_order: nextOrder,
    };

    const updated = [...categories, newCat];
    onUpdateCategories(updated);
    setNewCatName("");
    setErrorMsg(null);
  };

  // 2. 카테고리 수정 저장
  const handleSaveEdit = (id: string) => {
    const trimmed = editingName.trim();
    if (!trimmed) return;

    if (categories.some((c) => c.id !== id && c.name.toLowerCase() === trimmed.toLowerCase())) {
      setErrorMsg("이미 동일한 이름의 다른 카테고리가 존재합니다.");
      return;
    }

    const updated = categories.map((c) =>
      c.id === id ? { ...c, name: trimmed, slug: generateSlug(trimmed) } : c
    );
    onUpdateCategories(updated);
    setEditingId(null);
    setEditingName("");
    setErrorMsg(null);
  };

  // 3. 카테고리 삭제
  const handleDeleteCategory = (cat: CollectorCategory) => {
    if (categories.length <= 1) {
      setErrorMsg("최소 1개 이상의 카테고리는 유지되어야 합니다.");
      return;
    }

    if (!window.confirm(`"${cat.name}" 카테고리를 정말 삭제하시겠습니까?\n해당 카테고리로 수집된 기존 글감들은 '미분류'로 자동 전환됩니다.`)) {
      return;
    }

    const updated = categories.filter((c) => c.id !== cat.id);
    onUpdateCategories(updated);
    if (onCategoryDeleted) {
      onCategoryDeleted(cat.name);
    }
    setErrorMsg(null);
  };

  // 4. 카테고리 위/아래 순서 이동 (▲/▼)
  const handleMoveCategory = (index: number, direction: "up" | "down") => {
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= categories.length) return;

    const currentList = [...categories];
    const currentItem = currentList[index];
    const swapItem = currentList[swapIndex];

    // sort_order 스왑
    const currentOrder = currentItem.sort_order;
    currentItem.sort_order = swapItem.sort_order;
    swapItem.sort_order = currentOrder;

    currentList[index] = swapItem;
    currentList[swapIndex] = currentItem;

    onUpdateCategories(currentList);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white border border-neutral-200 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[85vh]">
        {/* 모달 헤더 */}
        <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/70">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 font-bold text-sm">
              🗂
            </span>
            <div>
              <h3 className="text-base font-extrabold text-neutral-900">글감 수집 카테고리 관리</h3>
              <p className="text-[11px] text-neutral-500 font-medium">카테고리 추가·수정·삭제 및 위/아래 순서 정렬</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-500 flex items-center justify-center font-bold text-sm transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* 본문 */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {errorMsg && (
            <div className="p-3 text-xs bg-rose-50 text-rose-600 border border-rose-200 rounded-xl font-medium">
              {errorMsg}
            </div>
          )}

          {/* 새 카테고리 추가 폼 */}
          <form onSubmit={handleAddCategory} className="space-y-2">
            <label className="text-xs font-bold text-neutral-700">➕ 새 카테고리 추가</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="예: IT/테크, 일상생활, 뷰티/패션, 맛집탐방..."
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="flex-1 text-xs px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-neutral-900 focus:bg-white text-neutral-800 font-medium transition-all"
              />
              <button
                type="submit"
                disabled={!newCatName.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
              >
                <Plus size={14} />
                추가
              </button>
            </div>
          </form>

          {/* 카테고리 리스트 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-neutral-700">
                📋 등록된 카테고리 목록 ({categories.length}개)
              </label>
              <span className="text-[11px] text-neutral-400">▲▼ 버튼으로 순서 변경</span>
            </div>

            {categories.length === 0 ? (
              <div className="text-center py-8 text-xs text-neutral-400 font-medium bg-neutral-50 rounded-2xl border border-dashed border-neutral-200">
                등록된 카테고리가 없습니다. 위 폼에서 카테고리를 추가해 보세요.
              </div>
            ) : (
              <div className="divide-y divide-neutral-100 border border-neutral-200 rounded-2xl overflow-hidden bg-neutral-50/30">
                {categories.map((cat, index) => (
                  <div
                    key={cat.id}
                    className="p-3 flex items-center justify-between gap-3 hover:bg-white transition-colors"
                  >
                    {editingId === cat.id ? (
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="flex-1 text-xs px-3 py-1.5 bg-white border border-neutral-900 rounded-lg focus:outline-none text-neutral-900 font-medium"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(cat.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-neutral-900 text-white font-bold text-xs rounded-lg hover:bg-neutral-800 transition-colors shadow-sm"
                        >
                          <Check size={12} />
                          저장
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(null);
                            setEditingName("");
                          }}
                          className="px-3 py-1.5 bg-neutral-100 text-neutral-600 font-semibold text-xs rounded-lg hover:bg-neutral-200"
                        >
                          취소
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* 순서 이동 버튼 ▲▼ */}
                          <div className="flex flex-col flex-shrink-0 items-center justify-center gap-0.5">
                            <button
                              type="button"
                              onClick={() => handleMoveCategory(index, "up")}
                              disabled={index === 0}
                              className="text-neutral-400 hover:text-neutral-900 disabled:opacity-20 disabled:hover:text-neutral-400 p-0.5 transition-colors"
                              title="위로 이동"
                            >
                              <ChevronUp size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveCategory(index, "down")}
                              disabled={index === categories.length - 1}
                              className="text-neutral-400 hover:text-neutral-900 disabled:opacity-20 disabled:hover:text-neutral-400 p-0.5 transition-colors"
                              title="아래로 이동"
                            >
                              <ChevronDown size={14} />
                            </button>
                          </div>

                          {/* 순서 번호 뱃지 */}
                          <span className="flex h-5 w-5 items-center justify-center rounded bg-neutral-100 text-[10px] font-bold text-neutral-600 flex-shrink-0">
                            {index + 1}
                          </span>

                          <span className="text-xs font-bold text-neutral-900 truncate">
                            {cat.name}
                          </span>
                          <span className="text-[10px] text-neutral-400 font-mono">
                            ({cat.slug})
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(cat.id);
                              setEditingName(cat.name);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors"
                          >
                            <Edit2 size={11} />
                            수정
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(cat)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors"
                          >
                            <Trash2 size={11} />
                            삭제
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 푸터 */}
        <div className="px-6 py-3.5 border-t border-neutral-100 bg-neutral-50/70 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs rounded-xl transition-colors shadow-sm"
          >
            완료 및 닫기
          </button>
        </div>
      </div>
    </div>
  );
}
