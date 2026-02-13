"use client";

import Link from "next/link";
import { Home, ArrowLeft, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      {/* BG glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gold/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative text-center max-w-lg">
        {/* 404 */}
        <div className="mb-8">
          <span className="text-[120px] md:text-[160px] font-black leading-none gold-text select-none">
            404
          </span>
        </div>

        <h1 className="text-2xl md:text-3xl font-bold text-white mb-3">
          페이지를 찾을 수 없습니다
        </h1>
        <p className="text-subtext text-lg mb-10">
          요청하신 페이지가 존재하지 않거나 이동되었습니다.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-gold to-gold-light text-black font-bold text-sm transition-all hover:shadow-lg hover:shadow-gold/20"
          >
            <Home size={16} />
            홈으로 가기
          </Link>
          <Link
            href="/programs"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-white/10 text-white font-medium text-sm hover:bg-white/5 transition-all"
          >
            <Search size={16} />
            프로그램 둘러보기
          </Link>
        </div>

        <div className="mt-12">
          <button
            onClick={() => history.back()}
            className="inline-flex items-center gap-1 text-subtext text-sm hover:text-white transition-colors"
          >
            <ArrowLeft size={14} />
            이전 페이지로 돌아가기
          </button>
        </div>
      </div>
    </div>
  );
}
