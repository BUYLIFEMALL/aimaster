import type { Metadata } from "next";
import Link from "next/link";
import { KakaoScript } from "@/components/KakaoScript";
import { APP_VERSION } from "@/lib/version";
import { BookOpen } from "lucide-react";
import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://personality-code.buylife.xyz";
const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "https://buylife.xyz";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "성격코드 LAB - 나의 16가지 성격유형 정밀 테스트",
  description: "20문항 빠른 검사와 60문항 정식 검사로 알아보는 나의 성격코드. 결과를 친구와 공유해보세요.",
  openGraph: {
    title: "성격코드 LAB - 나의 성격유형 테스트",
    description: "20문항으로 알아보는 나의 성격코드",
    images: ["/api/og"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen flex flex-col bg-[#faf8f5] text-[#1c1917]">
        <KakaoScript />
        <header className="sticky top-0 z-40 bg-[#faf8f5]/90 backdrop-blur-md border-b border-[#e8e5df]">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Link href="/" className="flex items-center gap-2 font-black text-lg text-[#1c1917] hover:opacity-90 transition-opacity">
                <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-amber-500 flex items-center justify-center text-white text-base shadow-sm">
                  🔑
                </span>
                <span className="tracking-tight">성격코드 <span className="text-violet-600 font-extrabold">LAB</span></span>
              </Link>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-violet-100 text-violet-700 border border-violet-200">
                {APP_VERSION}
              </span>
            </div>

            <nav className="flex items-center gap-2.5 text-xs font-semibold">
              <Link
                href="/guide"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-violet-50 text-violet-700 border border-violet-200/80 hover:border-violet-300 transition-all shadow-xs"
              >
                <BookOpen className="w-3.5 h-3.5 text-violet-500" />
                <span>16성격 가이드북</span>
              </Link>
              <a
                href={`${MAIN_SITE_URL}/programs`}
                className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[#78716c] hover:text-[#1c1917] hover:bg-black/5 transition-colors"
              >
                <span>다른 프로그램</span>
                <span>→</span>
              </a>
            </nav>
          </div>
        </header>

        <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">
          {children}
        </main>

        <footer className="border-t border-[#e8e5df] bg-[#f5f2eb]/60 py-6 text-center text-xs text-[#a8a29e]">
          <div className="max-w-3xl mx-auto px-4 space-y-1.5">
            <p className="font-medium text-[#78716c]">
              AIMaster 성격코드 LAB · 16가지 성격유형 정밀 측정 플랫폼
            </p>
            <p className="text-[11px] text-[#a8a29e] leading-relaxed max-w-lg mx-auto">
              이 검사는 융(Jung) 심리유형론에서 널리 쓰이는 4개 이분지표 개념을 참고해 자체 제작한 성격유형 테스트로,
              공식 MBTI® 검사와는 무관한 재미용 콘텐츠입니다.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
