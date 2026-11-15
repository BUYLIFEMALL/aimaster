"use client";

import { useState } from "react";

// 외부 패키지(lucide-react) 의존성 없는 자체 인라인 SVG 아이콘 (빌드 안전성 100% 보장)
function IconCheck({ size = 14, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function IconShare2({ size = 14, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

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
          <IconCheck size={14} className="text-emerald-500" />
          <span className="text-emerald-600">링크 복사됨!</span>
        </>
      ) : (
        <>
          <IconShare2 size={14} />
          <span>샵 링크 공유</span>
        </>
      )}
    </button>
  );
}
