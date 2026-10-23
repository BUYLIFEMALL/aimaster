"use client";

import { useMemo, useState } from "react";
import { Pencil, Trash2, Plus, HelpCircle } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import GoldButton from "@/components/ui/GoldButton";
import Modal from "@/components/ui/Modal";

interface FaqRow {
  id: string;
  category: string;
  question: string;
  answer: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

interface FaqManagerProps {
  initialFaqs: FaqRow[];
}

export default function FaqManager({ initialFaqs }: FaqManagerProps) {
  const [faqs, setFaqs] = useState<FaqRow[]>(initialFaqs);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FaqRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FaqRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formCategory, setFormCategory] = useState("");
  const [formQuestion, setFormQuestion] = useState("");
  const [formAnswer, setFormAnswer] = useState("");
  const [formSortOrder, setFormSortOrder] = useState("0");

  const categories = useMemo(() => {
    const set = new Set(faqs.map((f) => f.category));
    return Array.from(set);
  }, [faqs]);

  const grouped = useMemo(() => {
    const map = new Map<string, FaqRow[]>();
    for (const faq of faqs) {
      const list = map.get(faq.category) ?? [];
      list.push(faq);
      map.set(faq.category, list);
    }
    return Array.from(map.entries());
  }, [faqs]);

  function openCreate() {
    setEditingFaq(null);
    setFormCategory(categories[0] ?? "일반");
    setFormQuestion("");
    setFormAnswer("");
    setFormSortOrder("0");
    setError("");
    setIsModalOpen(true);
  }

  function openEdit(faq: FaqRow) {
    setEditingFaq(faq);
    setFormCategory(faq.category);
    setFormQuestion(faq.question);
    setFormAnswer(faq.answer);
    setFormSortOrder(String(faq.sort_order));
    setError("");
    setIsModalOpen(true);
  }

  async function handleSave() {
    if (!formQuestion.trim() || !formAnswer.trim()) {
      setError("질문과 답변을 입력해주세요.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const body: Record<string, unknown> = {
        category: formCategory.trim() || "일반",
        question: formQuestion.trim(),
        answer: formAnswer.trim(),
        sort_order: parseInt(formSortOrder) || 0,
      };

      const method = editingFaq ? "PUT" : "POST";
      if (editingFaq) body.id = editingFaq.id;

      const res = await fetch("/api/admin/faq", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (editingFaq) {
        setFaqs((prev) => prev.map((f) => (f.id === data.id ? data : f)));
      } else {
        setFaqs((prev) => [...prev, data]);
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
      const res = await fetch(`/api/admin/faq?id=${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("삭제 실패");
      setFaqs((prev) => prev.filter((f) => f.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "삭제 실패");
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(faq: FaqRow) {
    const res = await fetch("/api/admin/faq", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: faq.id, is_active: !faq.is_active }),
    });
    if (res.ok) {
      const data = await res.json();
      setFaqs((prev) => prev.map((f) => (f.id === data.id ? data : f)));
    }
  }

  return (
    <div>
      <div className="flex justify-end mb-6">
        <GoldButton onClick={openCreate}>
          <Plus size={16} />
          질문 추가
        </GoldButton>
      </div>

      {faqs.length === 0 ? (
        <GlassCard className="text-center py-16">
          <HelpCircle size={32} className="text-subtext mx-auto mb-3" />
          <p className="text-subtext">등록된 질문이 없습니다. &quot;질문 추가&quot;로 시작하세요.</p>
        </GlassCard>
      ) : (
        <div className="space-y-8">
          {grouped.map(([category, items]) => (
            <div key={category}>
              <h3 className="text-sm font-bold text-gold mb-3">{category}</h3>
              <div className="space-y-3">
                {items.map((faq) => (
                  <GlassCard key={faq.id} className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-white font-semibold text-sm mb-1">{faq.question}</p>
                        <p className="text-subtext text-sm leading-relaxed whitespace-pre-line">{faq.answer}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          onClick={() => toggleActive(faq)}
                          className={`rounded-full px-3 py-1 text-xs font-bold text-white transition-colors ${
                            faq.is_active ? "bg-sky-600 hover:bg-sky-700" : "bg-red-500 hover:bg-red-600"
                          }`}
                        >
                          {faq.is_active ? "ON" : "OFF"}
                        </button>
                        <button
                          onClick={() => openEdit(faq)}
                          className="p-2 rounded-lg text-subtext hover:text-white hover:bg-white/10 transition-colors"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(faq)}
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
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingFaq ? "질문 수정" : "질문 추가"} size="lg">
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm text-subtext mb-1.5">카테고리</label>
            <input
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value)}
              className="input-dark w-full"
              placeholder="예: 시작하기, API 키 · 이용 요금"
              list="faq-categories"
            />
            <datalist id="faq-categories">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-sm text-subtext mb-1.5">질문</label>
            <input
              value={formQuestion}
              onChange={(e) => setFormQuestion(e.target.value)}
              className="input-dark w-full"
              placeholder="예: API 키는 어디서 발급받나요?"
            />
          </div>

          <div>
            <label className="block text-sm text-subtext mb-1.5">답변</label>
            <textarea
              value={formAnswer}
              onChange={(e) => setFormAnswer(e.target.value)}
              className="input-dark w-full h-36 resize-none"
              placeholder="답변 내용을 입력하세요"
            />
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
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="질문 삭제" size="sm">
        <div className="p-6 space-y-4">
          <p className="text-subtext text-sm">
            <span className="text-white font-semibold">&quot;{deleteTarget?.question}&quot;</span> 질문을 삭제할까요?
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
