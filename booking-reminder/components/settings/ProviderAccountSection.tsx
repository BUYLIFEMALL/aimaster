"use client";

import { useState } from "react";
import { SmtpAccountForm } from "@/components/settings/SmtpAccountForm";
import { SmtpAccountCard, type SmtpAccountData } from "@/components/settings/SmtpAccountCard";
import type { SmtpProviderPreset } from "@/lib/constants";

// 플랫폼(구글/네이버/기타)별로 섹션을 나누고, 각 섹션 안에서 여러 계정을 등록할 수 있게 한다
// (stepmail과 동일한 패턴).
export function ProviderAccountSection({
  preset,
  accounts,
}: {
  preset: SmtpProviderPreset;
  accounts: SmtpAccountData[];
}) {
  const [showForm, setShowForm] = useState(false);

  return (
    <section className="bg-gray-50/60 border border-gray-100 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-gray-900">
          {preset.label}
          <span className="ml-2 text-xs font-semibold text-gray-400">{accounts.length}개 등록됨</span>
        </h3>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="text-xs font-bold text-blue-600 hover:underline"
        >
          {showForm ? "닫기" : `+ 계정 추가`}
        </button>
      </div>

      {accounts.length > 0 && (
        <div className="space-y-3">
          {accounts.map((account) => (
            <SmtpAccountCard key={account.id} account={account} />
          ))}
        </div>
      )}

      {accounts.length === 0 && !showForm && (
        <p className="text-xs text-gray-400">등록된 {preset.label} 계정이 없습니다.</p>
      )}

      {showForm && <SmtpAccountForm preset={preset} onSuccess={() => setShowForm(false)} />}
    </section>
  );
}
