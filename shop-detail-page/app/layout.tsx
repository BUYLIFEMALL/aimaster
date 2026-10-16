import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "상세페이지 자동화(15p) | AI 이커머스 셀러 스튜디오",
  description: "제품 사진 1장으로 Gemini AI가 분석하여 15단 이커머스 상세페이지를 섹션별로 자동 생성하고 긴 이미지로 병합합니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased bg-slate-50 min-h-screen text-slate-900">
        {children}
      </body>
    </html>
  );
}
