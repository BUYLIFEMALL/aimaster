import type { Metadata } from "next";
import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mbti-rho-two.vercel.app";
const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "https://buylife.xyz";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "성격코드 - 나의 성격유형 테스트",
  description: "20문항으로 알아보는 나의 성격코드. 결과를 친구와 공유해보세요.",
  openGraph: {
    title: "성격코드",
    description: "20문항으로 알아보는 나의 성격코드",
    images: ["/api/og"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <div className="min-h-screen flex flex-col">
          <header className="px-4 py-3 flex items-center justify-between max-w-xl mx-auto w-full">
            <a href="/" className="font-black text-lg text-neutral-900">
              🔑 성격코드
            </a>
            <a
              href={`${MAIN_SITE_URL}/programs`}
              className="text-xs text-neutral-400 hover:text-neutral-700"
            >
              다른 프로그램 보기 →
            </a>
          </header>
          <main className="flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
