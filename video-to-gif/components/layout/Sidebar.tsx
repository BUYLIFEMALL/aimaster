"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/lib/actions/auth";
import { APP_VERSION } from "@/lib/version";
import {
  Film,
  Sliders,
  Download,
  BookOpen,
  Home,
  Grid,
  Menu,
  X,
  LogOut,
  Sparkles,
  Zap,
  Laptop,
  Puzzle,
  Terminal,
  Copy,
  Check,
  Cpu
} from "lucide-react";

const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "https://www.buylife.xyz";

export function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const [copiedMac, setCopiedMac] = useState(false);

  const copyMacCommand = () => {
    const cmd = "curl -fsSL https://video-to-gif.buylife.xyz/downloads/local-renderer/install-mac.sh | bash";
    navigator.clipboard.writeText(cmd);
    setCopiedMac(true);
    setTimeout(() => setCopiedMac(false), 2000);
  };

  const isDashboard = pathname === "/dashboard" || pathname === "/";
  const isGuide = pathname === "/guide";

  return (
    <>
      {/* 모바일 상단 바 (767px 이하 노출) */}
      <header className="flex h-16 w-full items-center justify-between border-b border-[#30363d] bg-[#161b22] px-4 md:hidden">
        <Link href="/dashboard" className="flex items-center gap-2 text-base font-bold text-white">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Film className="h-4 w-4" />
          </span>
          <span className="truncate">AI 영상렌더 스튜디오</span>
          <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-400 border border-amber-500/20">
            {APP_VERSION}
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDownloadModalOpen(true)}
            className="flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[11px] font-bold text-amber-300"
          >
            <Download className="h-3 w-3" />
            <span>설치</span>
          </button>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#30363d] bg-[#0d1117] text-gray-300 hover:text-white"
            aria-label="메뉴 열기"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* 모바일 드로어 백드롭 */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* 사이드바 본체 (데스크톱 고정 & 모바일 슬라이드 드로어) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-[#30363d] bg-[#161b22] transition-transform duration-300 ease-in-out md:static md:translate-x-0 md:h-screen md:shrink-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* 상단 브랜드 헤더 */}
        <div className="border-b border-[#30363d] p-5">
          <div className="flex items-center justify-between">
            <Link
              href="/dashboard"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-white hover:opacity-90"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 text-slate-950 shadow-lg shadow-amber-500/20">
                <Film className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-extrabold text-white">AI 영상렌더 스튜디오</span>
                <span className="text-[11px] font-medium text-amber-400">VideoRender Studio</span>
              </div>
            </Link>
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold text-amber-300">
                <Sparkles className="h-2.5 w-2.5" />
                {APP_VERSION} STUDIO
              </span>
              <button
                onClick={() => setMobileOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-md border border-[#30363d] text-gray-400 md:hidden"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-gray-400">
            WASM & 내 PC 가속 렌더링 · 스마트 압축 최적화
          </p>
        </div>

        {/* 네비게이션 스크롤 영역 */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
          {/* 작업 파이프라인 메뉴 (1-2-3 단계) */}
          <div>
            <div className="px-2 pb-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">
              영상 렌더링 파이프라인
            </div>
            <nav className="space-y-1">
              <Link
                href="/dashboard"
                onClick={() => setMobileOpen(false)}
                className={`group flex items-start gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all ${
                  isDashboard
                    ? "border border-amber-500/40 bg-gradient-to-r from-amber-500/20 to-transparent text-amber-300 shadow-sm"
                    : "text-gray-300 hover:bg-[#1f2937] hover:text-white"
                }`}
              >
                <span
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[11px] font-black ${
                    isDashboard
                      ? "bg-amber-400 text-slate-950 font-black shadow-sm"
                      : "bg-[#0d1117] text-gray-400 border border-[#30363d]"
                  }`}
                >
                  1
                </span>
                <div className="flex-1">
                  <div className="font-bold flex items-center justify-between">
                    <span>동영상 파일 등록</span>
                    <span className="text-[10px] text-amber-400/80">최대 20개</span>
                  </div>
                  <p className="mt-0.5 text-[11px] font-normal text-gray-400">
                    MP4 · MOV · WEBM 일괄 큐 등록
                  </p>
                </div>
              </Link>

              <div className="flex items-start gap-3 rounded-xl px-3 py-2 text-xs text-gray-400">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#0d1117] text-[11px] font-black text-gray-400 border border-[#30363d]">
                  2
                </span>
                <div className="flex-1">
                  <div className="font-bold text-gray-300">고속 렌더링 & 최적화</div>
                  <p className="mt-0.5 text-[11px] text-gray-400">WASM & PC 가속 스마트 사다리</p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl px-3 py-2 text-xs text-gray-400">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#0d1117] text-[11px] font-black text-gray-400 border border-[#30363d]">
                  3
                </span>
                <div className="flex-1">
                  <div className="font-bold text-gray-300">고화질 결과물 다운로드</div>
                  <p className="mt-0.5 text-[11px] text-gray-400">초고화질 GIF · 일괄 ZIP 패키징</p>
                </div>
              </div>
            </nav>
          </div>

          {/* 사용 매뉴얼 가이드 메뉴 그룹 (DESIGN.md 9번 필수 원칙) */}
          <div className="border-t border-[#30363d] pt-4">
            <div className="px-2 pb-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">
              가이드북 & 매뉴얼
            </div>
            <Link
              href="/guide"
              onClick={() => setMobileOpen(false)}
              className={`group flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold transition-all ${
                isGuide
                  ? "border border-amber-500/40 bg-gradient-to-r from-amber-500/20 to-transparent text-amber-300 shadow-sm"
                  : "text-gray-300 hover:bg-[#1f2937] hover:text-white"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <BookOpen className="h-4 w-4" />
                </span>
                <div>
                  <div className="font-bold text-amber-200">📖 연동 & 사용 매뉴얼</div>
                  <div className="text-[10px] text-gray-400 font-normal">WASM & 내 PC 가속 렌더링 가이드</div>
                </div>
              </div>
              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/30">
                GUIDE
              </span>
            </Link>

            {/* 내 PC 로컬 렌더러 프로그램 다운로드 카드 */}
            <button
              type="button"
              onClick={() => {
                setDownloadModalOpen(true);
                setMobileOpen(false);
              }}
              className="mt-2 w-full group flex items-center justify-between rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/15 via-[#161b22] to-amber-500/10 p-2.5 text-left hover:border-amber-500/50 transition-all shadow-sm"
            >
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500 text-slate-950 font-black">
                  <Download className="h-4 w-4" />
                </span>
                <div>
                  <div className="text-xs font-black text-white flex items-center gap-1">
                    <span>로컬 렌더러 받기</span>
                    <span className="rounded bg-amber-400/20 px-1 text-[9px] font-bold text-amber-300">최신 v1.25</span>
                  </div>
                  <div className="text-[10px] text-gray-400">내 PC 가속 렌더러 & 확장 ZIP</div>
                </div>
              </div>
            </button>
          </div>

          {/* AIMaster 패밀리 메뉴 */}
          <div className="border-t border-[#30363d] pt-4 space-y-1">
            <div className="px-2 pb-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">
              플랫폼 바로가기
            </div>
            <a
              href={MAIN_SITE_URL}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-gray-300 hover:bg-[#1f2937] hover:text-white"
            >
              <Home className="h-4 w-4 text-gray-400" />
              <span>AIMaster 메인</span>
            </a>
            <a
              href={`${MAIN_SITE_URL}/programs`}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-gray-300 hover:bg-[#1f2937] hover:text-white"
            >
              <Grid className="h-4 w-4 text-gray-400" />
              <span>전체 프로그램 보기</span>
            </a>
          </div>
        </div>

        {/* 하단 회원 정보 및 로그아웃 */}
        <div className="border-t border-[#30363d] bg-[#0d1117] p-4">
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              WASM 엔진 준비됨
            </span>
            <span className="text-[10px] text-gray-400">100% Client-side</span>
          </div>
          <div className="rounded-xl border border-[#30363d] bg-[#161b22] p-2.5">
            <div className="text-[10px] text-gray-400">접속 계정</div>
            <div className="truncate text-xs font-bold text-gray-200 mt-0.5">{userEmail || "일반 회원"}</div>
            <form action={signOutAction} className="mt-2.5">
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#30363d] bg-[#0d1117] px-3 py-1.5 text-xs font-semibold text-gray-300 hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                로그아웃
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* 로컬 렌더러 & 확장 프로그램 다운로드 팝업 모달 */}
      {downloadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="fixed inset-0"
            onClick={() => setDownloadModalOpen(false)}
          />
          <div className="relative w-full max-w-2xl rounded-3xl border border-amber-500/40 bg-[#0d1117] p-6 sm:p-7 shadow-2xl z-10 max-h-[90vh] overflow-y-auto">
            {/* 상단 닫기 & 타이틀 */}
            <div className="flex items-start justify-between pb-4 border-b border-[#30363d]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-bold text-amber-300">
                    <Cpu className="h-3 w-3" />
                    내 PC 하드웨어 가속
                  </span>
                  <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold text-cyan-300 border border-cyan-500/20">
                    최신 공식판 v1.25
                  </span>
                </div>
                <h3 className="mt-2 text-xl font-extrabold text-white flex items-center gap-2">
                  <span>로컬 렌더러 프로그램 다운로드 센터</span>
                </h3>
                <p className="mt-1 text-xs text-gray-300">
                  내 컴퓨터의 GPU/CPU 성능으로 3~4배 빠르게 고화질 영상을 변환하세요.
                </p>
              </div>
              <button
                onClick={() => setDownloadModalOpen(false)}
                className="rounded-lg border border-[#30363d] p-1.5 text-gray-400 hover:text-white hover:bg-[#161b22]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* 다운로드 3대 카드 */}
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Windows 렌더러 */}
              <div className="rounded-2xl border border-[#30363d] bg-[#161b22] p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400 font-bold">
                      <Laptop className="h-4 w-4" />
                    </span>
                    <span className="text-[10px] font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                      Windows 10/11
                    </span>
                  </div>
                  <h4 className="mt-3 text-sm font-bold text-white">Windows 렌더러 프로그램</h4>
                  <p className="mt-1 text-[11px] text-gray-400">
                    압축 해제 후 install-windows.bat 실행 (관리자 권한 불필요, 1초 등록)
                  </p>
                </div>
                <a
                  href="/downloads/local-renderer/gif-renderer-windows-latest.zip"
                  className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-3.5 py-2 text-xs font-black text-slate-950 hover:from-amber-400 hover:to-amber-500 transition-all shadow-md shadow-amber-500/20"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Windows 렌더러 ZIP 받기</span>
                </a>
              </div>

              {/* 브라우저 확장 */}
              <div className="rounded-2xl border border-[#30363d] bg-[#161b22] p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/15 text-cyan-400 font-bold">
                      <Puzzle className="h-4 w-4" />
                    </span>
                    <span className="text-[10px] font-bold text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
                      Chrome / Whale / Edge
                    </span>
                  </div>
                  <h4 className="mt-3 text-sm font-bold text-white">브라우저 확장프로그램</h4>
                  <p className="mt-1 text-[11px] text-gray-400">
                    압축 해제 후 chrome://extensions에서 [압축해제된 확장 로드] 선택
                  </p>
                </div>
                <a
                  href="/downloads/local-renderer/gif-renderer-extension-latest.zip"
                  className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-500/15 px-3.5 py-2 text-xs font-bold text-cyan-300 hover:bg-cyan-500/25 transition-all shadow-md shadow-cyan-500/10"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>확장프로그램 ZIP 받기</span>
                </a>
              </div>

              {/* Mac 터미널 원클릭 */}
              <div className="sm:col-span-2 rounded-2xl border border-[#30363d] bg-[#161b22] p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Terminal className="h-4 w-4 text-purple-400" />
                    <span className="text-sm font-bold text-white">Mac (macOS) 터미널 1초 설치</span>
                    <span className="text-[10px] text-purple-300 bg-purple-500/15 px-2 py-0.5 rounded-full border border-purple-500/20">
                      터미널에 붙여넣기
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-gray-400 bg-black/40 px-2.5 py-1.5 rounded-lg border border-white/5 break-all">
                    curl -fsSL https://video-to-gif.buylife.xyz/downloads/local-renderer/install-mac.sh | bash
                  </div>
                </div>
                <button
                  onClick={copyMacCommand}
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-purple-500/40 bg-purple-500/15 px-4 py-2 text-xs font-bold text-purple-300 hover:bg-purple-500/25 transition-all shadow-md shadow-purple-500/10"
                >
                  {copiedMac ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedMac ? "복사 완료!" : "명령어 1초 복사"}</span>
                </button>
              </div>
            </div>

            {/* 하단 설치 안내 링크 */}
            <div className="mt-5 pt-4 border-t border-[#30363d] flex flex-wrap items-center justify-between gap-3 text-xs">
              <span className="text-gray-400">
                💡 1회만 설치해 두시면 접속 시 자동으로 최신 가속 엔진이 연동됩니다.
              </span>
              <Link
                href="/guide#local-renderer"
                onClick={() => setDownloadModalOpen(false)}
                className="text-amber-400 hover:text-amber-300 font-bold underline"
              >
                상세 캡처 매뉴얼 보기 ➔
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
