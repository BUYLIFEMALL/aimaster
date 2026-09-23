"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, Image as ImageIcon, History, Key, ExternalLink, ArrowLeft } from "lucide-react";

const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL || "https://www.buylife.xyz";

const FLOW_STEPS = [
  {
    step: 1,
    href: "/dashboard",
    icon: ImageIcon,
    label: "이미지 생성 작업실",
    description: "AI 프롬프트 최적화 & 이미지 생성",
  },
];

const SECONDARY_ITEMS = [
  {
    href: "/gallery",
    icon: History,
    label: "작업 결과 갤러리",
    description: "생성 결과 보관함 & 고화질 다운로드",
  },
];

const UTILITY_ITEMS = [
  {
    href: "/settings",
    icon: Key,
    label: "API키등록·플랫폼연동",
    description: "OpenAI / Fal / Gemini / Stability",
  },
];

export function Sidebar({ userEmail = "guest@buylife.xyz" }: { userEmail?: string }) {
  const pathname = usePathname();

  return (
    <aside className="flex w-full flex-col border-b border-zinc-800 bg-zinc-950 p-5 md:min-h-screen md:w-64 md:justify-between md:border-b-0 md:border-r shrink-0">
      <div className="space-y-6">
        {/* Brand Header */}
        <div className="space-y-2 border-b border-zinc-800/80 pb-4">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-300 text-zinc-950 shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform">
              <Sparkles className="h-5 w-5 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-base font-bold text-white tracking-tight block">
                AI 이미지 스튜디오
              </span>
              <span className="text-[10px] font-semibold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                AIMaster 서브프로그램
              </span>
            </div>
          </Link>
          <a
            href={`${MAIN_SITE_URL}/programs`}
            className="flex items-center gap-1 px-1 text-xs text-zinc-400 hover:text-amber-400 transition-colors pt-1"
          >
            <ArrowLeft className="h-3 w-3" />
            <span>다른 프로그램 보기</span>
          </a>
        </div>

        {/* Workflow Navigation */}
        <div className="space-y-4">
          <div className="px-1 text-[11px] font-bold text-zinc-300 uppercase tracking-wider">
            작업 단계 (Workflow)
          </div>
          <nav className="space-y-1.5">
            {FLOW_STEPS.map((item) => {
              const isActive = pathname?.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group flex items-start gap-3 p-3 rounded-xl border transition-all ${
                    isActive
                      ? "border-amber-500/40 bg-amber-500/10 text-white shadow-md shadow-amber-500/5"
                      : "border-transparent bg-zinc-900/40 text-zinc-300 hover:border-zinc-800 hover:bg-zinc-900 hover:text-white"
                  }`}
                >
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                    isActive ? "bg-amber-400 text-zinc-950 font-black" : "bg-zinc-800 text-zinc-400 group-hover:bg-zinc-700"
                  }`}>
                    {item.step}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <Icon className={`h-3.5 w-3.5 ${isActive ? "text-amber-400" : "text-zinc-400"}`} />
                      <span className={isActive ? "text-amber-400" : "text-zinc-200"}>{item.label}</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-0.5 line-clamp-1">{item.description}</p>
                  </div>
                </Link>
              );
            })}
          </nav>

          {/* Secondary Items */}
          <div className="pt-2">
            <div className="px-1 mb-2 text-[11px] font-bold text-zinc-300 uppercase tracking-wider">
              결과 관리 (Gallery)
            </div>
            <div className="space-y-1">
              {SECONDARY_ITEMS.map((item) => {
                const isActive = pathname?.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                      isActive
                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold"
                        : "text-zinc-300 hover:bg-zinc-900 hover:text-white border border-transparent"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-amber-400" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Utility Items */}
          <div className="pt-2 border-t border-zinc-800/80">
            <div className="px-1 mb-2 text-[11px] font-bold text-zinc-300 uppercase tracking-wider">
              설정 및 연동 (Settings)
            </div>
            <div className="space-y-1">
              {UTILITY_ITEMS.map((item) => {
                const isActive = pathname?.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                      isActive
                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold"
                        : "text-zinc-300 hover:bg-zinc-900 hover:text-white border border-transparent"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-amber-400" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar Footer */}
      <div className="mt-8 border-t border-zinc-800/80 pt-4 space-y-3">
        <div className="px-2">
          <span className="text-[10px] text-zinc-400 block font-mono">접속 계정:</span>
          <p className="text-xs text-zinc-300 truncate font-semibold">{userEmail}</p>
        </div>

        <a
          href={MAIN_SITE_URL}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-xs font-bold text-zinc-200 border border-zinc-800 transition-colors"
        >
          <span>AIMaster 메인 사이트</span>
          <ExternalLink className="h-3.5 w-3.5 text-amber-400" />
        </a>
      </div>
    </aside>
  );
}
