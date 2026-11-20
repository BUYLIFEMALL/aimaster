import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "무한루프 영상자동화 | AIMaster",
  description: "영상에서 가장 자연스럽게 이어지는 구간을 찾아 끝없이 반복되는 MP4·WebM·GIF로 만드는, 브라우저 안에서만 동작하는 도구",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-lv-bg text-lv-text">
        {children}
        {/* 💾 회원 저장공간 위젯(메인 사이트 공용) — docs/HANDOFF_20261111_STORAGE_WIDGET_ROLLOUT.md */}
        <Script src="https://www.buylife.xyz/storage-widget.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
