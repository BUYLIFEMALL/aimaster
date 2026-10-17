import Link from "next/link";
import { ImageGuideView } from "@/components/ImageGuideView";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export const metadata = {
  title: "연동 & 사용 매뉴얼 | AI 이미지 스튜디오",
  description: "AI 이미지 스튜디오의 5단계 파이프라인과 프롬프트 골든 팁, 개인 API 키 연동 가이드",
};

export default function GuidePage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 selection:bg-amber-500/30">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-zinc-800/80 bg-[#09090b]/80 backdrop-blur-md px-4 sm:px-8 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-2.5 group">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-zinc-950 font-bold text-base shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform">
                🎨
              </span>
              <div>
                <span className="font-bold text-sm sm:text-base text-white tracking-tight">AI 이미지 스튜디오</span>
                <span className="hidden sm:inline-block ml-2 text-[11px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  매뉴얼북
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-zinc-950 hover:bg-amber-400 transition-all shadow-md shadow-amber-500/10"
            >
              <span>← 작업실 바로가기</span>
            </Link>
            <Link
              href="/login"
              className="hidden sm:inline-flex items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-xs font-medium text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors"
            >
              <span>로그인</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-8 md:py-12">
        <ImageGuideView />
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/80 bg-zinc-950 py-8 px-4 text-center text-xs text-zinc-500">
        <p className="max-w-md mx-auto">
          AI 이미지 스튜디오는 회원 본인의 개인 API 키로 격리 운영됩니다. 타인 및 운영자 키 공유를 엄격히 금지합니다.
        </p>
        <p className="mt-2 text-[11px] text-zinc-600">© AIMaster. All rights reserved.</p>
      </footer>
    </div>
  );
}
