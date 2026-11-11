import type { Metadata } from "next";
import "./globals.css";
import Script from "next/script";
import { PLATFORM_AIMASTER } from "@/lib/platform";

export const metadata: Metadata = {
  title: "AI 쇼핑몰 빌더",
  description: PLATFORM_AIMASTER ? "공급사 입점·등급별 구입가가 다른 B2B 쇼핑몰 빌더" : "회원마다 자기 쇼핑몰을 개설하는 B2B 쇼핑몰 빌더 (AIMaster_dev Lab)",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen antialiased">
        {children}
        {/* AIMaster 회원 저장공간 위젯(공통 규칙 2026-11-11) — 운영 배포에서만 */}
        {PLATFORM_AIMASTER && <Script src="https://www.buylife.xyz/storage-widget.js" strategy="afterInteractive" />}
      </body>
    </html>
  );
}
