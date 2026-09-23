"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "https://buylife.xyz";

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
  { href: "/settings", icon: "🔑", label: "API키등록·플랫폼연동" },
];

export function Sidebar({ userEmail = "buylifemall@naver.com" }: { userEmail?: string }) {
  const pathname = usePathname();

  return (
    <aside className="flex w-full flex-col border-b border-zinc-800 bg-zinc-950 p-4 md:min-h-screen md:w-64 md:justify-between md:border-b-0 md:border-r shrink-0">
      <div>
        <div className="mb-4 md:mb-6 px-2">
          <div className="text-lg font-bold text-white tracking-tight">AI 이미지 스튜디오</div>
          <a
            href={`${MAIN_SITE_URL}/programs`}
            className="block text-xs text-zinc-400 hover:text-amber-400 transition-colors mt-0.5"
          >
            ← 다른 프로그램 보기
          </a>
        </div>

        <nav className="relative flex flex-col">
          {FLOW_STEPS.map((item, idx) => {
            const isActive = pathname?.startsWith(item.href);
            const isLast = idx === FLOW_STEPS.length - 1;
            return (
              <Link key={item.href} href={item.href} className="group relative flex gap-3 pb-2">
                {/* 스텝 번호 + 연결선 */}
                <div className="flex flex-col items-center">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-all ${
                      isActive
                        ? "bg-amber-500 text-zinc-950 font-black shadow-md shadow-amber-500/20"
                        : "bg-zinc-800 text-zinc-400 group-hover:bg-zinc-700 group-hover:text-zinc-200"
                    }`}
                  >
                    {item.step}
                  </span>
                  {!isLast && <span className="mt-1 w-px flex-1 bg-zinc-800" />}
                </div>

                {/* 라벨 + 설명 */}
                <div
                  className={`min-w-0 flex-1 rounded-xl px-2.5 py-1.5 transition-all ${
                    isActive ? "bg-amber-500/10 border border-amber-500/30" : "group-hover:bg-zinc-900"
                  }`}
                >
                  <p className={`text-sm font-bold ${isActive ? "text-amber-400" : "text-zinc-200"}`}>
                    {item.icon} {item.label}
                  </p>
                  <p className="text-xs text-zinc-400 mt-0.5">{item.description}</p>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="mt-6 border-t border-zinc-800/80 pt-3">
          {UTILITY_ITEMS.map((item) => {
            const isActive = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-amber-500/10 text-amber-400 font-bold border border-amber-500/30"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                }`}
              >
                {item.icon} {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="mt-4 border-t border-zinc-800/80 pt-4 md:mt-0">
        <p className="mb-2 truncate px-2 text-xs font-medium text-zinc-400">{userEmail}</p>
        <a
          href={`${MAIN_SITE_URL}/logout`}
          className="block w-full rounded-lg px-2 py-1 text-left text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
        >
          로그아웃
        </a>
      </div>
    </aside>
  );
}
