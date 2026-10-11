import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 유튜브 썸네일 프로 PRO | SEO Thumbnail Pro",
  description: "유튜브 대본 기획안을 분석하여 A/B 테스트 전략 수립부터 고화질 16:9 썸네일 생성 및 피드백 수정까지 완성하는 전문가용 올인원 솔루션",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
