"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setBotEnabledAction } from "@/lib/dmApp/actions/settings";
import { formatDateTimeKo } from "@/lib/formatDate";

/**
 * 계정 연결 + 웹훅 등록과 별개로, 실제로 수신 DM에 응답을 시작할지는 사용자가 명시적으로
 * 켜야 한다(youtube-auto-reply/instagram-comment-reply의 "예약 모니터링 시작"과 같은 안전장치
 * 철학 — 다만 여긴 웹훅 기반이라 주기 선택 없이 켜고 끄는 토글 하나뿐이다).
 */
export function BotEnabledForm({ enabled, startedAt }: { enabled: boolean; startedAt: string | null }) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleToggle(next: boolean) {
    setError(null);
    setIsPending(true);
    try {
      const result = await setBotEnabledAction(next);
      if (result.error) setError(result.error);
      else router.refresh();
    } finally {
      setIsPending(false);
    }
  }

  if (enabled) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-ig-success">✅ 봇 활성화됨 — 새 DM이 오면 자동으로 초안을 만들어요.</p>
        {startedAt && (
          <p className="text-xs text-ig-muted">이 시점 이후 수신된 DM만 처리: {formatDateTimeKo(startedAt)}</p>
        )}
        <p className="text-xs text-ig-muted">
          자동으로는 답장 초안까지만 만들고, 실제 발송은 "DM 검토/발송" 화면이나 텔레그램 버튼에서
          직접 승인해야 합니다(단, 아래 "자동 발송"을 별도로 켠 경우는 예외).
        </p>
        <button
          type="button"
          onClick={() => handleToggle(false)}
          disabled={isPending}
          className="rounded-lg bg-ig-danger/10 px-4 py-2 text-xs font-bold text-ig-danger hover:bg-ig-danger/15 disabled:opacity-60"
        >
          {isPending ? "끄는 중..." : "⏸ 봇 비활성화"}
        </button>
        {error && <p className="text-xs text-ig-danger">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-ig-muted">
        웹훅이 등록되어 있어도, 이 스위치를 켜야 실제로 수신 DM에 응답을 시작합니다. 계정 연결과
        웹훅 등록을 먼저 마친 뒤 켜주세요.
      </p>
      <button
        type="button"
        onClick={() => handleToggle(true)}
        disabled={isPending}
        className="px-4 py-2 rounded-full text-sm font-bold text-white disabled:opacity-60 bg-ig-primary hover:bg-ig-primary-hover"
      >
        {isPending ? "켜는 중..." : "▶ 봇 활성화"}
      </button>
      {error && <p className="text-xs text-ig-danger">{error}</p>}
    </div>
  );
}
