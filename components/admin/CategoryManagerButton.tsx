"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Settings } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Modal from "@/components/ui/Modal";
import type { Category } from "@/types/database.types";

interface CategoryManagerButtonProps {
  categories: Category[];
}

// 카테고리 관리 팝업의 구조(설명 문구 → "➕ 새 카테고리 추가" → "📋 현재 등록된 카테고리
// 목록(N개)" — 항목마다 ▲▼ 순서 이동 + 수정/삭제 텍스트 링크 → 하단 닫기 버튼)는
// blog(BLOG 원문생성 자동화)에서 처음 만들어져 threads/naver-cafe-poster의
// CategoryManagementModal.tsx로 이어진 플랫폼 표준 패턴을 그대로 재사용한 것이다. 색상/폰트만
// 이 앱의 다크 골드 테마에 맞췄다 — 플랫폼 전체의 통일성을 위해 새 레이아웃을 만들지 말 것.
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

  // 부모(ProgramsAdminBoard)가 categories prop을 갱신하면(예: 다른 경로로 리프레시된 경우)
  // 이 컴포넌트의 로컬 상태도 함께 최신화한다.
  useEffect(() => {
    setCategories(initialCategories);
  }, [initialCategories]);

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

  // ProgramsAdminBoard.tsx의 moveCategory()와 동일한 이유로 "값을 맞바꾸기"가 아니라 전체를
  // 원하는 순서로 배열한 뒤 0,1,2...로 통째로 재번호를 매긴다(중복 sort_order로 인해 맞바꿔도
  // 순서가 안 바뀌는 문제 방지). 낙관적 업데이트로 클릭 즉시 반영한다.
  const moveCategory = async (id: string, direction: "up" | "down") => {
    const index = categories.findIndex((c) => c.id === id);
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const reordered = [...categories];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
    const updates = reordered.map((c, i) => ({ id: c.id, sort_order: i }));
    const sortMap = new Map(updates.map((u) => [u.id, u.sort_order]));

    const previous = categories;
    setCategories((prev) =>
      [...prev]
        .map((c) => (sortMap.has(c.id) ? { ...c, sort_order: sortMap.get(c.id)! } : c))
        .sort((a, b) => a.sort_order - b.sort_order),
    );

    const results = await Promise.all(
      updates.map((u) => supabase.from("categories").update({ sort_order: u.sort_order }).eq("id", u.id)),
    );
    const firstError = results.find((r) => r.error)?.error;
    if (firstError) {
      setCategoryError(`순서 변경 중 오류가 발생했습니다: ${firstError.message}`);
      setCategories(previous);
      return;
    }
    router.refresh();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="shrink-0 flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold text-black transition-all duration-200 hover:opacity-90 hover:scale-[1.02]"
        style={{ background: "linear-gradient(135deg, #d4af37, #f5c842)" }}
      >
        <Settings size={13} /> 카테고리 관리
      </button>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="🗂 카테고리 관리" size="lg">
        <div className="p-6 space-y-6">
          <p className="text-xs text-subtext">
            카테고리를 만들어두면 프로그램 등록/수정 화면에서 어느 카테고리에 넣을지 선택할 수
            있고, 목록 화면(/admin/programs)과 공개 페이지(/programs)에서 이 카테고리 단위로
            묶여서 노출됩니다.
          </p>

          <div className="space-y-2">
            <label className="text-xs font-bold text-white">➕ 새 카테고리 추가</label>
            <div className="flex items-center gap-2">
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
                className="shrink-0 rounded-lg bg-gold/10 text-gold px-3 py-2 text-xs font-bold hover:bg-gold/20">
                추가
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-white">
              📋 현재 등록된 카테고리 목록 ({categories.length}개)
            </label>
            {categories.length === 0 ? (
              <div className="py-8 text-center text-xs text-subtext">등록된 카테고리가 없습니다.</div>
            ) : (
              <ul className="space-y-2">
                {categories.map((cat, index) => (
                  <li key={cat.id} className="rounded-lg border border-white/10 p-2">
                    {editingCategoryId === cat.id ? (
                      <div className="flex items-center gap-2">
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
                          className="shrink-0 text-xs font-bold text-gold hover:underline">
                          저장
                        </button>
                        <button type="button" onClick={() => setEditingCategoryId(null)}
                          className="shrink-0 text-xs font-bold text-subtext hover:underline">
                          취소
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            title="위로 이동"
                            disabled={index === 0}
                            onClick={() => moveCategory(cat.id, "up")}
                            className="rounded px-1.5 py-0.5 text-xs text-subtext hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            title="아래로 이동"
                            disabled={index === categories.length - 1}
                            onClick={() => moveCategory(cat.id, "down")}
                            className="rounded px-1.5 py-0.5 text-xs text-subtext hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            ▼
                          </button>
                          <span className="ml-1 text-sm font-medium text-white">{cat.name}</span>
                          <span className="text-xs text-subtext">{cat.slug}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <button type="button" onClick={() => startEditCategory(cat)}
                            className="text-xs font-bold text-gold hover:underline">
                            수정
                          </button>
                          <button type="button" onClick={() => handleDeleteCategory(cat.id)}
                            className="text-xs font-bold text-red-400 hover:underline">
                            삭제
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {categoryError && <p className="text-xs text-red-400">{categoryError}</p>}

          <div className="flex justify-end border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-xl bg-white/10 px-5 py-2 text-xs font-bold text-white hover:bg-white/20"
            >
              닫기
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
