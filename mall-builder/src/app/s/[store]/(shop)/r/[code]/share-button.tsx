"use client";

import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";

export default function ResellerShareButton({ code, title }: { code: string; title: string }) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: `${title} - 공식 추천 상품을 확인해보세요! (파트너 코드: ${code})`,
          url,
        });
        return;
      } catch {
        // 취소 시 클립보드 복사로 대체
      }
    }

    if (navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white/90 px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 hover:text-blue-600 transition [data-mall-mode='dark']_:bg-slate-800 [data-mall-mode='dark']_:border-slate-700 [data-mall-mode='dark']_:text-slate-200 cursor-pointer"
    >
      {copied ? (
        <>
          <Check size={14} className="text-emerald-500" />
          <span className="text-emerald-600">링크 복사됨!</span>
        </>
      ) : (
        <>
          <Share2 size={14} />
          <span>샵 링크 공유</span>
        </>
      )}
    </button>
  );
}
