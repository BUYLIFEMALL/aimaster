"use client";
import { BRAND_NAME, IS_STANDALONE } from "@/threads-content-ops/lib/deployment";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Flame,
  KeyRound,
  LayoutDashboard,
  Library,
  LogOut,
  PenLine,
  Send,
  UsersRound,
  BookOpen,
  Sparkles
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { APP_VERSION } from "@/threads-content-ops/lib/version";

const flow = [
  { tab: "viral", label: "떡상 콘텐츠 수집", icon: Flame },
  { tab: "create", label: "콘텐츠 생성", icon: PenLine },
  { tab: "manage", label: "콘텐츠 보관함", icon: Send },
  { tab: "accounts", label: "계정 콘셉트 설정", icon: UsersRound },
  { tab: "sources", label: "쇼핑제휴 상품 등록", icon: Library },
];

interface ContentOpsSidebarProps {
  email: string;
  isMobile?: boolean;
  onCloseMobile?: () => void;
}

export default function ContentOpsSidebar({ email, isMobile = false, onCloseMobile }: ContentOpsSidebarProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const active = searchParams.get("tab") ?? "dashboard";

  const href = (tab: string) => `/threads-content-ops${tab === "dashboard" ? "" : `?tab=${tab}`}`;

  const signOut = async () => {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const handleClickLink = () => {
    if (isMobile && onCloseMobile) {
      onCloseMobile();
    }
  };

  return (
    <aside
      className={
        isMobile
          ? "flex h-full w-full flex-col bg-white"
          : "hidden h-screen w-64 shrink-0 flex-col border-r border-neutral-200 bg-white md:sticky md:top-0 md:flex"
      }
    >
      {/* 1. 상단 브랜드 헤더 */}
      <div className="shrink-0 border-b border-neutral-200 p-5">
        <div className="flex items-center justify-between">
          <p className="text-lg font-extrabold tracking-tight text-neutral-900">Threads 운영 자동화</p>
          <span className="rounded-full border border-neutral-300 bg-neutral-100 px-2.5 py-0.5 text-[11px] font-bold text-neutral-800">
            {APP_VERSION}
          </span>
        </div>
        {/* 독립 운영 모드(강의용 설치 키트)에서는 AIMaster 카탈로그 링크 대신 수강생 브랜드 이름을 보여 준다 */}
        {IS_STANDALONE && BRAND_NAME && <p className="mt-2.5 text-xs font-medium text-neutral-500">{BRAND_NAME}</p>}
        {!IS_STANDALONE && (
          <Link
            className="mt-2.5 inline-block text-xs font-medium text-neutral-500 transition hover:text-neutral-900"
            href="https://www.buylife.xyz/programs"
          >
            ← 다른 프로그램 보기
          </Link>
        )}
      </div>

      {/* 2. 네비게이션 메뉴 (스크롤 대응) */}
      <nav className="min-h-0 flex-1 overflow-y-auto p-3">
        {/* 대시보드 */}
        <Link
          href={href("dashboard")}
          onClick={handleClickLink}
          className={`mb-3 flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-bold transition ${
            active === "dashboard"
              ? "border border-amber-300/80 bg-amber-50/90 text-amber-950 font-extrabold shadow-xs"
              : "text-neutral-700 hover:bg-neutral-100 hover:text-neutral-950"
          }`}
        >
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-lg transition ${
              active === "dashboard"
                ? "bg-amber-500 shadow-xs"
                : "bg-neutral-100 text-neutral-500 group-hover:bg-neutral-200"
            }`}
            style={active === "dashboard" ? { color: "#ffffff", backgroundColor: "#f59e0b" } : undefined}
          >
            <LayoutDashboard size={15} />
          </div>
          <span>대시보드</span>
        </Link>

        {/* 5단계 파이프라인 */}
        <div className="relative space-y-1">
          {flow.map(({ tab, label, icon: Icon }, index) => {
            const isActive = active === tab;
            return (
              <Link
                key={tab}
                href={href(tab)}
                onClick={handleClickLink}
                className="group relative flex items-center gap-3 rounded-xl p-1.5 transition"
              >
                <div className="flex flex-col items-center">
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-extrabold transition ${
                      isActive
                        ? "bg-amber-500 shadow-xs"
                        : "bg-neutral-100 text-neutral-500 group-hover:bg-neutral-200 group-hover:text-neutral-900"
                    }`}
                    style={isActive ? { color: "#ffffff", backgroundColor: "#f59e0b" } : undefined}
                  >
                    {index + 1}
                  </span>
                </div>
                <div
                  className={`flex flex-1 items-center gap-2.5 rounded-lg px-2.5 py-1.5 transition ${
                    isActive ? "bg-amber-50/80 border border-amber-200/60" : "group-hover:bg-neutral-50"
                  }`}
                >
                  <Icon
                    size={15}
                    className={isActive ? "text-amber-600" : "text-neutral-400 group-hover:text-neutral-600"}
                  />
                  <p className={`text-sm font-bold ${isActive ? "text-amber-950 font-extrabold" : "text-neutral-700"}`}>
                    {label}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>

        {/* 3. 구분선 및 유틸리티 영역 */}
        <div className="mt-3 border-t border-neutral-200 pt-3 space-y-1">
          <Link
            href={href("settings")}
            onClick={handleClickLink}
            className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-bold transition ${
              active === "settings"
                ? "border border-amber-300/80 bg-amber-50/90 text-amber-950 font-extrabold shadow-xs"
                : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
            }`}
          >
            <KeyRound size={16} className={active === "settings" ? "text-amber-600" : "text-neutral-500"} />
            <span>API키등록·플랫폼연동</span>
          </Link>

          {/* 신설: 연동 & 사용 매뉴얼 */}
          <Link
            href={href("guide")}
            onClick={handleClickLink}
            className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-bold transition ${
              active === "guide"
                ? "shadow-xs font-extrabold"
                : "text-amber-900 bg-amber-50/60 hover:bg-amber-100/80 border border-amber-200/60"
            }`}
            style={active === "guide" ? { color: "#ffffff", backgroundColor: "#f59e0b" } : undefined}
          >
            <BookOpen size={16} style={active === "guide" ? { color: "#ffffff" } : { color: "#d97706" }} />
            <span className="flex-1">연동 & 사용 매뉴얼</span>
            {active !== "guide" ? (
              <span className="rounded-full bg-amber-200/90 px-1.5 py-0.5 text-[10px] font-bold text-amber-900">
                가이드
              </span>
            ) : (
              <span
                className="rounded-full bg-amber-600 px-1.5 py-0.5 text-[10px] font-bold"
                style={{ color: "#ffffff" }}
              >
                열람 중
              </span>
            )}
          </Link>
        </div>

        {/* 4. 계정 정보 및 로그아웃 (마지막 메뉴 바로 아래 8~16px 간격으로 바짝 밀착) */}
        <div className="mt-3 shrink-0 border-t border-neutral-200 pt-3">
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-2.5">
            <p className="text-[11px] font-semibold text-neutral-400">접속 계정</p>
            <p className="mt-0.5 truncate text-xs font-bold text-neutral-800" title={email}>
              {email}
            </p>
            <button
              onClick={() => void signOut()}
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-neutral-200 bg-white py-1.5 text-xs font-bold text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900"
            >
              <LogOut size={13} />
              <span>로그아웃</span>
            </button>
          </div>
        </div>
      </nav>
    </aside>
  );
}
