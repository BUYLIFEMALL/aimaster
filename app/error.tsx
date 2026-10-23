"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Home, RefreshCw, AlertTriangle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Error]", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      {/* BG glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-500/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative text-center max-w-lg">
        {/* Icon */}
        <div className="mb-8 flex justify-center">
          <div className="w-24 h-24 rounded-full bg-red-500/10 border-2 border-red-500/20 flex items-center justify-center">
            <AlertTriangle size={40} className="text-red-400" />
          </div>
        </div>

        <h1 className="text-2xl md:text-3xl font-bold text-white mb-3">
          문제가 발생했습니다
        </h1>
        <p className="text-subtext text-lg mb-10">
          일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-gold to-gold-light text-black font-bold text-sm transition-all hover:shadow-lg hover:shadow-gold/20"
          >
            <RefreshCw size={16} />
            다시 시도
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-white/10 text-white font-medium text-sm hover:bg-white/5 transition-all"
          >
            <Home size={16} />
            홈으로 가기
          </Link>
        </div>

        {error.digest && (
          <p className="mt-10 text-subtext text-xs">
            오류 코드: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
