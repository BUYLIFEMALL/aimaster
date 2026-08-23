import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "경쟁사 키워드 분석 자동화",
  description: "키워드를 입력하면 구글/네이버 검색결과를 분석해 경쟁사와 콘텐츠 전략을 정리해드립니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased bg-gray-50 min-h-screen">{children}</body>
    </html>
  );
}
