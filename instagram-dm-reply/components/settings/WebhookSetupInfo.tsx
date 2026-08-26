"use client";

import { useState } from "react";

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 클립보드 권한이 없는 브라우저는 조용히 무시 — 값은 화면에 그대로 보이므로 수동 복사 가능
    }
  }

  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 break-all rounded bg-gray-100 px-2 py-1.5 text-xs text-gray-800">{value}</code>
        <button
          type="button"
          onClick={handleCopy}
          className="shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
        >
          {copied ? "복사됨" : "복사"}
        </button>
      </div>
    </div>
  );
}

export function WebhookSetupInfo({ callbackUrl, verifyToken }: { callbackUrl: string; verifyToken: string }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">
        Meta App Dashboard의 Instagram 제품 → Webhooks 설정에서 아래 콜백 URL과 확인 토큰(Verify
        Token)을 그대로 등록하고, <strong className="text-gray-700">messages</strong> 필드를
        구독해주세요.
      </p>
      <CopyRow label="콜백 URL (Callback URL)" value={callbackUrl} />
      <CopyRow label="확인 토큰 (Verify Token)" value={verifyToken} />
    </div>
  );
}
