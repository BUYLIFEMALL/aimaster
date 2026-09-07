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
 * 회원 목록에서 상세 페이지로 들어가지 않고 바로 특정 프로그램의 사용만료기간을
 * 정확한 날짜로 설정하는 모달. 기존 "수동 프로그램 접근 부여" 메커니즘
 * (/api/admin/user-access POST, user_id+program_id upsert)을 그대로 재사용한다 —
 * 이미 결제한 구독이 있어도 없어도 똑같이 동작해서, 상세 페이지에 안 들어가고도
 * 프로그램 이용 권한/만료일을 즉시 지정할 수 있다.
 */
export default function SetExpiryModal({ member, programs, onClose, onSaved }: SetExpiryModalProps) {
  const [programId, setProgramId] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [unlimited, setUnlimited] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!programId) {
      setError("프로그램을 선택해주세요.");
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
          program_id: programId,
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
          {member.name ?? member.email} 님의 프로그램 이용 만료일을 지정합니다.
        </p>

        <label className="text-subtext text-xs mb-1 block">프로그램</label>
        <select
          value={programId}
          onChange={(e) => setProgramId(e.target.value)}
          className="input-dark w-full mb-3"
        >
          <option value="">프로그램 선택</option>
          {programs.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

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
            {saving ? "저장 중..." : "설정"}
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
