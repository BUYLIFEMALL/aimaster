import type { Metadata } from "next";
import "./globals.css";
import { APP_NAME, APP_VERSION } from "@/lib/version";

export const metadata: Metadata = {
  title: `${APP_NAME} (${APP_VERSION}) - AIMaster`,
  description: "쿠팡 12단 및 스마트스토어 9단 규격 자동 최적화, 1초 스펙 자동검색, Nano Banana AI 멀티모달 상세페이지 일괄 완성 스튜디오",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-neutral-50 text-neutral-900 antialiased">
        {children}
      </body>
    </html>
  );
}
