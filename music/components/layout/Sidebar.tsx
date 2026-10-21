"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/lib/actions/auth";
import { APP_VERSION } from "@/lib/version";

// 음악 생성은 "기획 → 생성/관리 → 리믹스" 순서로 진행하는 단계형 흐름이라, 사이드바도 그 순서를
// 그대로 위→아래 스텝퍼로 보여준다. API 키 설정은 이 흐름의 일부가 아니라 별도 유틸리티라 분리.
const FLOW_STEPS = [
  {
    step: 1,
    href: "/studio",
    icon: "🎚️",
    label: "정밀 기획 스튜디오",
    description: "프리셋 461·보컬/랩 설정·앨범 3~12곡 설계",
  },
  {
    step: 2,
    href: "/plannings/new",
    icon: "🎼",
    label: "빠른 음악 기획",
    description: "곡 설명만으로 스타일·제목·가사 자동 완성",
  },
  {
    step: 3,
    href: "/plannings",
    icon: "🎵",
    label: "음악 생성 · 트랙 관리",
    description: "Suno AI 생성, 연장·MR·WAV 변환",
  },
  {
    step: 4,
    href: "/remix",
    icon: "🎛️",
    label: "음악 Remix 스튜디오",
    description: "기존 곡·오디오를 새로운 스타일로 리메이크",
  },
];

const UTILITY_ITEMS = [
  { href: "/settings", icon: "🔑", label: "API 키 등록 · 플랫폼 연동" },
  { href: "/guide", icon: "📚", label: "연동 & 사용 안내" },
];

export function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();

  return (
    <aside className="flex w-full flex-col border-b border-[#272732] bg-[#121217] p-4 md:w-72 md:border-b-0 md:border-r md:sticky md:top-0 md:h-screen md:shrink-0 z-20">
      {/* 상단 브랜드 헤더 */}
      <div className="md:min-h-0 md:overflow-y-auto pr-1">
        <div className="mb-6 px-1">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center h-7 px-2.5 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black text-xs tracking-wider shadow-md shadow-orange-500/20">
                SUNO
              </span>
              <span className="text-base font-black tracking-tight text-white">음악 자동화</span>
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
              {APP_VERSION}
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px] text-zinc-400 mt-2 px-0.5">
            <a
              href="https://suno.com/discover"
              target="_blank"
              rel="noreferrer"
              className="text-orange-400 hover:text-orange-300 transition-colors flex items-center gap-1 font-medium"
            >
              <span>🔥 Suno Discover 바로가기</span>
              <span className="text-[9px]">↗</span>
            </a>
            <a
              href="https://www.buylife.xyz/programs"
              className="text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              ← 다른 프로그램
            </a>
          </div>
        </div>

        {/* 3단계 스텝 네비게이션 */}
        <div className="mb-2 px-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2">STUDIO WORKFLOW</p>
        </div>
        <nav className="relative flex flex-col space-y-1.5">
          {FLOW_STEPS.map((item, idx) => {
            const isActive = pathname?.startsWith(item.href);
            const isLast = idx === FLOW_STEPS.length - 1;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group relative flex gap-3 p-2.5 rounded-xl transition-all duration-200 border ${
                  isActive
                    ? "bg-gradient-to-r from-orange-500/15 via-orange-500/5 to-transparent border-orange-500/40 shadow-sm"
                    : "border-transparent hover:bg-[#181822] hover:border-[#272732]"
                }`}
              >
                {/* 스텝 번호 원형 배지 */}
                <div className="flex flex-col items-center pt-0.5">
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-black transition-transform duration-200 ${
                      isActive
                        ? "bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/30 scale-105"
                        : "bg-[#1c1c26] text-zinc-400 border border-[#2b2b38] group-hover:text-zinc-200 group-hover:border-[#383848]"
                    }`}
                  >
                    {item.step}
                  </span>
                  {!isLast && (
                    <span
                      className={`mt-2 w-[1px] flex-1 min-h-[14px] ${
                        isActive ? "bg-orange-500/30" : "bg-[#252533]"
                      }`}
                    />
                  )}
                </div>

                {/* 라벨 + 설명 */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">{item.icon}</span>
                    <p
                      className={`text-sm font-bold truncate ${
                        isActive ? "text-orange-400" : "text-zinc-200 group-hover:text-white"
                      }`}
                    >
                      {item.label}
                    </p>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5 line-clamp-1 group-hover:text-zinc-300">
                    {item.description}
                  </p>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* 유틸리티 설정 메뉴 */}
        <div className="mt-6 border-t border-[#23232f] pt-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2 px-1">PREFERENCES</p>
          <div className="space-y-1">
            {UTILITY_ITEMS.map((item) => {
              const isActive = pathname?.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all border ${
                    isActive
                      ? "bg-orange-500/10 border-orange-500/30 text-orange-400"
                      : "border-transparent text-zinc-400 hover:text-zinc-100 hover:bg-[#181822] hover:border-[#272732]"
                  }`}
                >
                  <span className="text-sm">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* 접속 계정 정보 및 로그아웃 — 유틸리티 메뉴 밑 밀착 배치 (2026-10-16 주인님 지시) */}
        <div className="mt-4 border-t border-[#23232f] pt-3 px-1">
          <div className="flex items-center justify-between mb-2">
            <div className="min-w-0 pr-2">
              <p className="text-[10px] text-zinc-400">접속 계정</p>
              <p className="truncate text-xs font-semibold text-zinc-300">{userEmail}</p>
            </div>
            <div className="w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20 shrink-0" title="연결됨" />
          </div>
          <form action={signOutAction}>
            <button
              type="submit"
              className="w-full rounded-xl py-2 px-3 text-center text-xs font-bold text-zinc-400 border border-[#272732] bg-[#16161f] hover:bg-[#1e1e2b] hover:text-rose-400 hover:border-rose-500/30 transition-all flex items-center justify-center gap-1.5"
            >
              <span>로그아웃</span>
            </button>
          </form>
        </div>

        {/* Suno Creator 바로가기 배너 카드 */}
        <div className="mt-5 p-3 rounded-xl bg-gradient-to-br from-[#1c1a24] to-[#14141c] border border-orange-500/20 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-orange-400 mb-1">
            <span>✨</span>
            <span>Suno v4 ~ v6 최신 엔진 탑재</span>
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            고품질 보컬/악기 분리, 고음질 WAV 추출 및 멀티스타일 리믹스를 완벽 지원합니다.
          </p>
        </div>
      </div>
    </aside>
  );
}
