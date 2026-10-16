"use client";

import Link from "next/link";

interface ApiKeyRequiredModalProps {
  missingLabels: string[];
  onClose: () => void;
}

export function ApiKeyRequiredModal({ missingLabels, onClose }: ApiKeyRequiredModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-orange-500/30 bg-[#14141b] p-6 shadow-2xl shadow-black/80"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">🔑</span>
          <h2 className="text-base font-black text-white">API 키 등록이 필요합니다</h2>
        </div>
        <p className="mb-5 text-xs text-zinc-300 leading-relaxed">
          이 기능을 실행하려면 본인의{" "}
          <span className="font-bold text-orange-400">{missingLabels.join(", ")}</span> API 키를
          먼저 등록해야 합니다. 타인의 API 키는 공유되지 않으며, 사용자 본인의 연동 키로만 안전하게 이용하실 수 있습니다.
        </p>
        <div className="flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-full text-xs font-semibold text-zinc-400 hover:text-white border border-[#2b2b3b] bg-[#1a1926] hover:bg-[#222130] transition-colors"
          >
            닫기
          </button>
          <Link
            href="/settings"
            className="px-5 py-2 rounded-full text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-md shadow-orange-500/20 transition-all"
          >
            키 설정하러 가기
          </Link>
        </div>
      </div>
    </div>
  );
}
