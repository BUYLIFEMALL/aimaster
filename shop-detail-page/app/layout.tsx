import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "상세페이지 자동화(15p)",
  description: "제품 이미지와 정보를 입력하면 AI가 커머스 상세페이지용 이미지를 섹션별로 자동 생성합니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased bg-gray-50 min-h-screen">
        {children}
      </body>
    </html>
  );
}
