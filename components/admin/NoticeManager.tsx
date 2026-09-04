"use client";

import { useState } from "react";
import { Pencil, Trash2, Plus, Megaphone, Pin } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import GoldButton from "@/components/ui/GoldButton";
import Modal from "@/components/ui/Modal";
import { formatDate } from "@/lib/utils/format";

interface NoticeRow {
  id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  is_active: boolean;
  created_at: string;
}

interface NoticeManagerProps {
  initialNotices: NoticeRow[];
}

export default function NoticeManager({ initialNotices }: NoticeManagerProps) {
  const [notices, setNotices] = useState<NoticeRow[]>(initialNotices);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState<NoticeRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<NoticeRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formPinned, setFormPinned] = useState(false);

  function openCreate() {
    setEditingNotice(null);
    setFormTitle("");
    setFormContent("");
    setFormPinned(false);
    setError("");
    setIsModalOpen(true);
  }

  function openEdit(notice: NoticeRow) {
    setEditingNotice(notice);
    setFormTitle(notice.title);
    setFormContent(notice.content);
    setFormPinned(notice.is_pinned);
    setError("");
    setIsModalOpen(true);
  }

  function sortNotices(list: NoticeRow[]) {
    return [...list].sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
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
        title: formTitle.trim(),
        content: formContent.trim(),
        is_pinned: formPinned,
      };

      const method = editingNotice ? "PUT" : "POST";
      if (editingNotice) body.id = editingNotice.id;

      const res = await fetch("/api/admin/notices", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (editingNotice) {
        setNotices((prev) => sortNotices(prev.map((n) => (n.id === data.id ? data : n))));
      } else {
        setNotices((prev) => sortNotices([data, ...prev]));
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
      const res = await fetch(`/api/admin/notices?id=${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("삭제 실패");
      setNotices((prev) => prev.filter((n) => n.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "삭제 실패");
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(notice: NoticeRow) {
    const res = await fetch("/api/admin/notices", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: notice.id, is_active: !notice.is_active }),
    });
    if (res.ok) {
      const data = await res.json();
      setNotices((prev) => sortNotices(prev.map((n) => (n.id === data.id ? data : n))));
    }
  }

  return (
    <div>
      <div className="flex justify-end mb-6">
        <GoldButton onClick={openCreate}>
          <Plus size={16} />
          공지 추가
        </GoldButton>
      </div>

      {notices.length === 0 ? (
        <GlassCard className="text-center py-16">
          <Megaphone size={32} className="text-subtext mx-auto mb-3" />
          <p className="text-subtext">등록된 공지사항이 없습니다. &quot;공지 추가&quot;로 시작하세요.</p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {notices.map((notice) => (
            <GlassCard key={notice.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {notice.is_pinned && (
                      <span className="inline-flex items-center gap-1 shrink-0 rounded-full bg-gold/10 border border-gold/30 px-2 py-0.5 text-[11px] font-bold text-gold">
                        <Pin size={10} />
                        고정
                      </span>
                    )}
                    <p className="text-white font-semibold text-sm truncate">{notice.title}</p>
                  </div>
                  <p className="text-subtext text-sm leading-relaxed whitespace-pre-line line-clamp-2">{notice.content}</p>
                  <p className="text-subtext text-xs mt-1.5">{formatDate(notice.created_at)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => toggleActive(notice)}
                    className={`rounded-full px-3 py-1 text-xs font-bold text-white transition-colors ${
                      notice.is_active ? "bg-sky-600 hover:bg-sky-700" : "bg-red-500 hover:bg-red-600"
                    }`}
                  >
                    {notice.is_active ? "ON" : "OFF"}
                  </button>
                  <button
                    onClick={() => openEdit(notice)}
                    className="p-2 rounded-lg text-subtext hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(notice)}
                    className="p-2 rounded-lg text-subtext hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* 생성/수정 모달 */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingNotice ? "공지 수정" : "공지 추가"} size="lg">
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm text-subtext mb-1.5">제목</label>
            <input
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              className="input-dark w-full"
              placeholder="예: 서비스 점검 안내"
            />
          </div>

          <div>
            <label className="block text-sm text-subtext mb-1.5">내용</label>
            <textarea
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              className="input-dark w-full h-48 resize-none"
              placeholder="공지 내용을 입력하세요 (줄바꿈 그대로 반영됩니다)"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formPinned}
              onChange={(e) => setFormPinned(e.target.checked)}
              className="w-4 h-4 accent-gold"
            />
            <span className="text-sm text-subtext">상단 고정</span>
          </label>

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
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="공지 삭제" size="sm">
        <div className="p-6 space-y-4">
          <p className="text-subtext text-sm">
            <span className="text-white font-semibold">&quot;{deleteTarget?.title}&quot;</span> 공지를 삭제할까요?
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
