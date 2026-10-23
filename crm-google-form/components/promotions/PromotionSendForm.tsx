"use client";

import { useState } from "react";
import { sendRcsPromotionAction, type PromotionSendResult } from "@/lib/actions/promotions";

export interface PromotionRecipient {
  id: string;
  name: string | null;
  phone: string;
}

export function PromotionSendForm({ recipients }: { recipients: PromotionRecipient[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [results, setResults] = useState<PromotionSendResult[] | null>(null);

  const allSelected = recipients.length > 0 && selected.size === recipients.length;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(recipients.map((r) => r.id)));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setResults(null);

    if (selected.size === 0) {
      setError("발송할 대상을 1명 이상 선택해주세요.");
      return;
    }
    if (!confirm(`선택한 ${selected.size}명에게 RCS 문자를 실제로 발송합니다. 계속할까요?`)) return;

    setIsSending(true);
    try {
      const formData = new FormData(e.currentTarget);
      selected.forEach((id) => formData.append("submissionIds", id));
      const result = await sendRcsPromotionAction(formData);
      if (result.error) setError(result.error);
      else setResults(result.results ?? []);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-mx-surface border border-mx-border rounded-2xl p-5 shadow-sm">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-bold text-mx-text">수신자 선택 ({selected.size}/{recipients.length}명)</p>
          <button type="button" onClick={toggleAll} className="text-xs font-semibold text-mx-link hover:underline">
            {allSelected ? "전체 해제" : "전체 선택"}
          </button>
        </div>
        <div className="max-h-56 space-y-1 overflow-y-auto rounded-xl bg-mx-raised p-3">
          {recipients.map((r) => (
            <label key={r.id} className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm hover:bg-mx-surface">
              <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleOne(r.id)} />
              <span className="font-medium text-mx-text">{r.name ?? "이름 없음"}</span>
              <span className="text-mx-muted">{r.phone}</span>
            </label>
          ))}
          {recipients.length === 0 && <p className="text-xs text-mx-muted py-4 text-center">연락처가 있는 접수 건이 없습니다.</p>}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold text-mx-text">메시지 ({"{name}"}은 수신자 이름으로 자동 치환)</label>
        <textarea
          name="messageText"
          required
          rows={3}
          placeholder="예: {name}님, 이번 주 한정 프로모션 안내드립니다..."
          className="input"
        />
      </div>

      {error && <p className="text-sm text-mx-danger bg-[#fff1f2] rounded-lg px-3 py-2">{error}</p>}

      <button
        type="submit"
        disabled={isSending}
        className="mx-btn-primary px-5"
      >
        {isSending ? "발송 중..." : `선택한 ${selected.size}명에게 RCS 발송`}
      </button>

      {results && (
        <div className="space-y-1 rounded-xl bg-mx-raised p-3 text-xs">
          <p className="font-semibold text-mx-text">
            발송 결과: 성공 {results.filter((r) => r.ok).length}건 / 실패 {results.filter((r) => !r.ok).length}건
          </p>
          {results.map((r, i) => (
            <p key={i} className={r.ok ? "text-mx-success" : "text-mx-danger"}>
              {r.name ?? "이름 없음"} ({r.phone}) — {r.ok ? "성공" : `실패: ${r.error}`}
            </p>
          ))}
        </div>
      )}
    </form>
  );
}
