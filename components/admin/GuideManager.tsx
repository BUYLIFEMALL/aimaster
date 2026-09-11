"use client";

import { useMemo, useState } from "react";
import { Pencil, Trash2, Plus, KeyRound } from "lucide-react";
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

interface GuideManagerProps {
  initialGuides: GuideRow[];
}

export default function GuideManager({ initialGuides }: GuideManagerProps) {
  const [guides, setGuides] = useState<GuideRow[]>(initialGuides);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGuide, setEditingGuide] = useState<GuideRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GuideRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formCategory, setFormCategory] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formSortOrder, setFormSortOrder] = useState("0");

  const categories = useMemo(() => {
    const set = new Set(guides.map((g) => g.category));
    return Array.from(set);
  }, [guides]);

  const grouped = useMemo(() => {
    const map = new Map<string, GuideRow[]>();
    for (const guide of guides) {
      const list = map.get(guide.category) ?? [];
      list.push(guide);
      map.set(guide.category, list);
    }
    return Array.from(map.entries());
  }, [guides]);

  function openCreate() {
    setEditingGuide(null);
    setFormCategory(categories[0] ?? "LLM");
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
    if (!formTitle.trim() || !formContent.trim()) {
      setError("제목과 내용을 입력해주세요.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const body: Record<string, unknown> = {
        category: formCategory.trim() || "기타",
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

  return (
    <div>
      <div className="flex justify-end mb-6">
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
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
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
    </div>
  );
}
