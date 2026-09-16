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
  title: "AI 타로 - 과거·현재·미래 3카드 리딩",
  description: "질문 하나를 떠올리고 카드 3장을 뽑아보세요. AI가 그린 카드 일러스트와 AI가 풀어주는 타로 해석을 바로 확인할 수 있어요.",
  openGraph: {
    title: "AI 타로",
    description: "과거·현재·미래 3카드 스프레드로 알아보는 오늘의 흐름",
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
          <header className="px-4 py-3 flex items-center justify-between max-w-xl mx-auto w-full">
            <a href="/" className="font-black text-lg text-neutral-900">
              🔮 AI 타로
            </a>
            <div className="flex flex-col items-end gap-0.5">
              <a
                href={`${MAIN_SITE_URL}/programs`}
                className="text-xs text-neutral-400 hover:text-neutral-700"
              >
                다른 프로그램 보기 →
              </a>
              {user ? (
                <div className="flex items-center gap-2">
                  <a href="/settings" className="text-[11px] text-neutral-400 hover:text-neutral-700 underline">
                    API키등록·플랫폼연동
                  </a>
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
