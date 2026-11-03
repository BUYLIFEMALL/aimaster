"use client";

import { useActionState, useState } from "react";
import { createIntakeLinkAction, type DeskState } from "@/lib/actions/desk";

export function IntakeLinkForm({ origin }: { origin: string }) {
  const [state, action, pending] = useActionState<DeskState, FormData>(createIntakeLinkAction, {});
  const [copied, setCopied] = useState(false);
  const url = state.token ? `${origin}/i/${state.token}` : null;
  return (
    <form action={action} className="mx-card space-y-3 p-5">
      <h2 className="mx-section-title">➕ 새 접수 링크 만들기</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-mx-muted" htmlFor="officeName">고객 화면에 보일 사무소 이름 *</label>
          <input id="officeName" name="officeName" required maxLength={60} placeholder="예: 백석 행복공인중개사사무소" className="mx-input" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-mx-muted" htmlFor="officePhone">사무소 전화(선택)</label>
          <input id="officePhone" name="officePhone" maxLength={30} placeholder="예: 031-123-4567" className="mx-input" />
        </div>
      </div>
      <button type="submit" disabled={pending} className="mx-btn-primary min-h-[44px] px-4 text-sm disabled:opacity-60">{pending ? "만드는 중…" : "링크 만들기"}</button>
      {state.error && <p className="text-sm text-mx-danger">{state.error}</p>}
      {url && (
        <div className="rounded-xl border border-mx-primary p-3 text-sm">
          <p className="mb-2 text-mx-text">{state.success}</p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 break-all rounded bg-mx-raised px-2 py-1 text-xs">{url}</code>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(url).then(() => setCopied(true))}
              className="mx-btn-ghost min-h-[40px] px-3 text-xs"
            >
              {copied ? "✅ 복사됨" : "📋 복사"}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
