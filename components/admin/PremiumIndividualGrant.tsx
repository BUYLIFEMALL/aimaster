"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import GoldButton from "@/components/ui/GoldButton";
import GoldGradientText from "@/components/ui/GoldGradientText";
import { formatDate } from "@/lib/utils/format";

interface PremiumIndividualGrantProps {
  memberId: string;
  /** 공개 중인 프리미엄 뱃지 프로그램 */
  programs: { id: string; name: string }[];
  /** 이 회원의 개별 프리미엄 권한 */
  grants: { program_id: string; expires_at: string | null; program_name: string }[];
}

/** 골드·VIP 회원에게 프리미엄 프로그램을 골라 만료일까지 열어 준다. 등급과 다른 프로그램 기간은 바뀌지 않는다. */
export default function PremiumIndividualGrant({ memberId, programs, grants }: PremiumIndividualGrantProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [date, setDate] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function grant() {
    setPending(true);
    setError(null);
    const res = await fetch("/api/admin/premium-access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: memberId,
        program_ids: Array.from(selected),
        // 고른 날 끝까지 사용할 수 있게 한국 시간 23:59:59로 저장한다
        expires_at: new Date(`${date}T23:59:59+09:00`).toISOString(),
      }),
    });
    if (res.ok) {
      setSelected(new Set());
      setDate("");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "부여하지 못했습니다.");
    }
    setPending(false);
  }

  async function revoke(programId: string) {
    setPending(true);
    setError(null);
    const res = await fetch("/api/admin/premium-access", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: memberId, program_id: programId }),
    });
    if (res.ok) {
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "회수하지 못했습니다.");
    }
    setPending(false);
  }

  return (
    <GlassCard>
      <h2 className="text-lg font-bold text-white mb-1">
        💎 개별 <GoldGradientText>프리미엄 권한</GoldGradientText>
      </h2>
      <p className="text-subtext text-xs mb-4">
        이 회원만 고른 프로그램을 만료일까지 결제 없이 사용합니다. 회원 등급과 다른 프로그램 기간은 바뀌지 않습니다.
      </p>

      {grants.length > 0 && (
        <div className="space-y-2 mb-4">
          {grants.map((g) => {
            const isExpired = !!g.expires_at && new Date(g.expires_at) <= new Date();
            return (
              <div key={g.program_id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/5">
                <div>
                  <span className="text-white text-sm font-medium">{g.program_name}</span>
                  <span className={`text-xs ml-3 ${isExpired ? "text-red-400" : "text-subtext"}`}>
                    {isExpired ? "만료됨" : "만료"} {g.expires_at ? formatDate(g.expires_at) : "-"}
                  </span>
                </div>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => revoke(g.program_id)}
                  title="회수"
                  className="text-red-400 hover:text-red-300 p-1.5 rounded hover:bg-red-500/10 transition-colors disabled:opacity-50"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="max-h-48 overflow-y-auto rounded-xl border border-white/10 bg-white/5 p-2 mb-3 space-y-0.5">
        {programs.map((p) => (
          <label key={p.id} className="flex items-center gap-2 text-sm text-white px-2 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer">
            <input
              type="checkbox"
              checked={selected.has(p.id)}
              onChange={() => toggle(p.id)}
              className="rounded border-white/20 bg-white/5 accent-gold"
            />
            {p.name}
          </label>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-subtext">선택 {selected.size}개 · 만료일</span>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="input-dark text-xs py-1.5 px-2 w-[140px]"
        />
        <GoldButton type="button" size="sm" disabled={pending || selected.size === 0 || !date} onClick={grant}>
          {pending ? "처리 중..." : "권한 부여"}
        </GoldButton>
      </div>
      {error && <p className="text-red-400 text-xs mt-3">{error}</p>}
    </GlassCard>
  );
}
