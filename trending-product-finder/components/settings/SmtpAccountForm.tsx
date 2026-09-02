"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSmtpAccountAction } from "@/lib/actions/smtpAccounts";
import type { SmtpProviderPreset } from "@/lib/constants";

export function SmtpAccountForm({ preset, onSuccess }: { preset: SmtpProviderPreset; onSuccess?: () => void }) {
  const router = useRouter();
  const [host, setHost] = useState(preset.host);
  const [port, setPort] = useState(preset.port);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsPending(true);
    try {
      const result = await createSmtpAccountAction(new FormData(e.currentTarget));
      if (result.error) {
        setError(result.error);
      } else {
        (e.target as HTMLFormElement).reset();
        setHost(preset.host);
        setPort(preset.port);
        router.refresh();
        onSuccess?.();
      }
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
      <p className="text-xs font-bold text-gray-800">+ {preset.label} 계정 추가</p>
      <input type="hidden" name="provider" value={preset.value} />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-700">계정 별칭</label>
          <input name="label" required placeholder={`예: ${preset.label} 메인`} className="input-sm w-full" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-700">발신자 표시 이름 (선택)</label>
          <input name="fromName" placeholder="예: 상품소싱 자동화" className="input-sm w-full" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-700">SMTP 호스트</label>
          <input
            name="smtpHost"
            required
            value={host}
            onChange={(e) => setHost(e.target.value)}
            placeholder="smtp.example.com"
            className="input-sm w-full"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-700">포트</label>
          <input
            name="smtpPort"
            type="number"
            required
            value={port}
            onChange={(e) => setPort(Number(e.target.value))}
            className="input-sm w-full"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-gray-700">로그인 계정 (이메일)</label>
        <input name="smtpUser" type="email" required autoComplete="off" placeholder="you@example.com" className="input-sm w-full" />
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-gray-700">비밀번호 (앱 비밀번호)</label>
        <input name="smtpPassword" type="password" required autoComplete="new-password" className="input-sm w-full" />
        <p className="mt-1 text-[11px] leading-snug text-gray-400">
          일반 로그인 비밀번호가 아니라, 각 메일 서비스의 2단계 인증 후 발급하는 <b>앱 비밀번호</b>를
          입력해야 합니다. 네이버는 메일 설정에서 POP3/SMTP 사용도 켜져 있어야 합니다.
        </p>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-sky-600 px-4 py-2 text-sm font-bold text-white hover:bg-sky-700 disabled:opacity-60"
      >
        {isPending ? "등록 중..." : "계정 등록"}
      </button>
    </form>
  );
}
