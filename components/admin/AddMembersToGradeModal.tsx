"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Search, UserPlus, X } from "lucide-react";
import GoldButton from "@/components/ui/GoldButton";
import type { Profile, MemberGrade } from "@/types/database.types";

interface AddMembersToGradeModalProps {
  targetGrade: MemberGrade;
  availableMembers: Profile[];
  grades: MemberGrade[];
  onClose: () => void;
  onAssign: (userIds: string[], targetGradeId: string | null) => Promise<void>;
}

export default function AddMembersToGradeModal({
  targetGrade,
  availableMembers,
  grades,
  onClose,
  onAssign,
}: AddMembersToGradeModalProps) {
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return availableMembers;
    return availableMembers.filter(
      (m) =>
        (m.name ?? "").toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q),
    );
  }, [availableMembers, search]);

  const allChecked =
    filteredMembers.length > 0 && filteredMembers.every((m) => selectedIds.has(m.id));

  function toggleSelectAll() {
    setSelectedIds((prev) => {
      if (allChecked) {
        const next = new Set(prev);
        filteredMembers.forEach((m) => next.delete(m.id));
        return next;
      }
      const next = new Set(prev);
      filteredMembers.forEach((m) => next.add(m.id));
      return next;
    });
  }

  function toggleSelectOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleAssign() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setSaving(true);
    try {
      await onAssign(ids, targetGrade.id);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-surface border border-white/10 rounded-2xl p-6 w-full max-w-xl mx-4 shadow-2xl flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
          <div className="flex items-center gap-2">
            <UserPlus className="text-gold" size={20} />
            <h3 className="text-white font-bold text-lg">
              <span className="text-gold">[{targetGrade.name}]</span> 등급으로 회원 이동 / 추가
            </h3>
          </div>
          <button onClick={onClose} className="text-subtext hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <p className="text-subtext text-xs mb-3">
          현재 [{targetGrade.name}] 등급이 아닌 회원을 선택하여 한 번에 이동시킵니다.
        </p>

        {/* 검색 입력창 */}
        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtext" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="이동할 회원의 이름 또는 이메일 검색..."
            className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-3 text-sm text-white placeholder:text-subtext focus:outline-none focus:border-gold/40 transition-colors"
          />
        </div>

        {/* 회원 선택 리스트 */}
        <div className="flex-1 overflow-y-auto rounded-xl border border-white/10 bg-white/5 min-h-[220px] max-h-[360px]">
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-white/5 sticky top-0 z-10 backdrop-blur-md">
            <label className="flex items-center gap-2 text-xs text-subtext cursor-pointer select-none">
              <input
                type="checkbox"
                checked={allChecked}
                onChange={toggleSelectAll}
                className="rounded border-white/20 bg-white/5 accent-gold cursor-pointer"
              />
              전체 선택 ({filteredMembers.length}명)
            </label>
            <span className="text-xs text-gold-light font-medium">
              {selectedIds.size}명 선택됨
            </span>
          </div>

          {filteredMembers.length === 0 ? (
            <div className="p-8 text-center text-subtext text-sm">
              이동시킬 수 있는 대상 회원이 없습니다.
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {filteredMembers.map((m) => {
                const currentGradeName = grades.find((g) => g.id === m.grade_id)?.name ?? "미배정";
                return (
                  <label
                    key={m.id}
                    className="flex items-center justify-between px-3 py-2.5 hover:bg-white/5 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(m.id)}
                        onChange={() => toggleSelectOne(m.id)}
                        className="rounded border-white/20 bg-white/5 accent-gold cursor-pointer"
                      />
                      <div>
                        <p className="text-white text-sm font-medium">{m.name ?? "(이름 없음)"}</p>
                        <p className="text-subtext text-xs">{m.email}</p>
                      </div>
                    </div>
                    <span className="text-xs text-subtext bg-white/5 border border-white/10 px-2 py-0.5 rounded-md">
                      현재: {currentGradeName}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* 모달 푸터 버튼 */}
        <div className="flex items-center justify-between pt-4 mt-4 border-t border-white/10">
          <span className="text-xs text-subtext">
            선택한 회원이 즉시 <span className="text-gold font-medium">[{targetGrade.name}]</span> 등급으로 이동됩니다.
          </span>
          <div className="flex gap-2">
            <GoldButton variant="ghost" size="sm" onClick={onClose} disabled={saving}>
              취소
            </GoldButton>
            <GoldButton size="sm" onClick={handleAssign} disabled={saving || selectedIds.size === 0}>
              {saving ? "이동 중..." : `${selectedIds.size}명 [${targetGrade.name}] 등급으로 이동`}
            </GoldButton>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
