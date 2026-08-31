import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "상품소싱 자동화",
  description: "네이버 데이터랩·쇼핑검색 데이터를 기반으로 관심도는 오르는데 경쟁은 적은 소싱 기회를 자동으로 찾아드립니다.",
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
