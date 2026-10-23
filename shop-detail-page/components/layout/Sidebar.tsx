"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/lib/actions/auth";
import { APP_VERSION } from "@/lib/version";
import { GIF_SENDER_ORIGIN } from "@/lib/gifHandoff";
import {
  ScanSearch,
  LayoutGrid,
  KeyRound,
  BookOpen,
  LogOut,
  ShoppingBag,
  Sparkles,
  Menu,
  X,
  Film,
  ExternalLink,
} from "lucide-react";

const FLOW_STEPS = [
  {
    step: 1,
    href: "/products/new",
    icon: ScanSearch,
    iconColor: "text-blue-600",
    label: "상품 및 상세페이지 분석",
    description: "상품 사진 등록 + AI 소구점 분석",
  },
  {
    step: 2,
    href: "/products",
    icon: LayoutGrid,
    iconColor: "text-indigo-600",
    label: "상세페이지 생성·관리",
    description: "섹션 이미지 생성 및 롱 이미지 병합",
  },
];

const UTILITY_ITEMS = [
  { href: "/settings", icon: KeyRound, iconColor: "text-amber-500", label: "API키등록·플랫폼연동" },
  { href: "/guide", icon: BookOpen, iconColor: "text-blue-600", label: "사용 안내" },
];

function isFlowStepActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  if (href === "/products/new") {
    return pathname === "/products/new";
  }
  return pathname.startsWith("/products") && pathname !== "/products/new";
}

export function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => {
    if (!pathname) return false;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <>
      {/* 모바일 상단 바 (md 이하) */}
      <div className="flex md:hidden items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sticky top-0 z-40 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white text-xs font-black shadow-xs">
            <ShoppingBag size={15} />
          </span>
          <div>
            <span className="text-sm font-black text-slate-900 tracking-tight">AI 상세페이지 자동화</span>
            <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-50 text-orange-600 border border-orange-200">
              {APP_VERSION}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
          aria-label="메뉴 열기"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* 사이드바 본체 */}
      <aside
        className={`${
          mobileOpen ? "flex" : "hidden"
        } md:flex w-full md:w-64 flex-col border-b md:border-b-0 md:border-r border-slate-200 bg-white p-4 md:sticky md:top-0 md:h-screen md:shrink-0 z-30 transition-all select-none overflow-y-auto`}
      >
        <div className="pr-1">
          {/* 브랜드 헤더 */}
          <div className="mb-5 px-1">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white text-xs font-black shadow-sm shadow-blue-500/25">
                  <ShoppingBag size={15} />
                </span>
                <span className="text-sm font-black text-slate-900 tracking-tight">AI 상세페이지 자동화</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 text-orange-600 border border-orange-200/80">
                {APP_VERSION}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mb-2 pl-9 font-medium">15·12·9단 Commerce Studio</p>
            <a
              href="https://www.buylife.xyz/programs"
              className="inline-flex items-center gap-1 pl-1 text-[11px] font-semibold text-slate-500 hover:text-blue-600 transition-colors"
            >
              <span>← 다른 프로그램 보기</span>
            </a>
          </div>

          {/* 작업 흐름 스텝퍼 */}
          <div className="mb-2 px-1">
            <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-2">SELLER WORKFLOW</p>
          </div>
          <nav className="relative flex flex-col space-y-1">
            {FLOW_STEPS.map((item, idx) => {
              const active = isFlowStepActive(pathname, item.href);
              const isLast = idx === FLOW_STEPS.length - 1;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`group relative flex gap-3 p-2.5 rounded-xl transition-all ${
                    active
                      ? "bg-blue-50/80 border border-blue-200/70 shadow-2xs"
                      : "hover:bg-slate-50 border border-transparent"
                  }`}
                >
                  {/* 스텝 번호 + 연결선 */}
                  <div className="flex flex-col items-center">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-black transition-all ${
                        active
                          ? "bg-blue-600 text-white shadow-xs shadow-blue-500/30"
                          : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
                      }`}
                    >
                      {item.step}
                    </span>
                    {!isLast && <span className="mt-1 w-px flex-1 bg-slate-200" />}
                  </div>

                  {/* 라벨 + 설명 */}
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs font-bold flex items-center gap-1.5 ${active ? "text-blue-700" : "text-slate-800"}`}>
                      <Icon size={15} className={active ? "text-blue-600" : item.iconColor} />
                      <span>{item.label}</span>
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{item.description}</p>
                  </div>
                </Link>
              );
            })}
          </nav>

          {/* 유틸리티 메뉴 (API키등록 + 사용 안내) */}
          <div className="mt-4 border-t border-slate-200 pt-3 space-y-1">
            {UTILITY_ITEMS.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                    active
                      ? "bg-blue-50 text-blue-700 border border-blue-200/70"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <Icon size={16} className={active ? "text-blue-600" : item.iconColor} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
            {/* v1.30(S-23-09): 영상 → GIF는 상세페이지 GIF 자동화에서(새 탭). 변환 뒤 「상세페이지로」로 섹션에 바로 넣음 */}
            <a
              href={`${GIF_SENDER_ORIGIN}/dashboard`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all"
            >
              <Film size={16} className="text-violet-600" />
              <span>영상→GIF 만들기</span>
              <ExternalLink size={12} className="ml-auto text-slate-400" />
            </a>
          </div>

          {/* 접속 계정 정보 및 로그아웃 (메뉴 바로 아래 바짝 밀착) */}
          <div className="mt-3 border-t border-slate-200 pt-3 space-y-1 px-1">
            <div className="flex items-center justify-between px-2 py-1">
              <div className="min-w-0 pr-1">
                <p className="text-[10px] font-semibold text-slate-400">접속 계정</p>
                <p className="truncate text-xs font-bold text-slate-700" title={userEmail}>
                  {userEmail || "로그인 계정"}
                </p>
              </div>
              <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" title="접속 중" />
            </div>
            <form action={signOutAction}>
              <button
                type="submit"
                className="group flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50/50 transition-colors"
              >
                <LogOut size={14} className="text-slate-400 group-hover:text-rose-500 transition-colors" />
                <span>로그아웃</span>
              </button>
            </form>
          </div>

          {/* 이커머스 엔진 소개 카드 (계정 밑에 보조 배치) */}
          <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-blue-700 mb-1">
              <Sparkles size={13} className="text-blue-600" />
              <span>Gemini 상세페이지 생성 엔진</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              상품 맞춤형 소구점 분석, 15섹션·쿠팡 12단·스마트스토어 9단 고해상도 생성 및 세로 롱 이미지 병합 지원
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
