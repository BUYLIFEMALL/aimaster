import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 웹툰 자동화 | AIMaster",
  description:
    "AI와 함께 시놉시스부터 캐릭터 시트, 세로 스크롤 완성 원고까지 한 곳에서 완성하는 AI 웹툰 제작 자동화 솔루션",
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-[#0a0d14] text-slate-100 antialiased dark">
        {children}
      </body>
    </html>
  );
}
