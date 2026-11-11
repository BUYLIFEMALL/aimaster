"use client";

import { useState } from "react";
import { X, HardDrive } from "lucide-react";
import type { Profile } from "@/types/database.types";

export interface MemberStorageRow {
  user_id: string;
  quota_bytes: number | null;
  retention_days: number | null;
  unlimited_retention: boolean;
  source: "exempt" | "admin" | "subscription" | "grade" | "free";
  plan_name: string | null;
  plan_expires_at: string | null;
  override_until: string | null;
  used_bytes: number;
  measured_at: string | null;
}

type OverrideFields = {
  storage_quota_override_bytes?: number | null;
  storage_retention_override_days?: number | null;
  storage_retention_override_unlimited?: boolean | null;
  storage_override_until?: string | null;
  storage_override_note?: string | null;
};

/** 관리자: 회원별 저장 용량·보관 기간 수동 지정. 빈칸 = 자동(저장 구독·등급·기본). */
export default function StorageOverrideModal({
  members,
  onClose,
  onSaved,
}: {
  members: Profile[];
  onClose: () => void;
  onSaved: (rows: MemberStorageRow[]) => void;
}) {
  const first = (members[0] ?? {}) as Profile & OverrideFields;
  const single = members.length === 1;
  const [quotaGb, setQuotaGb] = useState(
    single && first.storage_quota_override_bytes ? String(Math.round(first.storage_quota_override_bytes / 1024 ** 3)) : "",
  );
  const [mode, setMode] = useState<"auto" | "days" | "unlimited">(
    single && first.storage_retention_override_unlimited ? "unlimited" : single && first.storage_retention_override_days ? "days" : "auto",
  );
  const [days, setDays] = useState(single && first.storage_retention_override_days ? String(first.storage_retention_override_days) : "365");
  const [until, setUntil] = useState(single && first.storage_override_until ? first.storage_override_until.slice(0, 10) : "");
  const [note, setNote] = useState(single ? first.storage_override_note ?? "" : "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(reset: boolean) {
    setPending(true);
    setError(null);
    const res = await fetch("/api/admin/storage-override", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        reset
          ? { user_ids: members.map((m) => m.id), quota_gb: null, retention_days: null, unlimited_retention: false, until: null, note: null }
          : {
              user_ids: members.map((m) => m.id),
              quota_gb: quotaGb.trim() === "" ? null : Number(quotaGb),
              retention_days: mode === "days" ? Number(days) : null,
              unlimited_retention: mode === "unlimited",
              until: until || null,
              note,
            },
      ),
    });
    const json = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) {
      setError(json.error ?? "저장하지 못했습니다.");
      return;
    }
    onSaved(json.rows ?? []);
    onClose();
  }

  const input = "w-full rounded-lg bg-white/5 border border-white/15 px-3 py-2 text-sm text-white placeholder:text-subtext/60";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="glass-card w-full max-w-md p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-white font-bold flex items-center gap-2">
            <HardDrive size={16} className="text-gold" /> 저장공간 수동 지정
          </h2>
          <button type="button" onClick={onClose} className="text-subtext hover:text-white" aria-label="닫기">
            <X size={16} />
          </button>
        </div>
        <p className="text-subtext text-xs break-keep">
          {single ? `${first.name ?? first.email}` : `선택한 회원 ${members.length}명`} — 빈칸은 자동(저장 구독·등급·기본 1GB·30일)을 따릅니다. 관리자·시험 계정은 원래 무제한입니다.
        </p>
        <label className="block text-xs text-subtext">
          용량(GB)
          <input className={input} inputMode="decimal" placeholder="비우면 자동" value={quotaGb} onChange={(e) => setQuotaGb(e.target.value)} />
        </label>
        <div className="text-xs text-subtext space-y-1">
          보관 기간
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["auto", "자동"],
                ["days", "일수 지정"],
                ["unlimited", "자동 삭제 없음"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setMode(k)}
                className={`rounded-full px-3 py-1 border ${mode === k ? "border-gold/70 bg-gold/15 text-gold" : "border-white/15 text-subtext"}`}
              >
                {label}
              </button>
            ))}
          </div>
          {mode === "days" && <input className={input} inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value)} placeholder="예: 365" />}
        </div>
        <label className="block text-xs text-subtext">
          적용 기한(이 날짜가 지나면 자동으로 돌아감)
          <input type="date" className={input} value={until} onChange={(e) => setUntil(e.target.value)} />
        </label>
        <label className="block text-xs text-subtext">
          메모
          <input className={input} value={note} onChange={(e) => setNote(e.target.value)} placeholder="예: 수강생 혜택, 결제 문의 보상" />
        </label>
        {error && <p className="text-red-400 text-xs">{error}</p>}
        <div className="flex gap-2 justify-end">
          <button type="button" disabled={pending} onClick={() => save(true)} className="rounded-lg border border-white/15 px-3 py-2 text-xs text-subtext hover:text-white disabled:opacity-40">
            자동으로 되돌리기
          </button>
          <button type="button" disabled={pending} onClick={() => save(false)} className="rounded-lg bg-gold px-4 py-2 text-xs font-bold text-black disabled:opacity-40">
            {pending ? "저장 중…" : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}
