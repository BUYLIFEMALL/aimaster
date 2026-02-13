"use client";

import { useState } from "react";
import { Pencil, Trash2, Plus, GripVertical } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import GoldButton from "@/components/ui/GoldButton";
import Modal from "@/components/ui/Modal";
import type { MemberGrade } from "@/types/database.types";

interface GradeWithCount extends MemberGrade {
  member_count: number;
}

interface GradeManagerProps {
  initialGrades: GradeWithCount[];
}

const PRESET_COLORS = [
  "#d4af37", "#f5c842", "#3b82f6", "#10b981",
  "#8b5cf6", "#ef4444", "#f97316", "#ec4899",
  "#06b6d4", "#84cc16", "#a78bfa", "#fb923c",
];

export default function GradeManager({ initialGrades }: GradeManagerProps) {
  const [grades, setGrades] = useState<GradeWithCount[]>(initialGrades);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGrade, setEditingGrade] = useState<GradeWithCount | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 폼 상태
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formColor, setFormColor] = useState("#d4af37");
  const [formSortOrder, setFormSortOrder] = useState(0);

  // 삭제 확인
  const [deleteTarget, setDeleteTarget] = useState<GradeWithCount | null>(null);

  function openCreate() {
    setEditingGrade(null);
    setFormName("");
    setFormSlug("");
    setFormColor("#d4af37");
    setFormSortOrder(grades.length);
    setError("");
    setIsModalOpen(true);
  }

  function openEdit(grade: GradeWithCount) {
    setEditingGrade(grade);
    setFormName(grade.name);
    setFormSlug(grade.slug);
    setFormColor(grade.color || "#d4af37");
    setFormSortOrder(grade.sort_order);
    setError("");
    setIsModalOpen(true);
  }

  function autoSlug(name: string) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9가-힣\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const body = {
      ...(editingGrade ? { id: editingGrade.id } : {}),
      name: formName.trim(),
      slug: formSlug.trim(),
      color: formColor,
      sort_order: formSortOrder,
    };

    try {
      const res = await fetch("/api/admin/grades", {
        method: editingGrade ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (editingGrade) {
        setGrades((prev) =>
          prev.map((g) =>
            g.id === data.id ? { ...data, member_count: g.member_count } : g
          )
        );
      } else {
        setGrades((prev) =>
          [...prev, { ...data, member_count: 0 }].sort(
            (a, b) => a.sort_order - b.sort_order
          )
        );
      }

      setIsModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setLoading(true);

    try {
      const res = await fetch("/api/admin/grades", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteTarget.id }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setGrades((prev) => prev.filter((g) => g.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "삭제 실패");
      setDeleteTarget(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* 상단 액션 */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-subtext">총 {grades.length}개 등급</p>
        <GoldButton size="sm" onClick={openCreate}>
          <Plus size={16} />
          새 등급 추가
        </GoldButton>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* 등급 목록 */}
      {grades.length === 0 ? (
        <GlassCard className="text-center py-12">
          <p className="text-subtext">등록된 등급이 없습니다</p>
          <GoldButton size="sm" variant="outline" className="mt-4" onClick={openCreate}>
            첫 등급 만들기
          </GoldButton>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {grades.map((grade) => (
            <GlassCard key={grade.id} className="p-4">
              <div className="flex items-center gap-4">
                {/* 드래그 핸들 (시각적) */}
                <GripVertical size={16} className="text-white/20 flex-shrink-0" />

                {/* 색상 표시 */}
                <div
                  className="w-8 h-8 rounded-lg flex-shrink-0 border border-white/10"
                  style={{ backgroundColor: grade.color || "#666" }}
                />

                {/* 정보 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="font-bold text-sm"
                      style={{ color: grade.color || "#fff" }}
                    >
                      {grade.name}
                    </span>
                    <span className="text-xs text-subtext bg-white/5 px-2 py-0.5 rounded-md">
                      {grade.slug}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-subtext">
                      순서: {grade.sort_order}
                    </span>
                    <span className="text-xs text-subtext">
                      회원: {grade.member_count}명
                    </span>
                  </div>
                </div>

                {/* 액션 */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => openEdit(grade)}
                    className="p-2 rounded-lg text-subtext hover:text-gold hover:bg-gold/10 transition-colors"
                    title="수정"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => {
                      setError("");
                      setDeleteTarget(grade);
                    }}
                    className="p-2 rounded-lg text-subtext hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title="삭제"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* 등급 생성/수정 모달 */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingGrade ? "등급 수정" : "새 등급 추가"}
        size="sm"
      >
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* 이름 */}
          <div>
            <label className="block text-sm text-subtext mb-1.5">등급 이름</label>
            <input
              type="text"
              value={formName}
              onChange={(e) => {
                setFormName(e.target.value);
                if (!editingGrade) setFormSlug(autoSlug(e.target.value));
              }}
              placeholder="예: 프리미엄"
              className="input-dark w-full"
              required
            />
          </div>

          {/* 슬러그 */}
          <div>
            <label className="block text-sm text-subtext mb-1.5">슬러그</label>
            <input
              type="text"
              value={formSlug}
              onChange={(e) => setFormSlug(e.target.value)}
              placeholder="예: premium"
              className="input-dark w-full"
              required
            />
          </div>

          {/* 색상 */}
          <div>
            <label className="block text-sm text-subtext mb-1.5">색상</label>
            <div className="flex items-center gap-3 mb-2">
              <div
                className="w-10 h-10 rounded-lg border border-white/20"
                style={{ backgroundColor: formColor }}
              />
              <input
                type="text"
                value={formColor}
                onChange={(e) => setFormColor(e.target.value)}
                className="input-dark flex-1"
                placeholder="#d4af37"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setFormColor(c)}
                  className={`w-7 h-7 rounded-lg border-2 transition-all ${
                    formColor === c
                      ? "border-white scale-110"
                      : "border-transparent hover:border-white/40"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* 정렬 순서 */}
          <div>
            <label className="block text-sm text-subtext mb-1.5">정렬 순서</label>
            <input
              type="number"
              value={formSortOrder}
              onChange={(e) => setFormSortOrder(Number(e.target.value))}
              className="input-dark w-24"
              min={0}
            />
          </div>

          {/* 에러 */}
          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          {/* 버튼 */}
          <div className="flex gap-3 pt-2">
            <GoldButton type="submit" size="sm" fullWidth disabled={loading}>
              {loading ? "처리 중..." : editingGrade ? "수정 완료" : "등급 생성"}
            </GoldButton>
            <GoldButton
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(false)}
            >
              취소
            </GoldButton>
          </div>
        </form>
      </Modal>

      {/* 삭제 확인 모달 */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="등급 삭제"
        size="sm"
      >
        <div className="p-6">
          <p className="text-white mb-2">
            <span style={{ color: deleteTarget?.color || "#fff" }} className="font-bold">
              {deleteTarget?.name}
            </span>{" "}
            등급을 삭제하시겠습니까?
          </p>
          {deleteTarget && deleteTarget.member_count > 0 && (
            <p className="text-red-400 text-sm mb-4">
              이 등급을 사용 중인 회원이 {deleteTarget.member_count}명 있습니다.
            </p>
          )}
          <div className="flex gap-3 mt-6">
            <button
              onClick={handleDelete}
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors text-sm font-medium disabled:opacity-50"
            >
              {loading ? "삭제 중..." : "삭제"}
            </button>
            <GoldButton
              variant="outline"
              size="sm"
              onClick={() => setDeleteTarget(null)}
            >
              취소
            </GoldButton>
          </div>
        </div>
      </Modal>
    </>
  );
}
