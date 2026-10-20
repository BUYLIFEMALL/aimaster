import type { Metadata } from "next";
import Link from "next/link";
import { KakaoScript } from "@/components/KakaoScript";
import { getSessionUser } from "@/lib/auth";
import { signOutAction } from "@/lib/actions/auth";
import { APP_VERSION } from "@/lib/version";
import "./globals.css";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mbti-character.buylife.xyz";
const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "https://buylife.xyz";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "캐릭코드(MBTI) - 나와 닮은 오리지널 캐릭터 찾기",
  description: "20문항으로 알아보는 나의 4차원 성격유형과 16대 오리지널 매칭 캐릭터 & AI 일러스트 생성 아틀리에.",
  openGraph: {
    title: "캐릭코드(MBTI) - 나와 닮은 캐릭터 아틀리에",
    description: "20문항으로 알아보는 나와 꼭 닮은 오리지널 캐릭터 매칭 & AI 일러스트",
    images: ["/api/og"],
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();

  return (
    <html lang="ko">
      <body className="min-h-screen bg-[#090614] text-slate-100">
        <KakaoScript />
        <div className="min-h-screen flex flex-col">
          {/* 상단 56px 반응형 아틀리에 헤더 */}
          <header className="sticky top-0 z-50 backdrop-blur-md bg-[#090614]/90 border-b border-[#2a1f4e] px-4 py-3">
            <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
              {/* 로고 & 버전 배지 & 매뉴얼 링크 */}
              <div className="flex items-center gap-3">
                <Link href="/" className="flex items-center gap-2 group">
                  <span className="text-2xl transition-transform group-hover:scale-110">🎭</span>
                  <span className="font-extrabold text-lg text-slate-100 tracking-tight group-hover:text-rose-300 transition-colors">
                    캐릭코드
                  </span>
                </Link>
                <span className="atelier-badge text-[11px] py-0.5 px-2">
                  {APP_VERSION}
                </span>

                {/* 독립 가이드북 메뉴 (DESIGN.md 9번 원칙 승격) */}
                <Link
                  href="/guide"
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-rose-300 bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 hover:text-rose-200 transition-all shadow-sm"
                >
                  <span>📖</span>
                  <span>연동 & 사용 매뉴얼</span>
                </Link>
              </div>

              {/* 우측 네비게이션 및 사용자 메뉴 */}
              <div className="flex items-center gap-2 sm:gap-4">
                {/* 모바일용 매뉴얼 버튼 */}
                <Link
                  href="/guide"
                  className="sm:hidden inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold text-rose-300 bg-rose-500/10 border border-rose-500/30"
                >
                  <span>📖</span>
                  <span>매뉴얼</span>
                </Link>

                <a
                  href={`${MAIN_SITE_URL}/programs`}
                  className="hidden md:inline-flex text-xs text-slate-400 hover:text-white transition-colors"
                >
                  다른 프로그램 →
                </a>

                {user ? (
                  <div className="flex items-center gap-2 text-xs">
                    <Link
                      href="/settings"
                      className="hidden sm:inline-flex text-slate-400 hover:text-rose-600 font-medium"
                    >
                      🔑 API키등록
                    </Link>
                    <form action={signOutAction} className="inline-block">
                      <button
                        type="submit"
                        className="px-2.5 py-1 rounded-lg text-[11px] font-medium text-slate-400 hover:text-white hover:bg-[#1c1536] transition-all"
                      >
                        로그아웃
                      </button>
                    </form>
                  </div>
                ) : (
                  <Link
                    href="/login"
                    className="px-3 py-1.5 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-500 transition-all shadow-sm"
                  >
                    로그인
                  </Link>
                )}
              </div>
            </div>
          </header>

          {/* 메인 콘텐츠 컨테이너 */}
          <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-6 md:py-10">
            {children}
          </main>

          {/* 푸터 */}
          <footer className="border-t border-[#2a1f4e] py-8 text-center text-xs text-slate-500 bg-[#120d24]">
            <div className="max-w-3xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-400">AIMaster 캐릭코드(MBTI)</span>
                <span className="text-neutral-300">|</span>
                <span>{APP_VERSION}</span>
              </div>
              <p className="text-[11px] text-slate-500">
                16대 오리지널 캐릭터는 자체 제작 저작물이며 공식 MBTI®와 무관한 창작물입니다.
              </p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
