"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_VERSION, APP_NAME } from "@/lib/version";
import {
  Repeat,
  BookOpen,
  Settings,
  LogOut,
  Menu,
  X,
  Upload,
  Layers,
  Sparkles,
  Zap,
  Package,
  Palette,
  Download,
  ExternalLink
} from "lucide-react";

interface SidebarProps {
  userEmail?: string;
}

// 4. 번호가 붙은 핵심 작업 흐름 (Step 1~4) - docs/SIDEBAR_LAYOUT_STANDARD.md
const FLOW_STEPS = [
  { step: 1, href: "/studio", label: "영상 소스 업로드", description: "초단위 컷 & 9:16 최적화", icon: Upload },
  { step: 2, href: "/studio#algorithm", label: "루프 알고리즘 선택", description: "스마트 / 오버랩 / 바운스", icon: Layers },
  { step: 3, href: "/studio#matching", label: "프레임 시임리스 매칭", description: "SSIM 99.4% 정합 분석", icon: Sparkles },
  { step: 4, href: "/studio#render", label: "9:16 쇼츠 고속 렌더", description: "MP4 / WebM / GIF 내보내기", icon: Zap },
];

function Brand({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="border-b border-lv-border p-4.5">
      <Link href="/studio" onClick={onNavigate} className="flex items-center gap-3 group">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 via-amber-600 to-blue-600 text-white font-black text-xl shadow-md transition-transform group-hover:scale-105">
          ♾️
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-black text-amber-600 leading-tight">
            {APP_NAME}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[11px] font-bold text-slate-700">스튜디오</span>
            <span className="px-1.5 py-0.2 text-[10px] font-extrabold font-mono rounded bg-amber-100 border border-amber-300 text-amber-800">
              {APP_VERSION}
            </span>
          </div>
        </div>
      </Link>
      <a
        className="mt-2.5 inline-block text-[11px] text-slate-500 hover:text-amber-600 transition-colors"
        href="https://www.buylife.xyz/programs"
      >
        ← 다른 프로그램 보기
      </a>
    </div>
  );
}

function NavBody({ userEmail, onNavigate }: SidebarProps & { onNavigate?: () => void }) {
  const pathname = usePathname();
  const isStudio = pathname === "/studio" || pathname === "/";
  const isGuide = pathname.startsWith("/guide");
  const isSettings = pathname.startsWith("/settings");

  return (
    <nav className="flex-1 overflow-y-auto p-3 flex flex-col justify-between">
      <div className="space-y-4">
        {/* 3. 대시보드 진입점 */}
        <Link
          href="/studio"
          onClick={onNavigate}
          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-bold transition-all ${
            isStudio
              ? "bg-amber-50 text-amber-800 border border-amber-200 border-l-4 border-l-amber-500 shadow-2xs"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <span className="text-base">🏠</span>
          <span>무한루프 스튜디오 홈</span>
        </Link>

        {/* 4. 번호가 붙은 핵심 작업 흐름 */}
        <div>
          <div className="px-2 mb-2 text-[10px] font-extrabold tracking-wider text-amber-700 uppercase">
            무한루프 제작 파이프라인
          </div>
          <div className="relative pl-1 space-y-1">
            {FLOW_STEPS.map(({ step, href, label, description, icon: Icon }, index) => {
              const active = isStudio && index === 0; // 메인 활성화 기준
              return (
                <Link
                  key={step}
                  href={href}
                  onClick={onNavigate}
                  className={`group flex items-start gap-2.5 p-2 rounded-xl transition-all ${
                    active ? "bg-amber-50/70 border border-amber-200/60" : "hover:bg-slate-50"
                  }`}
                >
                  <div className="flex flex-col items-center shrink-0 mt-0.5">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-extrabold transition-all ${
                        active
                          ? "bg-amber-500 text-white shadow-xs"
                          : "bg-slate-100 border border-slate-300 text-slate-600 group-hover:bg-slate-200"
                      }`}
                    >
                      {step}
                    </span>
                    {index < FLOW_STEPS.length - 1 && (
                      <span className="h-3 w-px bg-slate-200 mt-1" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-bold leading-tight ${active ? "text-slate-900" : "text-slate-700 group-hover:text-slate-900"}`}>
                      {label}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5 truncate">{description}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* 5. 부가 도구 & 프리셋 */}
        <div>
          <div className="px-2 mb-1.5 text-[10px] font-extrabold tracking-wider text-slate-400 uppercase">
            부가 도구 & 프리셋
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer">
              <Package size={14} className="text-slate-400" />
              <span>일괄 숏폼 루프 변환기</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer">
              <Palette size={14} className="text-slate-400" />
              <span>바이럴 루프 효과 프리셋</span>
            </div>
          </div>
        </div>
      </div>

      {/* 6. 하단 고정 영역 */}
      <div className="pt-3 border-t border-lv-border space-y-2.5 mt-4">
        {/* 3D 엠보싱 다운로드 링크 */}
        <a
          href="https://www.buylife.xyz/programs"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-3d-amber w-full text-center py-2 text-xs"
        >
          <Download size={13} />
          <span>숏폼 자동포스팅 확장 다운</span>
        </a>

        {/* 매뉴얼 및 설정 탭 */}
        <div className="grid grid-cols-2 gap-1.5">
          <Link
            href="/guide"
            onClick={onNavigate}
            className={`flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-bold transition-colors ${
              isGuide
                ? "bg-amber-100 text-amber-900 border border-amber-300"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <BookOpen size={13} />
            <span>매뉴얼</span>
          </Link>
          <Link
            href="/settings"
            onClick={onNavigate}
            className={`flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-bold transition-colors ${
              isSettings
                ? "bg-amber-100 text-amber-900 border border-amber-300"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Settings size={13} />
            <span>설정/API</span>
          </Link>
        </div>

        {/* 내 계정 정보 & 로그아웃 */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-[11px] text-slate-500">
          <span className="truncate max-w-[140px]" title={userEmail}>
            {userEmail || "buylifemall@gmail.com"}
          </span>
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="text-red-600 font-bold hover:underline cursor-pointer flex items-center gap-1"
            >
              <LogOut size={11} />
              <span>로그아웃</span>
            </button>
          </form>
        </div>
      </div>
    </nav>
  );
}

export function Sidebar({ userEmail }: SidebarProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* 모바일 햄버거 버튼 */}
      <div className="md:hidden fixed top-3 left-3 z-50">
        <button
          onClick={() => setOpen(!open)}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-700 shadow-md"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* 모바일 백드롭 */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="md:hidden fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs"
        />
      )}

      {/* 데스크톱 사이드바 (표준 254px) */}
      <aside className="hidden md:flex h-screen w-[254px] shrink-0 flex-col border-r border-lv-border bg-white select-none">
        <Brand />
        <NavBody userEmail={userEmail} />
      </aside>

      {/* 모바일 드로어 사이드바 */}
      <aside
        className={`md:hidden fixed top-0 bottom-0 left-0 z-50 flex w-[260px] flex-col border-r border-lv-border bg-white shadow-2xl transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Brand onNavigate={() => setOpen(false)} />
        <NavBody userEmail={userEmail} onNavigate={() => setOpen(false)} />
      </aside>
    </>
  );
}
