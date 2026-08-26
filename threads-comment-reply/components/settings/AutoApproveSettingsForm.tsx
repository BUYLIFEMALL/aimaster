"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setAutoApproveAction } from "@/lib/actions/settings";

export function AutoApproveSettingsForm({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  async function handleToggle(next: boolean) {
    setIsPending(true);
    try {
      await setAutoApproveAction(next);
      router.refresh();
    } finally {
      setIsPending(false);
    }
  }

  if (enabled) {
    return (
      <div className="space-y-3">
        <p className="text-sm font-semibold text-green-600">✅ 자동 게시 켜짐 — 새 댓글은 검토 없이 바로 게시됩니다.</p>
        <p className="text-xs text-gray-400">
          텔레그램을 연동해두면 자동 게시될 때마다 결과를 알려드려요. 문제가 생기면 언제든 꺼서
          다시 검토 후 게시 방식으로 되돌릴 수 있습니다.
        </p>
        <button
          type="button"
          onClick={() => handleToggle(false)}
          disabled={isPending}
          className="rounded-lg bg-red-50 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-100 disabled:opacity-60"
        >
          {isPending ? "끄는 중..." : "⏸ 자동 게시 끄기"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
        <p className="font-semibold">⚠️ 켜기 전에 확인해주세요</p>
        <ul className="mt-1 list-inside list-disc space-y-0.5">
          <li>AI가 맥락을 잘못 읽고 부적절한 답을 사람 확인 없이 그대로 공개 게시할 수 있어요.</li>
          <li>같은 링크가 반복 게시되면 Threads 스팸 탐지에 걸려 댓글이 숨김 처리되거나 계정 댓글 권한이 제한될 수 있어요.</li>
          <li>먼저 며칠간 "댓글 검토/게시" 화면(또는 텔레그램 승인 버튼)으로 AI 답글 품질을 확인한 뒤 켜는 것을 권장해요.</li>
        </ul>
      </div>
      <label className="flex items-start gap-2 text-xs text-gray-600">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="mt-0.5"
        />
        위 내용을 확인했고, 검토 없이 자동으로 게시되는 것에 동의합니다.
      </label>
      <button
        type="button"
        onClick={() => handleToggle(true)}
        disabled={isPending || !confirmed}
        className="rounded-lg bg-gradient-to-r from-neutral-800 to-black px-4 py-2 text-xs font-bold text-white hover:opacity-90 disabled:opacity-40"
      >
        {isPending ? "켜는 중..." : "⚡ 자동 게시 켜기"}
      </button>
    </div>
  );
}
