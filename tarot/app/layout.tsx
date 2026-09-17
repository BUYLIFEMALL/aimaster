import type { Metadata } from "next";
import { KakaoScript } from "@/components/KakaoScript";
import { getSessionUser } from "@/lib/auth";
import { signOutAction } from "@/lib/actions/auth";
import "./globals.css";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tarot.vercel.app";
const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "https://buylife.xyz";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "AI 타로 - 1카드/3카드/5카드 심층 타로 리딩",
  description: "질문 하나를 떠올리고 원하는 스프레드와 화풍을 선택해 카드를 뽑아보세요. AI가 그린 카드 일러스트와 AI 심층 타로 해석을 보관할 수 있어요.",
  openGraph: {
    title: "AI 타로",
    description: "스프레드와 화풍 선택으로 알아보는 나만의 맞춤 AI 타로 리딩",
    images: ["/api/og"],
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();

  return (
    <html lang="ko">
      <body>
        <KakaoScript />
        <div className="min-h-screen flex flex-col">
          <header className="px-4 py-3 flex items-center justify-between max-w-2xl mx-auto w-full border-b border-neutral-100">
            <div className="flex items-center gap-3">
              <a href="/" className="font-black text-lg text-neutral-900 flex items-center gap-1.5">
                🔮 AI 타로
              </a>
              {user && (
                <a
                  href="/history"
                  className="text-xs font-bold px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition-colors"
                >
                  📖 내 보관함
                </a>
              )}
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <a
                href={`${MAIN_SITE_URL}/programs`}
                className="text-xs text-neutral-400 hover:text-neutral-700"
              >
                다른 프로그램 보기 →
              </a>
              {user ? (
                <div className="flex items-center gap-2">
                  <form action={signOutAction}>
                    <button type="submit" className="text-[11px] text-neutral-400 hover:text-neutral-700 underline">
                      {user.email} · 로그아웃
                    </button>
                  </form>
                </div>
              ) : (
                <a href="/login" className="text-[11px] text-neutral-400 hover:text-neutral-700 underline">
                  로그인
                </a>
              )}
            </div>
          </header>
          <main className="flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
