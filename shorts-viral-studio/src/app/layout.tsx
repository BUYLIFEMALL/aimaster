import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "쇼츠 떡상 분석·대본 자동화 | AIMaster",
  description: "유튜브 떡상 쇼츠 검색부터 분석, 소재 발굴, 대본·프롬프트 생성까지 한 번에",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="antialiased min-h-screen bg-neutral-50/60 text-neutral-900">
        {children}
        {/* 💾 회원 저장공간 위젯(메인 사이트 공용) — docs/HANDOFF_20261111_STORAGE_WIDGET_ROLLOUT.md */}
        <Script src="https://www.buylife.xyz/storage-widget.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
