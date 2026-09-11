"use client";

import { useMemo, useState } from "react";
import { Pencil, Trash2, Plus, KeyRound, FolderCog, ArrowUp, ArrowDown, Check, X } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import GoldButton from "@/components/ui/GoldButton";
import Modal from "@/components/ui/Modal";
import RichTextEditor from "@/components/ui/RichTextEditor";
import { formatDate } from "@/lib/utils/format";

interface GuideRow {
  id: string;
  category: string;
  title: string;
  content: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

interface CategoryRow {
  id: string;
  name: string;
  sort_order: number;
}

interface GuideManagerProps {
  initialGuides: GuideRow[];
  initialCategories: CategoryRow[];
}

export default function GuideManager({ initialGuides, initialCategories }: GuideManagerProps) {
  const [guides, setGuides] = useState<GuideRow[]>(initialGuides);
  const [categories, setCategories] = useState<CategoryRow[]>(initialCategories);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGuide, setEditingGuide] = useState<GuideRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GuideRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formCategory, setFormCategory] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formSortOrder, setFormSortOrder] = useState("0");

  // 카테고리 관리 모달 상태
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [categoryError, setCategoryError] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [categoryBusyId, setCategoryBusyId] = useState<string | null>(null);
  const [deleteCategoryTarget, setDeleteCategoryTarget] = useState<CategoryRow | null>(null);

  const categoryNames = useMemo(() => categories.map((c) => c.name), [categories]);

  // 카테고리 목록의 순서(sort_order)를 기준으로 묶는다. 아직 카테고리 테이블에 없는
  // (레거시) category 값이 있으면 맨 뒤에 붙여서 데이터가 누락되지 않게 한다.
  const grouped = useMemo(() => {
    const byCategory = new Map<string, GuideRow[]>();
    for (const guide of guides) {
      const list = byCategory.get(guide.category) ?? [];
      list.push(guide);
      byCategory.set(guide.category, list);
    }
    const ordered: [string, GuideRow[]][] = [];
    for (const cat of categories) {
      if (byCategory.has(cat.name)) {
        ordered.push([cat.name, byCategory.get(cat.name)!]);
        byCategory.delete(cat.name);
      }
    }
    for (const [name, items] of byCategory) {
      ordered.push([name, items]);
    }
    return ordered;
  }, [guides, categories]);

  function openCreate() {
    setEditingGuide(null);
    setFormCategory(categoryNames[0] ?? "");
    setFormTitle("");
    setFormContent("");
    setFormSortOrder("0");
    setError("");
    setIsModalOpen(true);
  }

  function openEdit(guide: GuideRow) {
    setEditingGuide(guide);
    setFormCategory(guide.category);
    setFormTitle(guide.title);
    setFormContent(guide.content);
    setFormSortOrder(String(guide.sort_order));
    setError("");
    setIsModalOpen(true);
  }

  function sortGuides(list: GuideRow[]) {
    return [...list].sort((a, b) => {
      if (a.category !== b.category) return a.category.localeCompare(b.category);
      return a.sort_order - b.sort_order;
    });
  }

  async function handleSave() {
    if (!formCategory.trim() || !formTitle.trim() || !formContent.trim()) {
      setError("카테고리, 제목, 내용을 입력해주세요.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const body: Record<string, unknown> = {
        category: formCategory.trim(),
        title: formTitle.trim(),
        content: formContent,
        sort_order: parseInt(formSortOrder) || 0,
      };

      const method = editingGuide ? "PUT" : "POST";
      if (editingGuide) body.id = editingGuide.id;

      const res = await fetch("/api/admin/guides", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (editingGuide) {
        setGuides((prev) => sortGuides(prev.map((g) => (g.id === data.id ? data : g))));
      } else {
        setGuides((prev) => sortGuides([...prev, data]));
      }
      setIsModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장 실패");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/guides?id=${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("삭제 실패");
      setGuides((prev) => prev.filter((g) => g.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "삭제 실패");
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(guide: GuideRow) {
    const res = await fetch("/api/admin/guides", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: guide.id, is_active: !guide.is_active }),
    });
    if (res.ok) {
      const data = await res.json();
      setGuides((prev) => sortGuides(prev.map((g) => (g.id === data.id ? data : g))));
    }
  }

  // ── 카테고리 관리 ──────────────────────────────────────────────

  async function handleAddCategory() {
    const name = newCategoryName.trim();
    if (!name) return;
    setCategoryError("");
    try {
      const res = await fetch("/api/admin/guide-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCategories((prev) => [...prev, data].sort((a, b) => a.sort_order - b.sort_order));
      setNewCategoryName("");
    } catch (err) {
      setCategoryError(err instanceof Error ? err.message : "추가 실패");
    }
  }

  function startRename(cat: CategoryRow) {
    setRenamingId(cat.id);
    setRenameValue(cat.name);
    setCategoryError("");
  }

  async function confirmRename(cat: CategoryRow) {
    const name = renameValue.trim();
    if (!name || name === cat.name) {
      setRenamingId(null);
      return;
    }
    setCategoryBusyId(cat.id);
    setCategoryError("");
    try {
      const res = await fetch("/api/admin/guide-categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: cat.id, name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCategories((prev) => prev.map((c) => (c.id === cat.id ? data : c)));
      // 이 카테고리에 속한 가이드들의 category 값도 서버에서 함께 바꿔줬으니 화면에도 반영한다.
      setGuides((prev) => prev.map((g) => (g.category === cat.name ? { ...g, category: name } : g)));
      setRenamingId(null);
    } catch (err) {
      setCategoryError(err instanceof Error ? err.message : "이름 변경 실패");
    } finally {
      setCategoryBusyId(null);
    }
  }

  async function moveCategory(cat: CategoryRow, direction: "up" | "down") {
    const sorted = [...categories].sort((a, b) => a.sort_order - b.sort_order);
    const index = sorted.findIndex((c) => c.id === cat.id);
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sorted.length) return;

    const target = sorted[targetIndex];
    setCategoryBusyId(cat.id);
    setCategoryError("");
    try {
      const [res1, res2] = await Promise.all([
        fetch("/api/admin/guide-categories", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: cat.id, sort_order: target.sort_order }),
        }),
        fetch("/api/admin/guide-categories", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: target.id, sort_order: cat.sort_order }),
        }),
      ]);
      const [data1, data2] = await Promise.all([res1.json(), res2.json()]);
      if (!res1.ok) throw new Error(data1.error);
      if (!res2.ok) throw new Error(data2.error);
      setCategories((prev) =>
        prev
          .map((c) => (c.id === data1.id ? data1 : c.id === data2.id ? data2 : c))
          .sort((a, b) => a.sort_order - b.sort_order),
      );
    } catch (err) {
      setCategoryError(err instanceof Error ? err.message : "순서 변경 실패");
    } finally {
      setCategoryBusyId(null);
    }
  }

  async function confirmDeleteCategory() {
    const cat = deleteCategoryTarget;
    if (!cat) return;
    setCategoryBusyId(cat.id);
    setCategoryError("");
    try {
      const res = await fetch(`/api/admin/guide-categories?id=${cat.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCategories((prev) => prev.filter((c) => c.id !== cat.id));
      setDeleteCategoryTarget(null);
    } catch (err) {
      setCategoryError(err instanceof Error ? err.message : "삭제 실패");
    } finally {
      setCategoryBusyId(null);
    }
  }

  return (
    <div>
      <div className="flex justify-end gap-2 mb-6">
        <GoldButton variant="outline" onClick={() => setIsCategoryModalOpen(true)}>
          <FolderCog size={16} />
          카테고리 관리
        </GoldButton>
        <GoldButton onClick={openCreate}>
          <Plus size={16} />
          가이드 추가
        </GoldButton>
      </div>

      {guides.length === 0 ? (
        <GlassCard className="text-center py-16">
          <KeyRound size={32} className="text-subtext mx-auto mb-3" />
          <p className="text-subtext">등록된 가이드가 없습니다. &quot;가이드 추가&quot;로 시작하세요.</p>
        </GlassCard>
      ) : (
        <div className="space-y-8">
          {grouped.map(([category, items]) => (
            <div key={category}>
              <h3 className="text-sm font-bold text-gold mb-3">{category}</h3>
              <div className="space-y-3">
                {items.map((guide) => (
                  <GlassCard key={guide.id} className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-white font-semibold text-sm mb-1">{guide.title}</p>
                        <p className="text-subtext text-xs">{formatDate(guide.created_at)}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          onClick={() => toggleActive(guide)}
                          className={`rounded-full px-3 py-1 text-xs font-bold text-white transition-colors ${
                            guide.is_active ? "bg-sky-600 hover:bg-sky-700" : "bg-red-500 hover:bg-red-600"
                          }`}
                        >
                          {guide.is_active ? "ON" : "OFF"}
                        </button>
                        <button
                          onClick={() => openEdit(guide)}
                          className="p-2 rounded-lg text-subtext hover:text-white hover:bg-white/10 transition-colors"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(guide)}
                          className="p-2 rounded-lg text-subtext hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </GlassCard>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 생성/수정 모달 */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingGuide ? "가이드 수정" : "가이드 추가"} size="xl">
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm text-subtext mb-1.5">카테고리</label>
            <input
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value)}
              className="input-dark w-full"
              placeholder="예: LLM, SNS, 이커머스"
              list="guide-categories"
            />
            <datalist id="guide-categories">
              {categoryNames.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            {categoryNames.length === 0 && (
              <p className="text-xs text-subtext mt-1">등록된 카테고리가 없습니다. 먼저 &quot;카테고리 관리&quot;에서 만들어주세요.</p>
            )}
          </div>

          <div>
            <label className="block text-sm text-subtext mb-1.5">제목</label>
            <input
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              className="input-dark w-full"
              placeholder="예: OpenAI API 키 발급받기"
            />
          </div>

          <div>
            <label className="block text-sm text-subtext mb-1.5">
              내용 (캡쳐 이미지를 첨부하면 &quot;AIMaster&quot; 워터마크가 자동으로 삽입됩니다)
            </label>
            <RichTextEditor value={formContent} onChange={setFormContent} watermarkImages />
          </div>

          <div>
            <label className="block text-sm text-subtext mb-1.5">정렬 순서 (카테고리 내 작은 숫자가 먼저 표시)</label>
            <input
              type="number"
              value={formSortOrder}
              onChange={(e) => setFormSortOrder(e.target.value)}
              className="input-dark w-full"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <GoldButton onClick={handleSave} disabled={loading} fullWidth>
              {loading ? "저장 중..." : "저장"}
            </GoldButton>
            <GoldButton variant="outline" onClick={() => setIsModalOpen(false)} fullWidth>
              취소
            </GoldButton>
          </div>
        </div>
      </Modal>

      {/* 삭제 확인 모달 */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="가이드 삭제" size="sm">
        <div className="p-6 space-y-4">
          <p className="text-subtext text-sm">
            <span className="text-white font-semibold">&quot;{deleteTarget?.title}&quot;</span> 가이드를 삭제할까요?
            이 작업은 되돌릴 수 없습니다.
          </p>
          <div className="flex gap-3">
            <GoldButton onClick={handleDelete} disabled={loading} fullWidth>
              {loading ? "삭제 중..." : "삭제"}
            </GoldButton>
            <GoldButton variant="outline" onClick={() => setDeleteTarget(null)} fullWidth>
              취소
            </GoldButton>
          </div>
        </div>
      </Modal>

      {/* 카테고리 관리 모달 */}
      <Modal isOpen={isCategoryModalOpen} onClose={() => setIsCategoryModalOpen(false)} title="카테고리 관리" size="md">
        <div className="p-6 space-y-4">
          <div className="flex gap-2">
            <input
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
              className="input-dark flex-1"
              placeholder="새 카테고리 이름 (예: SNS)"
            />
            <GoldButton onClick={handleAddCategory}>
              <Plus size={16} />
              추가
            </GoldButton>
          </div>

          {categoryError && (
            <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">{categoryError}</p>
          )}

          {categories.length === 0 ? (
            <p className="text-subtext text-sm text-center py-6">등록된 카테고리가 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {[...categories]
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((cat, index, arr) => (
                  <div key={cat.id} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/3 px-3 py-2">
                    <div className="flex flex-col">
                      <button
                        onClick={() => moveCategory(cat, "up")}
                        disabled={index === 0 || categoryBusyId === cat.id}
                        className="text-subtext hover:text-white disabled:opacity-20 disabled:cursor-not-allowed"
                      >
                        <ArrowUp size={13} />
                      </button>
                      <button
                        onClick={() => moveCategory(cat, "down")}
                        disabled={index === arr.length - 1 || categoryBusyId === cat.id}
                        className="text-subtext hover:text-white disabled:opacity-20 disabled:cursor-not-allowed"
                      >
                        <ArrowDown size={13} />
                      </button>
                    </div>

                    {renamingId === cat.id ? (
                      <>
                        <input
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && confirmRename(cat)}
                          className="input-dark flex-1 py-1"
                          autoFocus
                        />
                        <button onClick={() => confirmRename(cat)} className="p-1.5 text-green-400 hover:bg-green-500/10 rounded">
                          <Check size={15} />
                        </button>
                        <button onClick={() => setRenamingId(null)} className="p-1.5 text-subtext hover:bg-white/10 rounded">
                          <X size={15} />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-sm text-white">{cat.name}</span>
                        <button
                          onClick={() => startRename(cat)}
                          disabled={categoryBusyId === cat.id}
                          className="p-1.5 text-subtext hover:text-white hover:bg-white/10 rounded transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteCategoryTarget(cat)}
                          disabled={categoryBusyId === cat.id}
                          className="p-1.5 text-subtext hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                ))}
            </div>
          )}

          <div className="pt-2">
            <GoldButton variant="outline" onClick={() => setIsCategoryModalOpen(false)} fullWidth>
              닫기
            </GoldButton>
          </div>
        </div>
      </Modal>

      {/* 카테고리 삭제 확인 모달 */}
      <Modal isOpen={!!deleteCategoryTarget} onClose={() => setDeleteCategoryTarget(null)} title="카테고리 삭제" size="sm">
        <div className="p-6 space-y-4">
          <p className="text-subtext text-sm">
            <span className="text-white font-semibold">&quot;{deleteCategoryTarget?.name}&quot;</span> 카테고리를 삭제할까요?
            이 카테고리에 가이드가 남아있으면 삭제되지 않습니다.
          </p>
          {categoryError && (
            <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">{categoryError}</p>
          )}
          <div className="flex gap-3">
            <GoldButton onClick={confirmDeleteCategory} disabled={categoryBusyId === deleteCategoryTarget?.id} fullWidth>
              {categoryBusyId === deleteCategoryTarget?.id ? "삭제 중..." : "삭제"}
            </GoldButton>
            <GoldButton variant="outline" onClick={() => setDeleteCategoryTarget(null)} fullWidth>
              취소
            </GoldButton>
          </div>
        </div>
      </Modal>
    </div>
  );
}
