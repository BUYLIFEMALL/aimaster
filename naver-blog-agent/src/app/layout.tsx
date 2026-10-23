import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "네이버 블로그 에이전트 | AIMaster",
  description: "크롬 확장과 멀티 AI 에이전트로 봇 탐지 없이 네이버 스마트에디터 ONE에 안전하게 자동 발행",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-neutral-50 text-neutral-900 antialiased">
        {children}
      </body>
    </html>
  );
}
