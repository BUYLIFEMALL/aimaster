import type { Metadata } from "next";
import Script from "next/script";
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
  title: "상업용지·토지 실거래가 레이더 — AIMaster",
  description: "국토교통부 실시간 상가·건물·토지 실거래가 및 네이버 부동산 호가 변동 감시, 3대 AI 엔진 수익률 평가 및 급매 포착 레이더",
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
      <body className="min-h-full flex flex-col bg-mx-bg text-mx-text">
        {children}
        {/* 회원 저장공간 위젯 (2026-11-11 지시: 모든 프로그램 배포 시 공통 탑재) */}
        <Script src="https://www.buylife.xyz/storage-widget.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
