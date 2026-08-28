import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Threads 쇼핑제휴 자동화",
  description: "상품 정보를 넣으면 쿠팡파트너스/알리익스프레스/네이버 브랜드커넥트 제휴 링크를 붙여 Threads 홍보 게시글을 자동으로 만들고 게시하는 마케팅 자동화 웹",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-neutral-50">{children}</body>
    </html>
  );
}
