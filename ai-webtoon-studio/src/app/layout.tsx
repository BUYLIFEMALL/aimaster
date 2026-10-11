import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 웹툰 스튜디오 PRO | AIMaster",
  description:
    "AI와 함께 시놉시스부터 캐릭터 시트, 세로 스크롤 완성 원고까지 한 곳에서 완성하는 AI 웹툰 제작 스튜디오",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
