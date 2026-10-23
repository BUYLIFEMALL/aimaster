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
      <p className="text-xs font-semibold text-ig-muted mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 break-all rounded bg-ig-raised px-2 py-1.5 text-xs text-ig-text">{value}</code>
        <button
          type="button"
          onClick={handleCopy}
          className="shrink-0 rounded-lg border border-ig-border bg-ig-surface px-3 py-1.5 text-xs font-semibold text-ig-muted hover:bg-ig-hover"
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
      <p className="text-sm text-ig-muted">
        Meta App Dashboard의 Instagram 제품 → Webhooks 설정에서 아래 콜백 URL과 확인 토큰(Verify
        Token)을 그대로 등록하고, <strong className="text-ig-text">messages</strong> 필드를
        구독해주세요.
      </p>
      <CopyRow label="콜백 URL (Callback URL)" value={callbackUrl} />
      <p className="rounded-lg border border-ig-warn/40 bg-ig-warn/10 px-3 py-2 text-xs leading-relaxed text-ig-warn">
        예전 「INSTA DM답변 자동화」(instagram-dm-reply) 주소로 웹훅을 등록하셨다면, Meta 앱의 Webhooks 화면에서
        <b> 콜백 URL과 확인 토큰 두 값 모두</b> 위·아래의 새 값으로 바꿔 [확인 및 저장]을 눌러 주세요. 프로그램이 합쳐지면서
        확인 토큰도 바뀌었습니다(옛 주소로 오는 DM은 당분간 자동으로 넘겨받습니다).
      </p>
      <CopyRow label="확인 토큰 (Verify Token)" value={verifyToken} />
    </div>
  );
}
