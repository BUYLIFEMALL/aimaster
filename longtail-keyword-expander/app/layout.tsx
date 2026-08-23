import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "롱테일 키워드분석 자동화",
  description: "키워드를 입력하면 네이버(또는 구글) 검색결과를 분석해 관련·롱테일 키워드와 블로그 작업 지시를 정리해드립니다.",
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
