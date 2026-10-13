import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 슬라이드 자동화 | AIMaster",
  description:
    "Gemini AI 기반 비정형 텍스트 프레젠테이션 자동화, C-Suite 대기업 임원 보고 장표, 22개 슬라이드 스키마, 원클릭 PPTX 다운로드 & Google Slides 연동",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased min-h-screen bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}
