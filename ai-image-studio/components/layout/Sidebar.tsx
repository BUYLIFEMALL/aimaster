"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_VERSION } from "@/lib/version";
import { signOutAction } from "@/lib/actions/auth";

const FLOW_STEPS = [
  {
    step: 1,
    href: "/dashboard",
    icon: "🎨",
    label: "이미지 생성 작업실",
    description: "AI 프롬프트 최적화 & 이미지 생성",
  },
  {
    step: 2,
    href: "/gallery",
    icon: "🖼️",
    label: "작업 결과 갤러리",
    description: "생성 이력 확인 및 고화질 다운로드",
  },
];

const UTILITY_ITEMS = [
  { href: "/prompts", icon: "📝", label: "화풍 프롬프트 관리" },
  { href: "/settings", icon: "🔑", label: "API키등록·플랫폼연동" },
];

export function Sidebar({ userEmail = "" }: { userEmail?: string }) {
  const pathname = usePathname();

  return (
    <aside className="flex w-full flex-col border-b border-zinc-800/80 bg-[#09090b] p-4 md:w-64 border-r shrink-0 md:sticky md:top-0 md:h-screen selection:bg-amber-500/30">
      <div className="md:min-h-0 md:overflow-y-auto space-y-4">
        {/* Brand Header */}
        <div className="px-2">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500 text-zinc-950 font-black text-sm shadow-md shadow-amber-500/20">
              🎨
            </span>
            <span className="text-base font-bold text-white tracking-tight">AI 이미지 스튜디오</span>
          </div>
          <div className="flex items-center justify-between mt-1 px-0.5">
            <span className="text-[11px] font-mono text-zinc-500">{APP_VERSION}</span>
            <a
              href="https://www.buylife.xyz/programs"
              className="text-[11px] text-zinc-400 hover:text-amber-400 transition-colors"
            >
              ← 다른 프로그램
            </a>
          </div>
        </div>

        {/* 📖 연동 & 사용 매뉴얼 Banner Button */}
        <div className="px-1">
          <Link
            href="/guide"
            className={`group flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold transition-all ${
              pathname === "/guide"
                ? "bg-amber-500/20 border border-amber-500/50 text-amber-300 shadow-lg shadow-amber-500/10"
                : "bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/25 text-amber-300/90 hover:border-amber-500/50 hover:bg-amber-500/15 hover:text-amber-200"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-base group-hover:scale-110 transition-transform">📖</span>
              <div>
                <p className="font-bold">연동 & 사용 매뉴얼</p>
                <p className="text-[10px] text-amber-400/70 font-normal">5단계 제작 & 프롬프트 팁</p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/30">
              가이드
            </span>
          </Link>
        </div>

        {/* Pipeline Navigation */}
        <nav className="relative flex flex-col pt-1">
          {FLOW_STEPS.map((item, idx) => {
            const isActive = pathname?.startsWith(item.href);
            const isLast = idx === FLOW_STEPS.length - 1;
            return (
              <Link key={item.href} href={item.href} className="group relative flex gap-3 pb-2.5">
                {/* 스텝 번호 + 연결선 */}
                <div className="flex flex-col items-center">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-black transition-all ${
                      isActive
                        ? "bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/30"
                        : "bg-zinc-900 border border-zinc-800 text-zinc-400 group-hover:bg-zinc-800 group-hover:text-zinc-200"
                    }`}
                  >
                    {item.step}
                  </span>
                  {!isLast && <span className="mt-1 w-px flex-1 bg-zinc-800" />}
                </div>

                {/* 라벨 + 설명 */}
                <div
                  className={`min-w-0 flex-1 rounded-xl px-2.5 py-1.5 transition-all ${
                    isActive
                      ? "bg-amber-500/10 border border-amber-500/30 text-amber-400"
                      : "text-zinc-300 hover:bg-zinc-900/60"
                  }`}
                >
                  <p className={`text-xs font-bold ${isActive ? "text-amber-400" : "text-zinc-200"}`}>
                    {item.icon} {item.label}
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-0.5 line-clamp-1">{item.description}</p>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* 화풍 프롬프트 게시판 관리 Section */}
        <div className="border-t border-zinc-800/80 pt-3 space-y-1">
          <p className="px-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
            프롬프트 데이터 관리
          </p>
          <Link
            href="/prompts"
            className={`group flex items-center justify-between rounded-xl px-3 py-2 text-xs font-bold transition-all ${
              pathname?.startsWith("/prompts")
                ? "bg-amber-500/10 border border-amber-500/40 text-amber-300 shadow-md shadow-amber-500/10"
                : "bg-zinc-900/40 border border-zinc-800/80 text-zinc-300 hover:border-amber-500/30 hover:bg-zinc-900 hover:text-amber-300"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm">📝</span>
              <div>
                <p className="text-xs font-bold text-zinc-200 group-hover:text-amber-300 transition-colors">
                  화풍 프롬프트 게시판
                </p>
                <p className="text-[10px] text-zinc-500 font-normal">
                  예시 프롬프트 추가·수정
                </p>
              </div>
            </div>
            <span className="rounded bg-zinc-800 text-zinc-400 px-1.5 py-0.5 text-[10px] font-bold border border-zinc-700">
              관리
            </span>
          </Link>
        </div>

        {/* API키등록·플랫폼연동 Block */}
        <div className="border-t border-zinc-800/80 pt-3">
          {UTILITY_ITEMS.filter((item) => item.href !== "/prompts").map((item) => {
            const isActive = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-amber-500/10 text-amber-400 font-bold border border-amber-500/30"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* User Session Footer */}
      <div className="mt-auto shrink-0 border-t border-zinc-800/80 pt-3">
        <p className="mb-2 truncate px-2 text-[11px] font-medium text-zinc-400 font-mono">
          {userEmail || "세션 연결됨"}
        </p>
        <form action={signOutAction}>
          <button
            type="submit"
            className="block w-full rounded-lg px-2 py-1.5 text-left text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
          >
            로그아웃
          </button>
        </form>
      </div>
    </aside>
  );
}
