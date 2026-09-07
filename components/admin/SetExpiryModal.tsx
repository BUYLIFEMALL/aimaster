"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import GoldButton from "@/components/ui/GoldButton";
import type { Profile, Program } from "@/types/database.types";

interface SetExpiryModalProps {
  member: Profile;
  programs: Pick<Program, "id" | "name">[];
  onClose: () => void;
  onSaved: () => void;
}

/**
 * 회원 목록에서 상세 페이지로 들어가지 않고 바로 프로그램(복수 선택 가능)의
 * 사용만료기간을 정확한 날짜로 설정하는 모달. 기존 "수동 프로그램 접근 부여"
 * 메커니즘(/api/admin/user-access POST, program_ids 배열 지원)을 그대로 재사용한다 —
 * 이미 결제한 구독이 있어도 없어도 똑같이 동작해서, 상세 페이지에 안 들어가고도
 * 여러 프로그램의 이용 권한/만료일을 한 번에 지정할 수 있다.
 */
export default function SetExpiryModal({ member, programs, onClose, onSaved }: SetExpiryModalProps) {
  const [programIds, setProgramIds] = useState<Set<string>>(new Set());
  const [expiresAt, setExpiresAt] = useState("");
  const [unlimited, setUnlimited] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleProgram(id: string) {
    setProgramIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setProgramIds((prev) => (prev.size === programs.length ? new Set() : new Set(programs.map((p) => p.id))));
  }

  async function handleSave() {
    if (programIds.size === 0) {
      setError("프로그램을 1개 이상 선택해주세요.");
      return;
    }
    if (!unlimited && !expiresAt) {
      setError("만료일을 선택하거나 무제한을 체크해주세요.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/user-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: member.id,
          program_ids: Array.from(programIds),
          expires_at: unlimited ? null : new Date(expiresAt).toISOString(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "저장에 실패했습니다.");
        return;
      }
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-surface border border-white/10 rounded-2xl p-6 w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-white font-bold mb-1">사용만료기간 설정</h3>
        <p className="text-subtext text-xs mb-4">
          {member.name ?? member.email} 님의 프로그램 이용 만료일을 지정합니다. 여러 프로그램을 함께
          선택하면 동일한 만료일이 한 번에 적용됩니다.
        </p>

        <div className="flex items-center justify-between mb-1">
          <label className="text-subtext text-xs">프로그램 (복수 선택 가능)</label>
          <button
            type="button"
            onClick={toggleAll}
            className="text-xs text-gold/80 hover:text-gold hover:underline"
          >
            {programIds.size === programs.length ? "전체 해제" : "전체 선택"}
          </button>
        </div>
        <div className="max-h-48 overflow-y-auto rounded-xl border border-white/10 bg-white/5 p-2 mb-3 space-y-0.5">
          {programs.length === 0 ? (
            <p className="text-subtext text-xs px-2 py-1.5">선택 가능한 프로그램이 없습니다.</p>
          ) : (
            programs.map((p) => (
              <label
                key={p.id}
                className="flex items-center gap-2 text-sm text-white px-2 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={programIds.has(p.id)}
                  onChange={() => toggleProgram(p.id)}
                  className="rounded border-white/20 bg-white/5 accent-gold"
                />
                {p.name}
              </label>
            ))
          )}
        </div>

        <label className="text-subtext text-xs mb-1 block">만료일</label>
        <input
          type="date"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
          disabled={unlimited}
          className="input-dark w-full mb-2 disabled:opacity-40"
        />
        <label className="flex items-center gap-2 text-subtext text-xs mb-4">
          <input
            type="checkbox"
            checked={unlimited}
            onChange={(e) => setUnlimited(e.target.checked)}
            className="rounded border-white/20 bg-white/5 accent-gold"
          />
          무제한(평생)
        </label>

        {error && <p className="text-red-400 text-xs mb-3">{error}</p>}

        <div className="flex gap-2">
          <GoldButton onClick={handleSave} disabled={saving} size="sm">
            {saving ? "저장 중..." : `설정${programIds.size > 1 ? ` (${programIds.size}개)` : ""}`}
          </GoldButton>
          <GoldButton variant="ghost" size="sm" onClick={onClose}>
            취소
          </GoldButton>
        </div>
      </div>
    </div>,
    document.body,
  );
}
