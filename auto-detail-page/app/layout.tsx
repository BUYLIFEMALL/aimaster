import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 상세페이지 자동생성기",
  description: "제품 이미지와 정보를 입력하면 AI가 쿠팡/스마트스토어 스타일의 상세페이지를 자동으로 생성합니다.",
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
