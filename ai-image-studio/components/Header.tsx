"use client";

import Link from "next/link";
import { Sparkles, Key, Image, History, ExternalLink } from "lucide-react";

export function Header() {
  const mainAppUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.buylife.xyz";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-300 text-zinc-950 shadow-lg shadow-amber-500/20">
              <Sparkles className="h-5 w-5 stroke-[2.5]" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">
              AI Image Studio <span className="text-xs font-normal text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">이미지 자동화</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-zinc-200 hover:text-amber-400 hover:bg-zinc-900 rounded-lg transition-colors"
            >
              <Image className="h-4 w-4" />
              이미지 생성
            </Link>
            <Link
              href="/gallery"
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-zinc-400 hover:text-amber-400 hover:bg-zinc-900 rounded-lg transition-colors"
            >
              <History className="h-4 w-4" />
              생성 갤러리
            </Link>
            <Link
              href="/settings"
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-zinc-400 hover:text-amber-400 hover:bg-zinc-900 rounded-lg transition-colors"
            >
              <Key className="h-4 w-4" />
              API키등록·플랫폼연동
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={mainAppUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg transition-colors"
          >
            <span>AIMaster 메인</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </header>
  );
}
