"use client";

import { useState } from "react";

export function ShareButtons({ shareUrl, shareText }: { shareUrl: string; shareText: string }) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title: shareText, url: shareUrl });
        return;
      } catch {
        // 사용자가 공유 시트를 취소한 경우 등 — 조용히 무시하고 복사 폴백으로 넘어가지 않는다.
        return;
      }
    }
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={handleShare}
        className="px-6 py-3 rounded-2xl bg-neutral-900 text-white font-bold hover:bg-neutral-800 transition-colors"
      >
        📤 결과 공유하기
      </button>
      {copied && <p className="text-xs text-neutral-400">링크가 복사되었어요!</p>}
    </div>
  );
}
