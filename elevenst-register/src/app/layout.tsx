import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

const TITLE = "AI 11번가 상품 자동등록기 | AIMaster";
const DESC = "상세페이지에서 만든 상품을 11번가 공식 Seller API로 바로 등록하는 판매자용 자동 등록기";

export const metadata: Metadata = {
  metadataBase: new URL("https://elevenst-register.buylife.xyz"),
  title: TITLE,
  description: DESC,
  openGraph: { title: TITLE, description: DESC, url: "https://elevenst-register.buylife.xyz", siteName: "AIMaster", locale: "ko_KR", type: "website" },
  twitter: { card: "summary", title: TITLE, description: DESC },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-[var(--bg)] text-slate-900">
        {children}
        {/* 💾 회원 저장공간 위젯(메인 사이트 공용) — docs/HANDOFF_20261111_STORAGE_WIDGET_ROLLOUT.md */}
        <Script src="https://www.buylife.xyz/storage-widget.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
