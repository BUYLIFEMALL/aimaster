"use client";

import {
  ListMusic,
  SlidersHorizontal,
  Video,
  Key,
  HelpCircle,
  ExternalLink,
  LogOut,
  User,
  Sparkles
} from "lucide-react";
import { APP_VERSION, APP_NAME } from "@/lib/version";

interface SidebarProps {
  currentTab: 'media' | 'editor' | 'export';
  setTab: (tab: 'media' | 'editor' | 'export') => void;
  onOpenApiKey: () => void;
  onOpenHelp: () => void;
  userEmail?: string | null;
  trackCount: number;
  hasBackground: boolean;
}

export function Sidebar({
  currentTab,
  setTab,
  onOpenApiKey,
  onOpenHelp,
  userEmail,
  trackCount,
  hasBackground,
}: SidebarProps) {
  const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "https://www.buylife.xyz";

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 h-screen select-none z-30">
      {/* 1. 상단 브랜딩 & 버전 */}
      <div>
        <div className="p-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <ListMusic className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-extrabold text-slate-900 text-sm tracking-tight truncate">
                {APP_NAME}
              </h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100">
                  {APP_VERSION}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">Spectrum Studio</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. 번호형 작업 흐름 (Workflow) */}
        <div className="p-3">
          <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            작업 흐름
          </div>
          <nav className="space-y-1 mt-1">
            <button
              onClick={() => setTab('media')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                currentTab === 'media'
                  ? 'bg-indigo-50 text-indigo-700 shadow-xs border border-indigo-100'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    currentTab === 'media'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  1
                </span>
                <span>미디어 센터</span>
              </div>
              {trackCount > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-indigo-100 text-indigo-700 rounded-full">
                  {trackCount}곡
                </span>
              )}
            </button>

            <button
              onClick={() => setTab('editor')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                currentTab === 'editor'
                  ? 'bg-indigo-50 text-indigo-700 shadow-xs border border-indigo-100'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    currentTab === 'editor'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  2
                </span>
                <span>편집 스튜디오</span>
              </div>
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
            </button>

            <button
              onClick={() => setTab('export')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                currentTab === 'export'
                  ? 'bg-indigo-50 text-indigo-700 shadow-xs border border-indigo-100'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    currentTab === 'export'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  3
                </span>
                <span>고속 렌더링</span>
              </div>
              <Video className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </nav>
        </div>

        {/* 3. 연동 및 지원 메뉴 */}
        <div className="p-3 border-t border-slate-100">
          <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            연동 및 지원
          </div>
          <div className="space-y-1 mt-1">
            <button
              onClick={onOpenApiKey}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              <Key className="w-4 h-4 text-amber-500" />
              <span>API키등록·플랫폼연동</span>
            </button>

            <button
              onClick={onOpenHelp}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              <HelpCircle className="w-4 h-4 text-indigo-500" />
              <span>사용 가이드</span>
            </button>

            <a
              href={MAIN_SITE_URL}
              target="_blank"
              rel="noreferrer"
              className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-purple-500" />
                <span>AIMaster 포털</span>
              </div>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>
          </div>
        </div>
      </div>

      {/* 4. 하단 계정 정보 & 로그아웃 */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center justify-between px-2 py-1">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 shrink-0">
              <User className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-slate-800 truncate">
                {userEmail || '로그인 회원'}
              </p>
              <span className="text-[10px] text-emerald-600 font-medium">인증됨</span>
            </div>
          </div>
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              title="로그아웃"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
