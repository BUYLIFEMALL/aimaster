import type { Metadata } from "next";
import { KakaoScript } from "@/components/KakaoScript";
import { getSessionUser } from "@/lib/auth";
import { signOutAction } from "@/lib/actions/auth";
import "./globals.css";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mbti-character.vercel.app";
const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "https://buylife.xyz";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "캐릭코드(MBTI) - 나와 닮은 캐릭터 찾기",
  description: "20문항으로 알아보는 나의 성격유형, 그리고 나와 꼭 닮은 오리지널 캐릭터.",
  openGraph: {
    title: "캐릭코드(MBTI)",
    description: "20문항으로 알아보는 나와 닮은 캐릭터",
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
              🎭 캐릭코드
            </a>
            <div className="flex flex-col items-end gap-0.5">
              <a
                href={`${MAIN_SITE_URL}/programs`}
                className="text-xs text-neutral-400 hover:text-neutral-700"
              >
                다른 프로그램 보기 →
              </a>
              {user ? (
                <form action={signOutAction}>
                  <button type="submit" className="text-[11px] text-neutral-400 hover:text-neutral-700 underline">
                    {user.email} · 로그아웃
                  </button>
                </form>
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
