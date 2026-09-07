"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import GoldButton from "@/components/ui/GoldButton";
import type { Profile, Program } from "@/types/database.types";

// 날짜를 직접 고르기 번거로운 흔한 기간을 빠르게 채워 넣는 옵션 — MemberDetail.tsx의
// 연장 select와 동일한 기간 구성(1/2/3/6개월, 1년, 평생)을 재사용했다.
const QUICK_PRESET_OPTIONS: { value: string; label: string }[] = [
  { value: "30", label: "1개월" },
  { value: "60", label: "2개월" },
  { value: "90", label: "3개월" },
  { value: "180", label: "6개월" },
  { value: "365", label: "1년" },
  { value: "lifetime", label: "평생" },
];

function formatDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

type MemberSummary = Pick<Profile, "id" | "name" | "email">;

interface SetExpiryModalProps {
  members: MemberSummary[];
  programs: Pick<Program, "id" | "name">[];
  onClose: () => void;
  onSaved: () => void;
}

/**
 * 회원 목록에서 상세 페이지로 들어가지 않고 바로 회원(복수)×프로그램(복수)의
 * 사용만료기간을 정확한 날짜로 설정하는 모달. 기존 "수동 프로그램 접근 부여"
 * 메커니즘(/api/admin/user-access POST, program_ids 배열 지원)을 그대로 재사용한다 —
 * 이미 결제한 구독이 있어도 없어도 똑같이 동작해서, 상세 페이지에 안 들어가고도
 * 여러 회원의 여러 프로그램 이용 권한/만료일을 한 번에 지정할 수 있다.
 */
export default function SetExpiryModal({ members, programs, onClose, onSaved }: SetExpiryModalProps) {
  const [programIds, setProgramIds] = useState<Set<string>>(new Set());
  const [expiresAt, setExpiresAt] = useState("");
  const [unlimited, setUnlimited] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quickPreset, setQuickPreset] = useState("30");

  const isBulk = members.length > 1;

  const saveLabelSuffix = (() => {
    const parts: string[] = [];
    if (isBulk) parts.push(`회원 ${members.length}명`);
    if (programIds.size > 1) parts.push(`프로그램 ${programIds.size}개`);
    return parts.length > 0 ? ` (${parts.join(" · ")})` : "";
  })();

  /** 오늘부터 선택한 기간만큼(또는 평생) 만료일 입력값을 한 번에 채워 넣는다. */
  function applyQuickPreset() {
    if (quickPreset === "lifetime") {
      setUnlimited(true);
      return;
    }
    setUnlimited(false);
    const target = new Date(Date.now() + Number(quickPreset) * 24 * 60 * 60 * 1000);
    setExpiresAt(formatDateInputValue(target));
  }

  function toggleProgram(id: string) {
    setProgramIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllPrograms() {
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
      const expiresAtValue = unlimited ? null : new Date(expiresAt).toISOString();

      // 회원×프로그램 조합 전체를 한 번의 API 호출(=한 번의 DB upsert)로 처리한다.
      // 예전엔 회원마다 fetch를 따로 보내 Promise.all로 병렬 실행했는데, 회원 수가 많으면
      // (예: 전체 선택 79명) 동시 요청이 몰려 일부가 조용히 실패하는 문제가 있었다
      // (2026-09-08 발견 — "일부 회원만 사용만료기간이 반영됨"). 단일 호출로 바꿔서
      // 이 경합 문제 자체를 없앴다.
      const res = await fetch("/api/admin/user-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_ids: members.map((m) => m.id),
          program_ids: Array.from(programIds),
          expires_at: expiresAtValue,
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
          {isBulk ? (
            <>선택한 회원 {members.length}명</>
          ) : (
            <>{members[0]?.name ?? members[0]?.email} 님</>
          )}
          의 프로그램 이용 만료일을 지정합니다. 회원·프로그램을 여러 개 선택하면 동일한
          만료일이 한 번에 적용됩니다.
        </p>
        {isBulk && (
          <div className="mb-3 max-h-20 overflow-y-auto rounded-lg bg-white/5 px-3 py-2 text-xs text-subtext">
            {members.map((m) => m.name ?? m.email).join(", ")}
          </div>
        )}

        <div className="flex items-center justify-between mb-1">
          <label className="text-subtext text-xs">프로그램 (복수 선택 가능)</label>
          <button
            type="button"
            onClick={toggleAllPrograms}
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

        <label className="text-subtext text-xs mb-1 block">빠른 설정 (오늘부터 기준)</label>
        <div className="flex items-center gap-2 mb-4">
          <select
            value={quickPreset}
            onChange={(e) => setQuickPreset(e.target.value)}
            className="input-dark text-xs py-1.5 px-2 flex-1"
          >
            {QUICK_PRESET_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <GoldButton type="button" variant="outline" size="sm" onClick={applyQuickPreset}>
            적용
          </GoldButton>
        </div>

        {error && <p className="text-red-400 text-xs mb-3">{error}</p>}

        <div className="flex gap-2">
          <GoldButton onClick={handleSave} disabled={saving} size="sm">
            {saving ? "저장 중..." : `설정${saveLabelSuffix}`}
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
