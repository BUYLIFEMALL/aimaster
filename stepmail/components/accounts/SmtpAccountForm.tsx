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
    <form onSubmit={handleSubmit} className="space-y-4 bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
      <h3 className="text-sm font-bold text-gray-800">+ {preset.label} 계정 추가</h3>
      <input type="hidden" name="provider" value={preset.value} />

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">계정 별칭</label>
          <input name="label" required placeholder={`예: ${preset.label} 메인`} className="input" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">발신자 표시 이름 (선택)</label>
          <input name="fromName" placeholder="예: AI Master" className="input" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">SMTP 호스트</label>
          <input
            name="smtpHost"
            required
            value={host}
            onChange={(e) => setHost(e.target.value)}
            placeholder="smtp.example.com"
            className="input"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">포트</label>
          <input
            name="smtpPort"
            type="number"
            required
            value={port}
            onChange={(e) => setPort(Number(e.target.value))}
            className="input"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">로그인 계정 (이메일)</label>
        <input name="smtpUser" type="email" required autoComplete="off" placeholder="you@example.com" className="input" />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">비밀번호 (앱 비밀번호)</label>
        <input
          name="smtpPassword"
          type="password"
          required
          autoComplete="new-password"
          className="input"
        />
        <p className="mt-1 text-xs text-gray-400">
          일반 로그인 비밀번호가 아니라, 각 메일 서비스의 2단계 인증 후 발급하는 <b>앱 비밀번호</b>를
          입력해야 합니다. 네이버는 메일 설정에서 POP3/SMTP 사용도 켜져 있어야 합니다.
        </p>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-60 text-white font-bold py-3 px-4 rounded-xl transition-all"
      >
        {isPending ? "등록 중..." : "계정 등록"}
      </button>
    </form>
  );
}
