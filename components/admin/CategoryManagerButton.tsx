"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Settings, Check, X, Trash2, Plus, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Modal from "@/components/ui/Modal";
import type { Category } from "@/types/database.types";

interface CategoryManagerButtonProps {
  categories: Category[];
}

export default function CategoryManagerButton({ categories: initialCategories }: CategoryManagerButtonProps) {
  const supabase = createClient();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [categories, setCategories] = useState(initialCategories);
  const [categoryError, setCategoryError] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategorySlug, setNewCategorySlug] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState("");
  const [editCategorySlug, setEditCategorySlug] = useState("");

  const slugify = (val: string) =>
    val.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");

  // 카테고리 목록을 새로고침하고, 목록 화면(ProgramsAdminBoard)의 필터/그룹핑도 최신
  // 상태를 받도록 서버 컴포넌트(page.tsx)의 categories 조회를 다시 실행시킨다.
  const refreshCategories = async () => {
    const { data } = await supabase.from("categories").select("*").order("sort_order");
    setCategories(data ?? []);
    router.refresh();
  };

  const handleAddCategory = async () => {
    setCategoryError("");
    const name = newCategoryName.trim();
    const slug = newCategorySlug.trim() || slugify(name);
    if (!name || !slug) { setCategoryError("카테고리명과 슬러그를 입력해주세요."); return; }

    const nextSortOrder = categories.length > 0 ? Math.max(...categories.map((c) => c.sort_order)) + 1 : 1;
    const { error: e } = await supabase.from("categories").insert({ name, slug, sort_order: nextSortOrder });
    if (e) { setCategoryError(e.message); return; }

    setNewCategoryName("");
    setNewCategorySlug("");
    await refreshCategories();
  };

  const startEditCategory = (cat: Category) => {
    setEditingCategoryId(cat.id);
    setEditCategoryName(cat.name);
    setEditCategorySlug(cat.slug);
    setCategoryError("");
  };

  const handleSaveCategory = async (id: string) => {
    setCategoryError("");
    const name = editCategoryName.trim();
    const slug = editCategorySlug.trim();
    if (!name || !slug) { setCategoryError("카테고리명과 슬러그를 입력해주세요."); return; }

    const { error: e } = await supabase.from("categories").update({ name, slug }).eq("id", id);
    if (e) { setCategoryError(e.message); return; }

    setEditingCategoryId(null);
    await refreshCategories();
  };

  const handleDeleteCategory = async (id: string) => {
    setCategoryError("");
    if (!confirm("이 카테고리를 삭제할까요?")) return;
    const { error: e } = await supabase.from("categories").delete().eq("id", id);
    if (e) { setCategoryError("이 카테고리를 사용 중인 프로그램이 있으면 삭제할 수 없습니다. 먼저 해당 프로그램의 카테고리를 변경해주세요."); return; }
    await refreshCategories();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="shrink-0 flex items-center gap-1.5 rounded-lg border border-white/10 px-4 py-2.5 text-sm text-subtext hover:text-white hover:bg-white/5 transition-colors"
      >
        <Settings size={16} /> 카테고리 관리
      </button>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="카테고리 관리" size="lg">
        <div className="p-6 space-y-2">
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center gap-2">
              {editingCategoryId === cat.id ? (
                <>
                  <input
                    type="text"
                    value={editCategoryName}
                    onChange={(e) => setEditCategoryName(e.target.value)}
                    className="input-dark flex-1 text-sm"
                    placeholder="카테고리명"
                  />
                  <input
                    type="text"
                    value={editCategorySlug}
                    onChange={(e) => setEditCategorySlug(e.target.value)}
                    className="input-dark flex-1 text-sm"
                    placeholder="슬러그"
                  />
                  <button type="button" onClick={() => handleSaveCategory(cat.id)}
                    className="shrink-0 p-1.5 rounded hover:bg-white/10 text-gold">
                    <Check size={14} />
                  </button>
                  <button type="button" onClick={() => setEditingCategoryId(null)}
                    className="shrink-0 p-1.5 rounded hover:bg-white/10 text-subtext">
                    <X size={14} />
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm text-white">{cat.name}</span>
                  <span className="text-xs text-subtext">{cat.slug}</span>
                  <button type="button" onClick={() => startEditCategory(cat)}
                    className="shrink-0 p-1.5 rounded hover:bg-white/10 text-subtext hover:text-white">
                    <Pencil size={14} />
                  </button>
                  <button type="button" onClick={() => handleDeleteCategory(cat.id)}
                    className="shrink-0 p-1.5 rounded hover:bg-red-500/10 text-red-400 hover:text-red-300">
                    <Trash2 size={14} />
                  </button>
                </>
              )}
            </div>
          ))}

          <div className="flex items-center gap-2 pt-3 border-t border-white/10">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="input-dark flex-1 text-sm"
              placeholder="새 카테고리명 (예: 쇼핑몰)"
            />
            <input
              type="text"
              value={newCategorySlug}
              onChange={(e) => setNewCategorySlug(e.target.value)}
              className="input-dark flex-1 text-sm"
              placeholder="슬러그 (비우면 자동 생성)"
            />
            <button type="button" onClick={handleAddCategory}
              className="shrink-0 flex items-center gap-1 rounded-lg bg-gold/10 text-gold px-3 py-2 text-xs font-medium hover:bg-gold/20">
              <Plus size={14} /> 추가
            </button>
          </div>

          {categoryError && <p className="text-xs text-red-400">{categoryError}</p>}
        </div>
      </Modal>
    </>
  );
}
